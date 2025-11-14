/**
 * MetaAPI Real-Time Streaming Service V2
 * Uses MetaAPI SDK Streaming API with event listeners (no polling, no CPU credits consumed)
 * Detects new MT5 positions and tracks them in real-time
 * Works server-side in Next.js API routes using MetaAPI SDK
 */

import { getMT5Settings } from './mt5SettingsService'
import { createSignalFromMT5Position, updateSignalForClosedPosition, getSignalMappingByPosition } from './mt5SignalService'
import { db } from './firebaseConfig'
import { collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { addStreamingLog } from './streamingLogService'
import { editTelegramMessage, getTelegramSettings, sendToTelegramAPI } from './telegramService'
import { formatOpenTradeMessage, formatTradeUpdateMessage, formatTradeClosedMessage } from './telegramTradeFormatter'
import { saveTelegramMapping, getTelegramMapping, deleteTelegramMapping } from './tradeTelegramMappingService'
import { connectionManager } from './streamingConnectionManager'

// Feature Flags for gradual rollout
const FEATURE_FLAGS = {
  TELEGRAM_ENABLED: false,        // DISABLED - Focus on data accuracy first
  SIGNAL_CREATION: true,          // Keep for position tracking
  TRADE_ARCHIVING: true,          // Archive closed trades
  TP_SL_LOGGING: true             // Log TP/SL changes for debugging
}

// Singleton pattern to maintain single streaming connection
let streamingConnection: any = null
let metaApiConnection: any = null
let isStreaming = false

interface StreamingStatus {
  isConnected: boolean
  accountId?: string
  lastEvent?: Date
  error?: string
  reconnects?: number
  active?: boolean
}

// Track seen positions for SL/TP change detection
const positionStates = new Map<string, any>()

/**
 * Custom synchronization listener for position events
 */
class PositionListener {
  private accountId: string

  constructor(accountId: string) {
    this.accountId = accountId
  }

  async onPositionUpdated(instanceIndex: string, position: any): Promise<void> {
    const positionId = (position.ticket || position.id || position.positionId || '').toString()
    
    if (!positionId || !isStreaming) return

    console.log(`📊 Position updated: ${positionId}`)

    const previousState = positionStates.get(positionId)

    // Check for SL/TP changes
    if (previousState) {
      const slChanged = (previousState.stopLoss || null) !== (position.stopLoss || null)
      const tpChanged = (previousState.takeProfit || null) !== (position.takeProfit || null)

      if (slChanged || tpChanged) {
        console.log(`🔄 SL/TP CHANGE DETECTED for position ${positionId}`)
        console.log(`   Old SL: ${previousState.stopLoss} → New SL: ${position.stopLoss}`)
        console.log(`   Old TP: ${previousState.takeProfit} → New TP: ${position.takeProfit}`)

        // LOG TP/SL CHANGE FIRST (before Telegram update)
        try {
          await addStreamingLog({
            type: 'position_tp_sl_changed',
            message: `TP/SL changed for ${position.symbol} position ${positionId}`,
            positionId,
            accountId: this.accountId,
            success: true,
            details: {
              symbol: position.symbol,
              type: position.type,
              slChanged,
              tpChanged,
              oldSL: previousState.stopLoss,
              newSL: position.stopLoss,
              oldTP: previousState.takeProfit,
              newTP: position.takeProfit,
              currentPrice: position.currentPrice,
              profit: position.profit,
              timestamp: new Date().toISOString()
            }
          })
          console.log(`✅ TP/SL change logged for position ${positionId}`)
        } catch (logError) {
          console.error('❌ Error logging TP/SL change:', logError)
          // Continue even if logging fails
        }

        // Update position state
        positionStates.set(positionId, {
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          currentPrice: position.currentPrice
        })

        // Edit Telegram message (DISABLED - Feature flag)
        if (FEATURE_FLAGS.TELEGRAM_ENABLED) {
          try {
            const telegramMapping = await getTelegramMapping(positionId)

            if (telegramMapping) {
              console.log(`✅ Found Telegram mapping for position ${positionId}: messageId=${telegramMapping.telegramMessageId}`)

              const telegramSettings = await getTelegramSettings()
              if (telegramSettings?.botToken) {
                console.log(`📝 Editing Telegram message ${telegramMapping.telegramMessageId} in chat ${telegramMapping.telegramChatId}`)

                const message = await formatTradeUpdateMessage(
                  position,
                  previousState.stopLoss,
                  previousState.takeProfit
                )

                await editTelegramMessage(
                  telegramMapping.telegramChatId,
                  telegramMapping.telegramMessageId,
                  message,
                  telegramSettings.botToken
                )

                console.log(`📱 Telegram message updated for position ${positionId}`)

                await addStreamingLog({
                  type: 'telegram_updated',
                  message: `Telegram message edited for position ${positionId}`,
                  positionId,
                  accountId: this.accountId,
                  success: true,
                  details: {
                    telegramMessageId: telegramMapping.telegramMessageId,
                    telegramChatId: telegramMapping.telegramChatId
                  }
                })
              }
            } else {
              console.log(`⚠️ No Telegram mapping found for position ${positionId} - skipping Telegram update`)
            }
          } catch (telegramError) {
            console.error('❌ Error updating Telegram message:', telegramError)
            await addStreamingLog({
              type: 'telegram_failed',
              message: `Failed to update Telegram for position ${positionId}`,
              positionId,
              accountId: this.accountId,
              success: false,
              error: telegramError instanceof Error ? telegramError.message : 'Unknown error'
            })
          }
        } else {
          console.log(`ℹ️ Telegram updates disabled (feature flag) - TP/SL change logged only`)
        }
      }
    }

    // Update position state
    positionStates.set(positionId, {
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
      currentPrice: position.currentPrice
    })
  }

  async onPositionsUpdated(instanceIndex: string, positions: any[], removedPositionIds: string[]): Promise<void> {
    if (!isStreaming) return

    console.log(`📊 Positions updated: ${positions.length} positions, ${removedPositionIds.length} closed`)

    // Handle new positions
    for (const position of positions) {
      const positionId = (position.ticket || position.id || position.positionId || '').toString()

      if (!positionId) continue

      // Check if this is a new position
      if (!positionStates.has(positionId)) {
        console.log(`🎯 NEW POSITION DETECTED: ${positionId}`)
        console.log(`   Symbol: ${position.symbol}, Type: ${position.type}, Volume: ${position.volume}`)
        console.log(`   Entry: ${position.openPrice}, Current: ${position.currentPrice}, Profit: $${position.profit}`)

        // Send Telegram notification for new MT5 position (DISABLED - Feature flag)
        if (FEATURE_FLAGS.TELEGRAM_ENABLED) {
          try {
            const telegramSettings = await getTelegramSettings()
            if (telegramSettings?.enableChannel && telegramSettings?.channelId && telegramSettings?.botToken) {
              const message = await formatOpenTradeMessage(position)
              const messageId = await sendToTelegramAPI(
                message,
                'channel',
                telegramSettings.channelId,
                telegramSettings.botToken
              )

              if (messageId) {
                await saveTelegramMapping(positionId, parseInt(messageId), telegramSettings.channelId)
                console.log(`📱 Telegram notification sent for position ${positionId}`)

                await addStreamingLog({
                  type: 'telegram_sent',
                  message: `Telegram notification sent for position ${positionId}`,
                  positionId,
                  accountId: this.accountId,
                  success: true,
                  details: {
                    telegramMessageId: messageId
                  }
                })
              }
            }
          } catch (telegramError) {
            console.error('❌ Error sending Telegram notification:', telegramError)
          }
        } else {
          console.log(`ℹ️ Telegram disabled (feature flag) - position detected and logged only`)
        }

        // Create signal from new position (for tracking)
        if (FEATURE_FLAGS.SIGNAL_CREATION) {
          try {
            const result = await createSignalFromMT5Position(position, 'vip', 'system', 'MT5 Auto Signal')
            console.log(`✅ Signal created for tracking position ${positionId}`)

            await addStreamingLog({
              type: 'signal_created',
              message: `Signal created for position ${positionId}`,
              positionId,
              signalId: result.signalId,
              accountId: this.accountId,
              success: true,
              details: {
                alreadyExists: result.alreadyExists,
                pair: result.signal.pair,
                type: result.signal.type
              }
            })
          } catch (signalError: any) {
            console.error('❌ Error creating signal:', signalError)
            
            // Check for Firestore quota exceeded error
            const isQuotaError = 
              signalError?.code === 'resource-exhausted' ||
              signalError?.message?.includes('RESOURCE_EXHAUSTED') ||
              signalError?.message?.includes('Quota exceeded')
            
            if (isQuotaError) {
              console.error('🚫 Firestore quota exceeded - skipping signal creation and logging')
              // Don't log quota errors to Firestore (to avoid using more quota)
              // Just log to console for monitoring
              return // Exit early to avoid more Firestore operations
            }

            // Only log non-quota errors to Firestore
            try {
              await addStreamingLog({
                type: 'error',
                message: `Error creating signal for position ${positionId}`,
                positionId,
                accountId: this.accountId,
                success: false,
                error: signalError instanceof Error ? signalError.message : 'Unknown error',
                details: {
                  error: signalError?.code || signalError?.message || 'Unknown error'
                }
              })
            } catch (logError: any) {
              // If logging also fails (e.g., quota exceeded), just skip
              if (logError?.code !== 'resource-exhausted' && 
                  !logError?.message?.includes('RESOURCE_EXHAUSTED') &&
                  !logError?.message?.includes('Quota exceeded')) {
                console.error('❌ Could not log error to Firestore:', logError)
              }
            }
          }
        }
      }

      // Store position state for SL/TP change detection
      positionStates.set(positionId, {
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        currentPrice: position.currentPrice
      })
    }

    // Handle closed positions
    for (const positionId of removedPositionIds) {
      console.log(`🔒 [CLOSE DETECTED] Position closed: ${positionId}`)
      console.log(`📊 [CLOSE DETECTED] Total closed positions in this batch: ${removedPositionIds.length}`)
      console.log(`🗺️ [CLOSE DETECTED] Position existed in tracking: ${positionStates.has(positionId)}`)

      positionStates.delete(positionId)

      // Log position closure
      await addStreamingLog({
        type: 'position_closed',
        message: `Position closed: ${positionId}`,
        positionId,
        accountId: this.accountId,
        success: true
      })
      
      console.log(`✅ [CLOSE DETECTED] Position closure logged to streaming-logs`)

      // Archive closed trade to history (NEW)
      if (FEATURE_FLAGS.TRADE_ARCHIVING) {
        try {
          console.log(`📦 [ARCHIVE] Attempting to archive closed trade: ${positionId}`)
          const { archiveClosedTrade } = await import('./mt5TradeHistoryService')
          const mapping = await getSignalMappingByPosition(positionId)
          
          console.log(`📋 [ARCHIVE] Signal mapping retrieved:`, {
            hasMapping: !!mapping,
            hasSignalId: !!mapping?.signalId,
            lastKnownProfit: mapping?.lastKnownProfit,
            signalId: mapping?.signalId
          })

          // Get position data from mapping - note: mapping only has signalId, not full signal
          // For now, we'll create a minimal signal object from mapping data
          if (mapping?.signalId && mapping.pair) {
            // Create minimal signal object from mapping data (we don't have position object in removedPositionIds loop)
            const signal = {
              id: mapping.signalId,
              pair: mapping.pair,
              type: 'BUY' as const, // Default - we don't have position type here
              entryPrice: 0, // We don't have this data in mapping
              stopLoss: 0,
              takeProfit1: 0,
              status: 'close_now' as const,
              title: `Trade ${mapping.pair}`,
              description: `Trade from position ${positionId}`,
              category: 'vip' as const,
              postedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'system',
              createdByName: 'System',
              isActive: false
            } as any
            
            console.log(`✅ [ARCHIVE] Archiving trade with data:`, {
              positionId,
              symbol: mapping.pair,
              profit: mapping.lastKnownProfit,
              price: 0
            })
            
            const archiveId = await archiveClosedTrade({
              positionId,
              signal,
              finalProfit: mapping.lastKnownProfit || 0,
              finalPrice: 0, // We don't have close price in mapping
              accountId: this.accountId
            })
            console.log(`✅ [ARCHIVE] Trade archived to history with ID: ${archiveId}`)
            console.log(`📍 [ARCHIVE] Check Trade History page to see it!`)
          } else {
            console.error(`❌ [ARCHIVE] Cannot archive: No signal mapping found for position ${positionId}`)
            console.error(`   [ARCHIVE] Mapping object:`, mapping)
            console.error(`   [ARCHIVE] This means the position was never tracked by the system`)
          }
        } catch (archiveError) {
          console.error('❌ [ARCHIVE] Error archiving closed trade:', archiveError)
          console.error('   [ARCHIVE] Error details:', {
            name: archiveError instanceof Error ? archiveError.name : 'Unknown',
            message: archiveError instanceof Error ? archiveError.message : String(archiveError),
            stack: archiveError instanceof Error ? archiveError.stack : undefined
          })
        }
      }

      // Update Telegram message for closed trade (DISABLED - Feature flag)
      if (FEATURE_FLAGS.TELEGRAM_ENABLED) {
        try {
          const telegramMapping = await getTelegramMapping(positionId)
          if (telegramMapping) {
            console.log(`📱 Updating Telegram for closed position ${positionId}`)

            const telegramSettings = await getTelegramSettings()
            if (telegramSettings?.botToken) {
              const { getSignalMappingByPosition } = await import('./mt5SignalService')
              const mapping = await getSignalMappingByPosition(positionId)

              // We don't have position object in removedPositionIds loop, use mapping data
              const closedPosition = {
                symbol: mapping?.pair || 'Unknown',
                type: 'Unknown',
                volume: 0,
                profit: mapping?.lastKnownProfit || 0,
                openPrice: 0,
                currentPrice: 0,
                stopLoss: undefined,
                takeProfit: undefined
              }

              const message = await formatTradeClosedMessage(closedPosition)

              await editTelegramMessage(
                telegramMapping.telegramChatId,
                telegramMapping.telegramMessageId,
                message,
                telegramSettings.botToken
              )

              console.log(`✅ Telegram message updated for closed position ${positionId}`)

              await addStreamingLog({
                type: 'telegram_updated',
                message: `Telegram message updated for closed position ${positionId}`,
                positionId,
                accountId: this.accountId,
                success: true
              })

              await deleteTelegramMapping(positionId)
              console.log(`🗑️ Deleted Telegram mapping for closed position ${positionId}`)
            }
          }
        } catch (telegramError) {
          console.error('❌ Error updating Telegram message for closed position:', telegramError)
        }
      } else {
        console.log(`ℹ️ Telegram disabled (feature flag) - position closed and archived only`)
      }

      // Update signal
      try {
        const mapping = await getSignalMappingByPosition(positionId)

        if (mapping && mapping.signalId) {
          console.log(`📊 Found signal mapping for closed position ${positionId}: signal ${mapping.signalId}`)

          const profit = mapping.lastKnownProfit || 0

          const updated = await updateSignalForClosedPosition(mapping.signalId, positionId, profit, undefined)

          if (updated) {
            console.log(`✅ Signal ${mapping.signalId} updated for closed position ${positionId}`)

            await addStreamingLog({
              type: 'signal_updated',
              message: `Signal updated for closed position: ${positionId}`,
              positionId,
              signalId: mapping.signalId,
              accountId: this.accountId,
              success: true,
              details: {
                profit: profit
              }
            })
          }
        }
      } catch (mappingError) {
        console.error(`❌ Error handling closed position ${positionId}:`, mappingError)
      }
    }
  }

  async onConnected(instanceIndex: string, replicas: number): Promise<void> {
    console.log(`✅ Connected to MetaTrader terminal (instance ${instanceIndex}, ${replicas} replicas)`)
  }

  async onDisconnected(instanceIndex: string): Promise<void> {
    console.log(`⚠️ Disconnected from MetaTrader terminal (instance ${instanceIndex})`)
  }

  async onSynchronized(instanceIndex: string, synchronizationId: string): Promise<void> {
    console.log(`✅ Synchronized with MetaTrader terminal (instance ${instanceIndex})`)
  }
}

/**
 * Initialize MetaAPI streaming connection using SDK Streaming API
 */
export async function initializeStreaming(): Promise<{ success: boolean; error?: string }> {
  try {
    // Don't create duplicate connections
    if (isStreaming && streamingConnection) {
      console.log('⚠️ Streaming already active')
      return { success: true }
    }

    console.log('🚀 Initializing MetaAPI real-time streaming with SDK Streaming API...')

    // Get MT5 settings
    const mt5Settings = await getMT5Settings()

    if (!mt5Settings || !mt5Settings.enabled) {
      console.log('⚠️ MT5 streaming disabled in settings')
      return { success: false, error: 'MT5 streaming is disabled' }
    }

    if (!mt5Settings.accountId || !mt5Settings.token) {
      console.error('❌ MT5 settings incomplete for streaming')
      return { success: false, error: 'MT5 settings incomplete' }
    }

    const accountId = mt5Settings.accountId
    const token = mt5Settings.token || process.env.METAAPI_TOKEN

    if (!token) {
      throw new Error('METAAPI_TOKEN not configured')
    }

    console.log('📡 Setting up MetaAPI streaming for account:', accountId)

    // Import serverless-safe MetaAPI configuration helper FIRST
    // This sets METAAPI_STORAGE_PATH before SDK loads
    const { createMetaApiInstanceSafely } = await import('./metaapiConfig')
    
    // Ensure environment variable is set before SDK import
    // MetaAPI SDK checks this during module initialization
    if (typeof window === 'undefined' && !process.env.METAAPI_STORAGE_PATH) {
      const isServerless = 
        process.env.VERCEL || 
        process.env.VERCEL_ENV || 
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.FUNCTION_TARGET ||
        process.env.K_SERVICE ||
        process.env.FUNCTIONS_WORKER_RUNTIME
      
      if (isServerless) {
        process.env.METAAPI_STORAGE_PATH = '/tmp/.metaapi'
        console.log('🔧 Set METAAPI_STORAGE_PATH=/tmp/.metaapi for serverless')
      }
    }

    // Lazy load MetaAPI SDK AFTER config helper has set environment variables
    let MetaApiModule
    let MetaApi
    let SynchronizationListener
    
    try {
      MetaApiModule = await import('metaapi.cloud-sdk')
      MetaApi = MetaApiModule.default
      SynchronizationListener = MetaApiModule.SynchronizationListener
      console.log('✅ MetaAPI SDK loaded')
    } catch (importError: any) {
      console.error('❌ Failed to import MetaAPI SDK:', importError)
      // Check if it's a directory creation error
      if (importError.message?.includes('ENOENT') || importError.message?.includes('mkdir')) {
        throw new Error(`MetaAPI SDK initialization failed: ${importError.message}. Ensure METAAPI_STORAGE_PATH is set to /tmp/.metaapi in serverless environments.`)
      }
      throw importError
    }

    // Create MetaAPI instance with serverless-compatible storage path
    const api = await createMetaApiInstanceSafely(MetaApi, token, {
      application: 'redemptionfx-streaming'
    })

    // Get account
    const account = await api.metatraderAccountApi.getAccount(accountId)

    console.log('✅ Account retrieved')

    // Deploy account if needed
    if (account.state !== 'DEPLOYED') {
      console.log('📤 Deploying account...')
      await account.deploy()
      console.log('✅ Account deployed')
    }

    // Wait for connection
    if (account.connectionStatus !== 'CONNECTED') {
      console.log('⏳ Waiting for broker connection...')
      await account.waitConnected()
      console.log('✅ Broker connected')
    }

    // Create streaming connection
    const connection = account.getStreamingConnection()
    console.log('✅ Streaming connection created')

    // Create position listener
    const positionListener = new PositionListener(accountId)

    // Create synchronization listener wrapper
    class CustomSynchronizationListener extends SynchronizationListener {
      async onPositionUpdated(instanceIndex: string, position: any): Promise<void> {
        return positionListener.onPositionUpdated(instanceIndex, position)
      }

      async onPositionsUpdated(instanceIndex: string, positions: any[], removedPositionIds: string[]): Promise<void> {
        return positionListener.onPositionsUpdated(instanceIndex, positions, removedPositionIds)
      }

      async onConnected(instanceIndex: string, replicas: number): Promise<void> {
        return positionListener.onConnected(instanceIndex, replicas)
      }

      async onDisconnected(instanceIndex: string): Promise<void> {
        return positionListener.onDisconnected(instanceIndex)
      }

      async onPositionsSynchronized(instanceIndex: string, synchronizationId: string): Promise<void> {
        return positionListener.onSynchronized(instanceIndex, synchronizationId)
      }
    }

    const listener = new CustomSynchronizationListener()

    // Add listener
    connection.addSynchronizationListener(listener)
    console.log('✅ Position listener added')

    // Connect
    await connection.connect()
    console.log('✅ Connection opened')

    // Wait for synchronization
    console.log('⏳ Waiting for synchronization...')
    await connection.waitSynchronized()
    console.log('✅ Synchronized with terminal state')

    // Store connection
    metaApiConnection = connection
    streamingConnection = {
      accountId,
      token,
      regionUrl: mt5Settings.regionUrl,
      connection,
      listener,
      stop: async () => {
        isStreaming = false
        if (connection) {
          await connection.close()
        }
        console.log('🛑 Streaming stopped')
      }
    }

    isStreaming = true

    // Mark connection as successful in connection manager
    connectionManager.onSuccess()

    // Log streaming start
    await addStreamingLog({
      type: 'streaming_started',
      message: `Streaming started for account ${accountId} using SDK Streaming API`,
      success: true,
      accountId,
      details: {
        regionUrl: mt5Settings.regionUrl,
        method: 'SDK Streaming API',
        health: connectionManager.getHealth()
      }
    })

    // Update streaming status
    await updateStreamingStatus({
      isConnected: true,
      accountId,
      lastEvent: new Date(),
      active: true
    })

    console.log('✅ Real-time streaming active using MetaAPI SDK Streaming API (no CPU credits consumed)')
    console.log('📊 Connection health:', connectionManager.getHealth())

    return { success: true }

  } catch (error) {
    console.error('❌ Error initializing streaming:', error)
    isStreaming = false
    streamingConnection = null

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Record failure in connection manager
    connectionManager.onFailure(error instanceof Error ? error : new Error(errorMessage))

    await addStreamingLog({
      type: 'error',
      message: `Error initializing streaming: ${errorMessage}`,
      success: false,
      error: errorMessage,
      details: { 
        error, 
        health: connectionManager.getHealth(),
        reconnectionStrategy: connectionManager.getReconnectionStrategy()
      }
    })

    await updateStreamingStatus({
      isConnected: false,
      error: errorMessage,
      reconnects: connectionManager.getState().reconnectAttempts,
      active: false
    })

    // Schedule reconnection with exponential backoff
    const strategy = connectionManager.getReconnectionStrategy()
    if (!strategy.isCircuitOpen) {
      console.log(`🔄 [RECONNECT] Scheduling automatic reconnect in ${Math.round(strategy.nextDelay / 1000)}s`)
      await connectionManager.scheduleReconnect(async () => {
        console.log('🔄 [RECONNECT] Attempting to reinitialize streaming...')
        await initializeStreaming()
      })
    } else {
      console.error('⚠️ [CIRCUIT_BREAKER] Too many failures - manual intervention required')
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Stop streaming connection
 */
export async function stopStreaming(): Promise<void> {
  const accountId = streamingConnection?.accountId

  console.log('🛑 Stopping streaming...', {
    hasConnection: !!streamingConnection,
    isStreaming
  })

  isStreaming = false

  if (streamingConnection?.connection) {
    try {
      await streamingConnection.connection.close()
      console.log('✅ Connection closed')
    } catch (closeError) {
      console.error('⚠️ Error closing connection:', closeError)
    }
  }

  streamingConnection = null
  metaApiConnection = null
  positionStates.clear()

  // Reset connection manager
  connectionManager.reset()

  // Log streaming stop
  try {
    await addStreamingLog({
      type: 'streaming_stopped',
      message: `Streaming stopped for account ${accountId || 'unknown'}`,
      accountId,
      success: true
    })
  } catch (logError) {
    console.error('⚠️ Error logging streaming stop:', logError)
  }

  // Delete Firestore status document
  try {
    const q = query(collection(db, 'metaapi_streaming_status'))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const docRef = doc(db, 'metaapi_streaming_status', querySnapshot.docs[0].id)
      await deleteDoc(docRef)
      console.log('✅ Firestore status document deleted')
    }
  } catch (statusError) {
    console.error('⚠️ Error deleting streaming status:', statusError)
  }
}

/**
 * Get streaming status
 */
export async function getStreamingStatus(): Promise<StreamingStatus | null> {
  try {
    if (isStreaming && streamingConnection) {
      console.log('📊 Streaming status: ACTIVE')
      return {
        isConnected: true,
        accountId: streamingConnection.accountId,
        lastEvent: new Date()
      }
    }

    console.log('📊 Streaming status: INACTIVE')
    return {
      isConnected: false
    }
  } catch (error) {
    console.error('Error getting streaming status:', error)
    return {
      isConnected: false
    }
  }
}

/**
 * Update streaming status in Firestore
 */
async function updateStreamingStatus(status: StreamingStatus): Promise<void> {
  try {
    const q = query(collection(db, 'metaapi_streaming_status'))
    const querySnapshot = await getDocs(q)

    const statusData = {
      isConnected: status.isConnected,
      accountId: status.accountId,
      lastEvent: status.lastEvent ? Timestamp.fromDate(status.lastEvent) : null,
      error: status.error || null,
      reconnects: status.reconnects || 0,
      updatedAt: Timestamp.now(),
      active: status.active !== undefined ? status.active : true
    }

    if (querySnapshot.empty) {
      await addDoc(collection(db, 'metaapi_streaming_status'), {
        ...statusData,
        createdAt: Timestamp.now()
      })
    } else {
      const docRef = doc(db, 'metaapi_streaming_status', querySnapshot.docs[0].id)
      await updateDoc(docRef, statusData)
    }
  } catch (error) {
    console.error('❌ Error updating streaming status:', error)
  }
}

// Export singleton status
export { isStreaming, streamingConnection }

