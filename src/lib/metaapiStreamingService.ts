/**
 * MetaAPI Real-Time Streaming Service V2
 * Uses MetaAPI SDK Streaming API with event listeners (no polling, no CPU credits consumed)
 * Detects new MT5 positions and sends signals to Telegram instantly
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

// Singleton pattern to maintain single streaming connection
let streamingConnection: any = null
let metaApiConnection: any = null
let isStreaming = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 2  // Reduced from 5 to 2 to prevent subscription leaks
const RECONNECT_DELAY = 10000 // 10 seconds (increased from 5 for less aggressive reconnection)

// Prevent connection loss on Hot Module Reload (development only)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  // Store connection in global scope to survive HMR
  const globalForConnection = global as typeof globalThis & {
    __metaApiConnection?: any
    __streamingConnection?: any
    __isStreaming?: boolean
  }
  
  // Restore connection if it exists
  if (globalForConnection.__metaApiConnection) {
    metaApiConnection = globalForConnection.__metaApiConnection
    streamingConnection = globalForConnection.__streamingConnection
    isStreaming = globalForConnection.__isStreaming || false
    console.log('🔄 [HMR] Restored existing streaming connection from global scope')
  }
}

interface StreamingStatus {
  isConnected: boolean
  accountId?: string
  lastEvent?: Date
  error?: string
  reconnects?: number
  active?: boolean
}

// Track seen positions for SL/TP change detection and real position data
const positionStates = new Map<string, {
  stopLoss?: number
  takeProfit?: number
  currentPrice?: number
  profit?: number
  type?: string
  openTime?: Date
  openPrice?: number
  volume?: number
  symbol?: string
}>()

// Prevent concurrent processing of the same position (avoid race condition duplicates)
const processingPositions = new Set<string>()
// Track archived positions to prevent duplicates from multiple server replicas
const archivedPositions = new Set<string>()

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
    
    // ADD DIAGNOSTIC LOGGING
    console.log('🔔 [EVENT] onPositionUpdated fired! (single position change)', {
      instanceIndex,
      positionId,
      symbol: position.symbol,
      type: position.type,
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
      currentPrice: position.currentPrice,
      isStreaming
    })
    
    if (!positionId || !isStreaming) {
      console.log('⚠️ [EVENT] Skipping update - no position ID or streaming inactive')
      return
    }

    console.log(`📊 Position updated: ${positionId}`)

    const previousState = positionStates.get(positionId)

    // ADD TP/SL COMPARISON LOGGING
    console.log('🔍 [TP/SL-CHECK] Comparing TP/SL:', {
      positionId,
      hasPreviousState: !!previousState,
      previous: {
        stopLoss: previousState?.stopLoss,
        takeProfit: previousState?.takeProfit
      },
      current: {
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit
      }
    })

    // Check for SL/TP changes
    if (previousState) {
      const slChanged = (previousState.stopLoss || null) !== (position.stopLoss || null)
      const tpChanged = (previousState.takeProfit || null) !== (position.takeProfit || null)

      if (slChanged || tpChanged) {
        console.log('🔄 SL/TP CHANGE DETECTED!', {
          positionId,
          slChanged,
          tpChanged,
          oldSL: previousState.stopLoss,
          newSL: position.stopLoss,
          oldTP: previousState.takeProfit,
          newTP: position.takeProfit
        })
        console.log(`   Old SL: ${previousState.stopLoss} → New SL: ${position.stopLoss}`)
        console.log(`   Old TP: ${previousState.takeProfit} → New TP: ${position.takeProfit}`)

        // MERGE SL/TP updates with existing state (don't replace!)
        const updatedState = {
          ...previousState,  // Keep ALL existing data
          stopLoss: position.stopLoss,  // Update only SL
          takeProfit: position.takeProfit,  // Update only TP
          currentPrice: position.currentPrice  // Update current price
        }
        
        positionStates.set(positionId, updatedState)
        
        // LOG STATE INTEGRITY CHECK
        console.log(`✅ [STATE MERGE] Position state updated for ${positionId}:`, {
          hasType: !!updatedState.type,
          hasVolume: !!updatedState.volume,
          hasSymbol: !!updatedState.symbol,
          hasOpenTime: !!updatedState.openTime,
          hasSL: !!updatedState.stopLoss,
          hasTP: !!updatedState.takeProfit
        })

        // Edit Telegram message
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
                message: `Telegram message updated for position ${positionId}`,
                positionId,
                accountId: this.accountId,
                success: true,
                details: {
                  slChanged,
                  tpChanged,
                  telegramMessageId: telegramMapping.telegramMessageId
                }
              })
            }
          } else {
            console.log(`⚠️ No Telegram mapping found for position ${positionId} - skipping update`)
          }
        } catch (telegramError) {
          console.error('❌ Error updating Telegram message:', telegramError)
        }
      }
    }

    // Update position state with REAL position data
    const existingState = positionStates.get(positionId)
    const baseProfit = position.profit || position.profitMsc || 0
    const commission = position.commission || 0
    const swap = position.swap || 0
    const totalProfit = baseProfit + commission + swap
    
    positionStates.set(positionId, {
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
      currentPrice: position.currentPrice,
      profit: totalProfit, // Store total profit including commission and swap
      type: position.type || existingState?.type,
      openTime: existingState?.openTime || (position.time ? new Date(position.time) : new Date()),
      openPrice: existingState?.openPrice || position.openPrice || position.price,
      volume: position.volume || existingState?.volume || 0.1,
      symbol: position.symbol || existingState?.symbol
    })
  }

  async onPositionsUpdated(instanceIndex: string, positions: any[], removedPositionIds: string[]): Promise<void> {
    // ADD DIAGNOSTIC LOGGING
    console.log('🔔 [EVENT] onPositionsUpdated fired!', {
      instanceIndex,
      positionsCount: positions.length,
      removedCount: removedPositionIds.length,
      positions: positions.map(p => ({ id: p.id || p.ticket, symbol: p.symbol, type: p.type })),
      removed: removedPositionIds,
      isStreaming
    })
    
    if (!isStreaming) {
      console.log('⚠️ [EVENT] Streaming not active, ignoring position update')
      return
    }

    console.log(`📊 Positions updated: ${positions.length} positions, ${removedPositionIds.length} closed`)

    // Handle new positions
    for (const position of positions) {
      const positionId = (position.ticket || position.id || position.positionId || '').toString()

      // ADD DIAGNOSTIC LOGGING
      console.log(`🔍 [POSITION-LOOP] Processing position ${positionId}`, {
        symbol: position.symbol,
        type: position.type,
        isProcessing: processingPositions.has(positionId),
        hasState: positionStates.has(positionId)
      })

      if (!positionId) {
        console.log('⚠️ [POSITION-LOOP] Position has no ID, skipping')
        continue
      }

      // Check if this is a new position
      if (!positionStates.has(positionId)) {
        console.log(`🎯 NEW POSITION DETECTED: ${positionId}`)

        // Check if already being processed (prevent race condition duplicates)
        if (processingPositions.has(positionId)) {
          console.log(`⚠️ Position ${positionId} already being processed, skipping duplicate event`)
          continue
        }

        // Mark as processing
        processingPositions.add(positionId)

        try {
          // IMPORTANT: Check if signal already exists BEFORE sending Telegram
          // This prevents duplicate Telegram messages
          const result = await createSignalFromMT5Position(position, 'vip', 'system', 'MT5 Auto Signal')
          
          if (result.alreadyExists) {
            console.log(`⚠️ [ATOMIC] Signal already exists for position ${positionId}, skipping (concurrent event handled)`)
            // Don't log duplicates - reduces Firestore writes
          } else {
            // NEW signal created - now send Telegram
            console.log(`✅ [ATOMIC] New signal created for position ${positionId}`)

            // Only log actual creations, not duplicates (reduces quota usage)
            await addStreamingLog({
              type: 'signal_created',
              message: `Signal created for position ${positionId}`,
              positionId,
              signalId: result.signalId,
              accountId: this.accountId,
              success: true,
              details: {
                pair: result.signal.pair,
                type: result.signal.type
              }
            })

            // Send Telegram notification only for NEW signals
            try {
              // Send Telegram with atomic duplicate prevention
              const telegramSettings = await getTelegramSettings()
              
              // ADD DIAGNOSTIC LOGGING
              console.log('📱 [TELEGRAM] Telegram settings retrieved:', {
                hasSettings: !!telegramSettings,
                enableChannel: telegramSettings?.enableChannel,
                hasChannelId: !!telegramSettings?.channelId,
                hasBotToken: !!telegramSettings?.botToken
              })
              
              if (telegramSettings?.enableChannel && telegramSettings?.channelId && telegramSettings?.botToken) {
                const message = await formatOpenTradeMessage(position)
                const messageId = await sendToTelegramAPI(
                  message,
                  'channel',
                  telegramSettings.channelId,
                  telegramSettings.botToken
                )

                if (messageId) {
                  // Atomic save - prevents duplicate Telegram mappings
                  const telegramResult = await saveTelegramMapping(positionId, parseInt(messageId), telegramSettings.channelId)
                  
                  if (telegramResult.existed) {
                    console.log(`⚠️ [TELEGRAM-ATOMIC] Duplicate Telegram prevented for position ${positionId}`)
                    // Don't log - was a duplicate (reduces quota)
                  } else {
                    console.log(`📱 [TELEGRAM-ATOMIC] Notification sent for position ${positionId}`)

                    // Only log successful unique sends (reduces quota usage)
                    await addStreamingLog({
                      type: 'telegram_sent',
                      message: `Telegram sent for position ${positionId}`,
                      positionId,
                      accountId: this.accountId,
                      success: true,
                      details: {
                        telegramMessageId: messageId
                      }
                    })
                  }
                }
              } else {
                console.log('⚠️ [TELEGRAM] Telegram NOT configured or disabled:', {
                  enableChannel: telegramSettings?.enableChannel,
                  hasChannelId: !!telegramSettings?.channelId,
                  hasBotToken: !!telegramSettings?.botToken
                })
              }
            } catch (telegramError) {
              console.error('❌ Error sending Telegram notification:', telegramError)
            }
          }
        } catch (signalError) {
          console.error('❌ Error creating signal:', signalError)

          await addStreamingLog({
            type: 'error',
            message: `Error creating signal for position ${positionId}`,
            positionId,
            accountId: this.accountId,
            success: false,
            error: signalError instanceof Error ? signalError.message : 'Unknown error',
            details: {
              error: signalError
            }
          })
        } finally {
          // Remove from processing set
          processingPositions.delete(positionId)
        }
      } else {
        // EXISTING POSITION - Check for TP/SL changes BEFORE updating state
        const existingState = positionStates.get(positionId)
        
        if (existingState) {
        const slChanged = (existingState.stopLoss || null) !== (position.stopLoss || null)
        const tpChanged = (existingState.takeProfit || null) !== (position.takeProfit || null)
        
        if (slChanged || tpChanged) {
          console.log('🔄 [BULK-UPDATE] TP/SL CHANGE DETECTED!', {
            positionId,
            slChanged,
            tpChanged,
            oldSL: existingState.stopLoss,
            newSL: position.stopLoss,
            oldTP: existingState.takeProfit,
            newTP: position.takeProfit
          })
          
          // Send Telegram update for TP/SL change
          try {
            const telegramMapping = await getTelegramMapping(positionId)
            
            if (telegramMapping) {
              console.log(`✅ Found Telegram mapping for position ${positionId}: messageId=${telegramMapping.telegramMessageId}`)
              
              const telegramSettings = await getTelegramSettings()
              if (telegramSettings?.botToken) {
                console.log(`📝 Editing Telegram message ${telegramMapping.telegramMessageId} in chat ${telegramMapping.telegramChatId}`)
                
                // Classify the SL change for smart messaging
                const { classifySLChange } = await import('./telegramTradeFormatter')
                let slChangeInfo = null
                
                if (slChanged && existingState.stopLoss !== undefined && position.stopLoss !== undefined) {
                  slChangeInfo = classifySLChange(
                    position.type || existingState.type || 'BUY',
                    position.openPrice || 0,
                    position.currentPrice || 0,
                    existingState.stopLoss,
                    position.stopLoss,
                    position.symbol
                  )
                  
                  if (slChangeInfo) {
                    console.log(`🎯 SL Change Classified: ${slChangeInfo.type.toUpperCase()} - ${slChangeInfo.message}`)
                  }
                }
                
                const message = await formatTradeUpdateMessage(
                  position,
                  existingState.stopLoss,
                  existingState.takeProfit,
                  slChangeInfo || undefined
                )
                
                // ALWAYS edit the original message
                await editTelegramMessage(
                  telegramMapping.telegramChatId,
                  telegramMapping.telegramMessageId,
                  message,
                  telegramSettings.botToken
                )
                
                console.log(`📱 Telegram message updated for TP/SL change on position ${positionId}`)
                
                await addStreamingLog({
                  type: 'telegram_updated',
                  message: `Telegram message updated for TP/SL change on position ${positionId}`,
                  positionId,
                  accountId: this.accountId,
                  success: true
                })

                // OPTIONALLY send a new notification message (if enabled)
                if (telegramSettings.sendUpdateNotification) {
                  try {
                    const { sendReplyMessage, copyMessage } = await import('./telegramService')
                    const { addUpdateMessageId } = await import('./tradeTelegramMappingService')
                    
                    const prefix = telegramSettings.updateNotificationPrefix || '🔔 TP/SL Updated'
                    const style = telegramSettings.updateNotificationStyle || 'reply'
                    
                    let newMessageId: number | null = null
                    
                    if (style === 'reply') {
                      // Send as a reply to the original message
                      const replyText = `${prefix}\n\n${message}`
                      newMessageId = await sendReplyMessage(
                        telegramMapping.telegramChatId,
                        replyText,
                        telegramMapping.telegramMessageId,
                        telegramSettings.botToken
                      )
                      console.log(`📱 Sent reply notification for TP/SL update on position ${positionId}`)
                    } else if (style === 'copy') {
                      // Copy the original message
                      newMessageId = await copyMessage(
                        telegramMapping.telegramChatId,
                        telegramMapping.telegramChatId,
                        telegramMapping.telegramMessageId,
                        prefix,
                        telegramSettings.botToken
                      )
                      console.log(`📱 Sent copied notification for TP/SL update on position ${positionId}`)
                    }
                    
                    // Store the new message ID in the mapping
                    if (newMessageId) {
                      await addUpdateMessageId(positionId, newMessageId)
                      
                      await addStreamingLog({
                        type: 'telegram_notification',
                        message: `Sent ${style} notification for TP/SL change on position ${positionId}`,
                        positionId,
                        accountId: this.accountId,
                        success: true
                      })
                    }
                  } catch (notificationError) {
                    console.error('❌ Error sending TP/SL update notification:', notificationError)
                    await addStreamingLog({
                      type: 'telegram_notification',
                      message: `Failed to send update notification: ${notificationError}`,
                      positionId,
                      accountId: this.accountId,
                      success: false
                    })
                  }
                }
              }
            } else {
              console.log(`⚠️ No Telegram mapping found for position ${positionId} - can't update message`)
            }
          } catch (telegramError) {
            console.error('❌ Error updating Telegram for TP/SL change:', telegramError)
          }
        }
        }
      }
      
      // NOW update state AFTER TP/SL check (for all positions, new and existing)
      const existingState = positionStates.get(positionId)
      const baseProfit = position.profit || position.profitMsc || 0
      const commission = position.commission || 0
      const swap = position.swap || 0
      const totalProfit = baseProfit + commission + swap
      
      positionStates.set(positionId, {
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        currentPrice: position.currentPrice,
        profit: totalProfit, // Store total profit including commission and swap
        type: position.type || existingState?.type,
        openTime: existingState?.openTime || (position.time ? new Date(position.time) : new Date()),
        openPrice: existingState?.openPrice || position.openPrice || position.price,
        volume: position.volume || existingState?.volume || 0.1,
        symbol: position.symbol || existingState?.symbol
      })
    }

    // Handle closed positions
    for (const positionId of removedPositionIds) {
      console.log(`🔒 Position closed: ${positionId}`)

      // Check if we already processed this closure (prevent duplicates)
      if (!positionStates.has(positionId)) {
        console.log(`⏭️ Position ${positionId} already processed, skipping duplicate`)
        continue
      }

      // Get position state BEFORE deleting (for archiving - REAL MT5 data)
      const positionState = positionStates.get(positionId)
      const lastKnownPrice = positionState?.currentPrice || 0
      const lastKnownProfit = positionState?.profit || 0
      const positionOpenTime = positionState?.openTime || new Date()
      const positionOpenPrice = positionState?.openPrice
      const positionStopLoss = positionState?.stopLoss
      const positionTakeProfit = positionState?.takeProfit
      
      positionStates.delete(positionId)

      // Log position closure
      await addStreamingLog({
        type: 'position_closed',
        message: `Position closed: ${positionId}`,
        positionId,
        accountId: this.accountId,
        success: true
      })

      // Get actual close data from MT5 API (needed for both Telegram and Archive)
      const mt5Settings = await getMT5Settings()
      const closeData = await getClosedPositionData(
        positionId,
        this.accountId,
        mt5Settings.token || process.env.METAAPI_TOKEN || '',
        mt5Settings.regionUrl || 'https://mt-client-api-v1.london.agiliumtrade.ai'
      )
      
      if (!closeData) {
        console.log(`⚠️ No close data from MT5 API for position ${positionId}, using captured state`)
      }
      
      // Use close data if available, fallback to captured data
      const finalClosePrice = closeData?.closePrice || lastKnownPrice || 0
      const finalProfit = closeData ? 
        (closeData.closeProfit + closeData.commission + closeData.swap) : 
        (lastKnownProfit || 0)
      
      // Get type, symbol, volume from close data with fallback to position state
      let positionType = closeData?.type || positionState?.type || 'UNKNOWN'
      const positionSymbol = closeData?.symbol || positionState?.symbol || 'UNKNOWN'
      const positionVolume = closeData?.volume || positionState?.volume || 0.1
      
      // Normalize type to simple BUY/SELL format (handle both "BUY" and "POSITION_TYPE_BUY")
      if (positionType !== 'UNKNOWN') {
        if (positionType.toUpperCase().includes('BUY')) {
          positionType = 'POSITION_TYPE_BUY'
        } else if (positionType.toUpperCase().includes('SELL')) {
          positionType = 'POSITION_TYPE_SELL'
        }
      }

      // Update Telegram message for closed trade
      // NOTE: We do this BEFORE archiving to send notification quickly
      // But we calculate pips from REAL data, not from database query
      try {
        const telegramMapping = await getTelegramMapping(positionId)
        if (telegramMapping) {
          console.log(`📱 Updating Telegram for closed position ${positionId}`)

          const telegramSettings = await getTelegramSettings()
          if (telegramSettings?.botToken) {
            
            // Get the signal data to use as fallback for open price if needed
            const mapping = await getSignalMappingByPosition(positionId)
            let signalEntryPrice = 0
            
            if (mapping?.signalId) {
              const { doc, getDoc } = await import('firebase/firestore')
              const { db } = await import('./firebaseConfig')
              const signalDoc = await getDoc(doc(db, 'signals', mapping.signalId))
              if (signalDoc.exists()) {
                const signalData = signalDoc.data()
                signalEntryPrice = signalData?.entryPrice || 0
              }
            }
            
            // Use position open price if available, otherwise fall back to signal entry
            const effectiveOpenPrice = positionOpenPrice || signalEntryPrice || 0
            
            // Calculate pips from REAL data (don't query database!)
            const { calculatePipsFromPosition } = await import('./pipCalculator')
            
            // Normalize type for pips calculation
            const normalizedType = positionType.toUpperCase().includes('SELL') ? 'SELL' : 'BUY'
            
            const calculatedPips = calculatePipsFromPosition({
              symbol: positionSymbol,
              type: normalizedType,
              openPrice: effectiveOpenPrice,
              currentPrice: finalClosePrice
            })

            console.log(`✅ [TELEGRAM-CLOSE] Calculated from REAL close data:`, {
              symbol: positionSymbol,
              type: normalizedType,
              positionOpenPrice,
              signalEntryPrice,
              effectiveOpenPrice,
              closePrice: finalClosePrice,
              volume: positionVolume,
              pips: calculatedPips,
              profit: finalProfit,
              source: closeData ? 'MT5_API' : 'CAPTURED_STATE',
              usingPositionOpenPrice: !!positionOpenPrice
            })

            const closedPosition = {
              symbol: positionSymbol,
              type: positionType,
              volume: positionVolume,
              openPrice: effectiveOpenPrice,
              closePrice: finalClosePrice,
              currentPrice: finalClosePrice,
              pips: calculatedPips,
              profit: finalProfit,
              stopLoss: positionStopLoss,
              takeProfit: positionTakeProfit
            }

            console.log('📱 [TELEGRAM-CLOSE] Formatted close data for message:', closedPosition)

            const message = await formatTradeClosedMessage(closedPosition, finalClosePrice)

            // 1. ALWAYS edit the original message (silent update)
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

            // 2. OPTIONALLY send new close notification with GIF (push notification)
            if (telegramSettings.sendCloseNotification !== false) {
              try {
                console.log(`🔔 [CLOSE-NOTIFICATION] Starting close notification for ${positionId}`)
                console.log(`🔔 [CLOSE-NOTIFICATION] Using calculated pips: ${calculatedPips}, profit: ${finalProfit}`)
                
                const { sendGif } = await import('./telegramService')
                const { formatCloseNotification } = await import('./telegramTradeFormatter')
                
                // Send GIF first (if configured)
                let gifSent = false
                if (calculatedPips > 0 && telegramSettings.winGifUrl) {
                  console.log(`🎉 [CLOSE-NOTIFICATION] Sending WIN GIF for position ${positionId} (pips: ${calculatedPips})`)
                  gifSent = await sendGif(
                    telegramMapping.telegramChatId,
                    telegramSettings.winGifUrl,
                    telegramSettings.botToken
                  )
                  if (gifSent) {
                    console.log(`✅ [CLOSE-NOTIFICATION] WIN GIF sent successfully`)
                  }
                } else if (calculatedPips < 0 && telegramSettings.lossGifUrl) {
                  console.log(`😔 [CLOSE-NOTIFICATION] Sending LOSS GIF for position ${positionId} (pips: ${calculatedPips})`)
                  gifSent = await sendGif(
                    telegramMapping.telegramChatId,
                    telegramSettings.lossGifUrl,
                    telegramSettings.botToken
                  )
                  if (gifSent) {
                    console.log(`✅ [CLOSE-NOTIFICATION] LOSS GIF sent successfully`)
                  }
                }
                
                // Then send close notification message
                const closeNotification = await formatCloseNotification(closedPosition)
                
                console.log(`📱 [CLOSE-NOTIFICATION] Sending close message for ${positionId}`)
                
                const { sendToTelegramAPI } = await import('./telegramService')
                const messageId = await sendToTelegramAPI(
                  closeNotification,
                  'channel',
                  telegramMapping.telegramChatId,
                  telegramSettings.botToken
                )
                
                if (messageId) {
                  console.log(`✅ [CLOSE-NOTIFICATION] Close message sent successfully: messageId=${messageId}`)
                } else {
                  console.warn(`⚠️ [CLOSE-NOTIFICATION] Close message sent but no messageId returned`)
                }
                
                await addStreamingLog({
                  type: 'telegram_notification',
                  message: `Sent close notification for position ${positionId} (GIF: ${gifSent ? 'yes' : 'no'})`,
                  positionId,
                  accountId: this.accountId,
                  success: true
                })
              } catch (closeNotificationError) {
                console.error('❌ [CLOSE-NOTIFICATION] Error sending close notification:', closeNotificationError)
                await addStreamingLog({
                  type: 'telegram_notification',
                  message: `Failed to send close notification: ${closeNotificationError}`,
                  positionId,
                  accountId: this.accountId,
                  success: false
                })
              }
            } else {
              console.log(`⏭️ [CLOSE-NOTIFICATION] Close notifications disabled, skipping for ${positionId}`)
            }

            await deleteTelegramMapping(positionId)
            console.log(`🗑️ Deleted Telegram mapping for closed position ${positionId}`)
          }
        }
      } catch (telegramError) {
        console.error('❌ Error updating Telegram message for closed position:', telegramError)
      }

      // Archive closed trade to history (NEW!)
      try {
        // ATOMIC LOCK: Only one thread can archive this position (prevents race condition)
        const lockAcquired = await acquireArchiveLock(positionId)

        if (!lockAcquired) {
          console.log(`⏭️ [ARCHIVE] Position ${positionId} already being archived by another thread, skipping`)
          continue
        }

        console.log(`✅ [ARCHIVE] Lock acquired for position ${positionId}, proceeding with archiving...`)
        console.log(`📦 [ARCHIVE] Attempting to archive closed trade: ${positionId}`)
        const { archiveClosedTrade } = await import('./mt5TradeHistoryService')
        
        // Get actual close data from MT5 history API
        const mt5Settings = await getMT5Settings()
        const closeData = await getClosedPositionData(
          positionId,
          this.accountId,
          mt5Settings.token || process.env.METAAPI_TOKEN || '',
          mt5Settings.regionUrl || 'https://mt-client-api-v1.london.agiliumtrade.ai'
        )
        
        if (closeData) {
          console.log(`✅ [CLOSE DATA] Got actual close data from MT5 history:`, {
            closePrice: closeData.closePrice,
            closeProfit: closeData.closeProfit,
            commission: closeData.commission,
            swap: closeData.swap
          })
        }
        
        // Use close data if available, fallback to captured data
        const finalPrice = closeData?.closePrice || lastKnownPrice || 0
        const finalProfit = closeData ? 
          (closeData.closeProfit + closeData.commission + closeData.swap) : 
          (lastKnownProfit || 0)
        
        console.log(`💰 [ARCHIVE] Using final values:`, {
          finalPrice,
          finalProfit,
          commission: closeData?.commission || 0,
          swap: closeData?.swap || 0,
          source: closeData ? 'MT5_HISTORY_API' : 'CAPTURED_STATE'
        })
        
        const mapping = await getSignalMappingByPosition(positionId)
        
        console.log(`📋 [ARCHIVE] Signal mapping retrieved:`, {
          hasMapping: !!mapping,
          signalId: mapping?.signalId
        })
        
        if (mapping?.signalId) {
          // Fetch full signal from Firestore
          const { doc, getDoc } = await import('firebase/firestore')
          const { db } = await import('./firebaseConfig')
          const signalDoc = await getDoc(doc(db, 'signals', mapping.signalId))
          
          if (!signalDoc.exists()) {
            console.error(`❌ [ARCHIVE] Signal ${mapping.signalId} not found in Firestore`)
            continue // Skip to next position
          }
          
          const signalData = signalDoc.data() as any
          console.log(`✅ [ARCHIVE] Signal fetched from Firestore:`, {
            signalId: mapping.signalId,
            pair: signalData.pair,
            type: signalData.type,
            entryPrice: signalData.entryPrice
          })
          
          console.log(`✅ [ARCHIVE] Archiving trade with REAL MT5 data:`, {
            positionId,
            symbol: positionSymbol,
            type: positionType,
            profit: finalProfit,
            openPrice: positionOpenPrice,
            closePrice: finalPrice,
            openTime: positionOpenTime,
            volume: positionVolume,
            stopLoss: positionStopLoss,
            takeProfit: positionTakeProfit,
            commission: closeData?.commission || 0,
            swap: closeData?.swap || 0
          })
          
          const archiveId = await archiveClosedTrade({
            positionId,
            signal: signalData,
            finalProfit: finalProfit,
            finalPrice: finalPrice,
            accountId: this.accountId,
            realPositionData: {
              type: positionType,
              openTime: positionOpenTime,
              openPrice: positionOpenPrice,  // ← NOW PASSING REAL OPEN PRICE
              volume: positionVolume,
              symbol: positionSymbol,
              stopLoss: positionStopLoss,
              takeProfit: positionTakeProfit,
              commission: closeData?.commission,
              swap: closeData?.swap
            }
          })
          
          // Mark as archived to prevent duplicates
          archivedPositions.add(positionId)
          
          console.log(`✅ [ARCHIVE] Trade archived to history with ID: ${archiveId}`)
          console.log(`🎉 [ARCHIVE] Go to Trade History page to see it!`)
        } else {
          console.error(`❌ [ARCHIVE] Cannot archive: No signal mapping found for position ${positionId}`)
        }
      } catch (archiveError) {
        console.error('❌ [ARCHIVE] Error archiving closed trade:', archiveError)
        console.error('❌ [ARCHIVE] Error stack:', archiveError instanceof Error ? archiveError.stack : 'No stack trace')
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
    // Check if existing connection is healthy
    if (isStreaming && streamingConnection && metaApiConnection) {
      const healthy = await isConnectionHealthy()
      if (healthy) {
        console.log('⚠️ Streaming already active with healthy connection')
        return { success: true }
      } else {
        console.log('⚠️ Existing connection unhealthy, cleaning up...')
        await cleanupConnection()
      }
    }
    
    // Clean up any stale connections before creating new one
    if (streamingConnection || metaApiConnection) {
      console.log('🧹 Cleaning up stale connection before starting new one...')
      await cleanupConnection()
      // Wait a bit for MetaAPI to register the cleanup
      await new Promise(resolve => setTimeout(resolve, 2000))
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
    
    // Clean up any stale archive locks from crashed processes
    await cleanupStaleLocks()

    // CRITICAL: Change working directory to /tmp in serverless environments
    // MetaAPI SDK's FilesystemHistoryDatabase uses process.cwd() which points to /var/task (read-only)
    // We need to change it to /tmp before connection.connect()
    const originalCwd = process.cwd()
    let changedCwd = false
    
    if (typeof window === 'undefined') {
      const isServerless = 
        process.env.VERCEL || 
        process.env.VERCEL_ENV || 
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.FUNCTION_TARGET ||
        process.env.K_SERVICE ||
        process.env.FUNCTIONS_WORKER_RUNTIME
      
      if (isServerless) {
        try {
          process.chdir('/tmp')
          changedCwd = true
          console.log('🔧 Changed working directory to /tmp for MetaAPI SDK compatibility')
        } catch (chdirError) {
          console.warn('⚠️ Could not change working directory to /tmp:', chdirError)
        }
      }
    }

    // Connect - this is where FilesystemHistoryDatabase tries to create directories
    try {
      await connection.connect()
      console.log('✅ Connection opened')
    } catch (connectError: any) {
      // Restore original working directory before throwing
      if (changedCwd) {
        try {
          process.chdir(originalCwd)
        } catch {}
      }
      throw connectError
    }
    
    // Restore original working directory after successful connection
    if (changedCwd) {
      try {
        process.chdir(originalCwd)
        console.log('🔧 Restored working directory to original location')
      } catch (restoreError) {
        console.warn('⚠️ Could not restore working directory:', restoreError)
        // Continue anyway - not critical
      }
    }

    // Wait for synchronization with timeout
    console.log('⏳ Waiting for synchronization...')
    
    const syncTimeout = setTimeout(() => {
      console.error('❌ Synchronization timeout after 300 seconds')
      cleanupConnection()
    }, 300000) // 300 second timeout (5 minutes)
    
    try {
      await connection.waitSynchronized({ timeoutInSeconds: 300 })
      clearTimeout(syncTimeout)
      console.log('✅ Synchronized with terminal state')
    } catch (error) {
      clearTimeout(syncTimeout)
      throw error
    }

    // Initialize position tracking with existing positions (prevents duplicates on startup)
    try {
      const existingPositions = connection.terminalState?.positions || []
      console.log(`📝 Initializing tracking for ${existingPositions.length} existing positions...`)
      
      for (const position of existingPositions) {
        const positionId = ((position as any).ticket || position.id || (position as any).positionId || '').toString()
        if (positionId) {
          positionStates.set(positionId, {
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
            currentPrice: position.currentPrice
          })
          console.log(`  ✓ Initialized tracking for position ${positionId} (${position.symbol})`)
        }
      }
      
      console.log(`✅ Position tracking initialized - ${existingPositions.length} positions won't trigger duplicate Telegrams`)
    } catch (initError) {
      console.error('⚠️ Error initializing position tracking:', initError)
      // Continue anyway - better to have some duplicates than fail
    }

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
    reconnectAttempts = 0

    // Log streaming start
    await addStreamingLog({
      type: 'streaming_started',
      message: `Streaming started for account ${accountId} using SDK Streaming API`,
      success: true,
      accountId,
      details: {
        regionUrl: mt5Settings.regionUrl,
        method: 'SDK Streaming API'
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
    console.log('📡 MetaAPI SDK handles keep-alive automatically - no manual pinging needed')

    // Store in global for HMR (development only) - prevents disconnect on code reload
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const globalForConnection = global as any
      globalForConnection.__metaApiConnection = metaApiConnection
      globalForConnection.__streamingConnection = streamingConnection
      globalForConnection.__isStreaming = true
      console.log('💾 [HMR] Stored connection in global scope for Hot Module Reload persistence')
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Error initializing streaming:', error)
    
    // ALWAYS cleanup on error (prevent subscription leak)
    await cleanupConnection()
    
    // Auto-retry only on timeout (NOT on quota errors)
    if (error.name === 'TimeoutError' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++
      console.log(`⚠️ Timeout error, retrying (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`)
      
      await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY))
      
      return initializeStreaming() // Recursive retry
    }
    
    // Don't retry on quota errors
    if (error.name === 'TooManyRequestsError') {
      console.error('❌ MetaAPI quota exceeded - manual cleanup required')
      console.error('   Go to: https://app.metaapi.cloud/accounts')
      console.error('   Undeploy old/unused accounts to free subscriptions')
    }
    
    isStreaming = false
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Handle subscription limit specially
    if (errorMessage.includes('TooManyRequestsError') || errorMessage.includes('subscription quota')) {
      console.error('🚫 MetaAPI subscription limit reached!')
      console.error('💡 Solution: Stop streaming and wait 2 minutes, or close old connections at https://app.metaapi.cloud/')
      
      return {
        success: false,
        error: 'Subscription limit reached. Please stop streaming, wait 2 minutes, then try again. Or close old connections in MetaAPI dashboard.'
      }
    }

    await addStreamingLog({
      type: 'error',
      message: `Error initializing streaming: ${errorMessage}`,
      success: false,
      error: errorMessage,
      details: { error, reconnectAttempts }
    })

    await updateStreamingStatus({
      isConnected: false,
      error: errorMessage,
      reconnects: reconnectAttempts,
      active: false
    })

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Stop streaming connection
 */
/**
 * Acquire atomic lock for archiving (prevents race condition duplicates)
 * Returns true if lock acquired (can archive), false if already locked
 */
async function acquireArchiveLock(positionId: string): Promise<boolean> {
  try {
    const { doc, runTransaction, Timestamp } = await import('firebase/firestore')
    const { db } = await import('./firebaseConfig')
    
    const lockRef = doc(db, 'mt5_archive_locks', positionId)
    
    const acquired = await runTransaction(db, async (transaction) => {
      const lockDoc = await transaction.get(lockRef)
      
      if (lockDoc.exists()) {
        // Already locked by another thread
        console.log(`🔒 [ARCHIVE LOCK] Position ${positionId} already locked, skipping`)
        return false
      }
      
      // Acquire lock
      transaction.set(lockRef, {
        positionId,
        lockedAt: Timestamp.now(),
        lockedBy: 'archiving_process'
      })
      
      console.log(`✅ [ARCHIVE LOCK] Acquired lock for position ${positionId}`)
      return true
    })
    
    return acquired
  } catch (error) {
    console.error('❌ [ARCHIVE LOCK] Error acquiring lock:', error)
    return false
  }
}

/**
 * Clean up archive locks older than 5 minutes (for crashed processes)
 */
async function cleanupStaleLocks(): Promise<void> {
  try {
    const { collection, getDocs, query, where, deleteDoc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('./firebaseConfig')
    
    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000))
    
    const staleLocksQuery = query(
      collection(db, 'mt5_archive_locks'),
      where('lockedAt', '<', fiveMinutesAgo)
    )
    
    const snapshot = await getDocs(staleLocksQuery)
    
    if (snapshot.empty) {
      console.log('✅ No stale archive locks to clean up')
      return
    }
    
    console.log(`🧹 Cleaning up ${snapshot.size} stale archive locks...`)
    
    const deletePromises = snapshot.docs.map(docSnap => 
      deleteDoc(docSnap.ref)
    )
    
    await Promise.all(deletePromises)
    console.log(`✅ Cleaned up ${snapshot.size} stale locks`)
  } catch (error) {
    console.error('❌ Error cleaning stale locks:', error)
  }
}

/**
 * Get actual close price and profit from MT5 history (with retry for MT5 API delay)
 */
async function getClosedPositionData(positionId: string, accountId: string, token: string, regionUrl: string): Promise<{
  closePrice: number
  closeProfit: number
  closeTime: Date
  commission: number
  swap: number
  type?: string
  volume?: number
  symbol?: string
} | null> {
  try {
    console.log(`📡 [CLOSE DATA] Fetching actual close data from MT5 history for position: ${positionId}`)
    
    // MT5 API has a 1-2 second delay before close deals appear
    // Try up to 3 times with 800ms delay between attempts
    const maxAttempts = 3
    const retryDelay = 800 // ms
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`📡 [CLOSE DATA] Attempt ${attempt}/${maxAttempts}`)
      
      // Use MetaAPI REST API to get deal history for this position
      // Use 5 minute window to ensure we catch the close deal
      const startTime = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const endTime = new Date().toISOString()
      const url = `${regionUrl}/users/current/accounts/${accountId}/history-deals/time/${startTime}/${endTime}`
      
      if (attempt === 1) {
        console.log(`📡 [CLOSE DATA] API URL:`, url)
        console.log(`📡 [CLOSE DATA] Time window: ${startTime} to ${endTime}`)
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'auth-token': token,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.error(`❌ [CLOSE DATA] HTTP error: ${response.status}`)
        const errorText = await response.text().catch(() => 'Unable to read error')
        console.error(`❌ [CLOSE DATA] Error response:`, errorText)
        return null
      }
      
      const deals = await response.json()
      console.log(`📊 [CLOSE DATA] Found ${deals.length} deals in last 5 minutes`)
      
      // Log all deals for debugging (only on first attempt)
      if (attempt === 1 && deals.length > 0 && deals.length < 20) {
        console.log(`📋 [CLOSE DATA] All deals:`, deals.map((d: any) => ({
          id: d.id,
          positionId: d.positionId,
          entryType: d.entryType,
          price: d.price,
          profit: d.profit
        })))
      }
      
      // Find the OUT deal for this position (closing deal)
      const closeDeal = deals.find((deal: any) => 
        deal.positionId === positionId && 
        (deal.entryType === 'DEAL_ENTRY_OUT' || deal.entryType === 1)
      )
      
      if (closeDeal) {
        console.log(`✅ [CLOSE DATA] Found close deal on attempt ${attempt}:`, {
          dealId: closeDeal.id,
          price: closeDeal.price,
          profit: closeDeal.profit,
          commission: closeDeal.commission,
          swap: closeDeal.swap,
          time: closeDeal.time,
          type: closeDeal.type,
          volume: closeDeal.volume,
          symbol: closeDeal.symbol
        })
        
        return {
          closePrice: closeDeal.price || 0,
          closeProfit: closeDeal.profit || 0,
          closeTime: closeDeal.time ? new Date(closeDeal.time) : new Date(),
          commission: closeDeal.commission || 0,
          swap: closeDeal.swap || 0,
          type: closeDeal.type,
          volume: closeDeal.volume,
          symbol: closeDeal.symbol
        }
      }
      
      // Close deal not found yet
      console.log(`⚠️ [CLOSE DATA] No close deal found on attempt ${attempt}/${maxAttempts}`)
      
      // If not last attempt, wait before retrying
      if (attempt < maxAttempts) {
        console.log(`⏳ [CLOSE DATA] Waiting ${retryDelay}ms before retry (MT5 API delay)...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
    
    // All attempts exhausted
    console.log(`❌ [CLOSE DATA] Failed to find close deal after ${maxAttempts} attempts`)
    console.log(`❌ [CLOSE DATA] Position ${positionId} may have closed too recently (MT5 API delay)`)
    return null
  } catch (error) {
    console.error('❌ [CLOSE DATA] Error fetching close data:', error)
    return null
  }
}

/**
 * Cleanup MetaAPI connection and free subscription
 */
async function cleanupConnection(): Promise<void> {
  try {
    if (streamingConnection) {
      console.log('🧹 Cleaning up MetaAPI streaming connection...')
      
      // Remove listeners first
      try {
        streamingConnection.removeAllListeners()
      } catch (e) {
        console.log('⚠️ Error removing listeners:', e)
      }
      
      // Close connection
      try {
        if (streamingConnection.close) {
          await streamingConnection.close()
        } else if (streamingConnection.connection?.close) {
          await streamingConnection.connection.close()
        }
        console.log('✅ Streaming connection closed')
      } catch (e) {
        console.log('⚠️ Error closing streaming connection:', e)
      }
      
      streamingConnection = null
    }
    
    if (metaApiConnection) {
      console.log('🧹 Closing MetaAPI account connection...')
      
      // Unsubscribe from terminal
      try {
        await metaApiConnection.unsubscribe()
        console.log('✅ Unsubscribed from terminal')
      } catch (e) {
        console.log('⚠️ Error unsubscribing:', e)
      }
      
      metaApiConnection = null
    }
    
    // Clear state
    positionStates.clear()
    processingPositions.clear()
    archivedPositions.clear()
    reconnectAttempts = 0
    
    console.log('✅ MetaAPI cleanup complete - subscription freed')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

/**
 * Check if connection is healthy
 */
async function isConnectionHealthy(): Promise<boolean> {
  try {
    if (!streamingConnection || !metaApiConnection) {
      return false
    }
    
    // Check if connection is actually connected
    const connectionState = streamingConnection.healthStatus
    
    if (!connectionState || connectionState.synchronized === false) {
      console.log('⚠️ Connection unhealthy or not synchronized')
      return false
    }
    
    return true
  } catch (error) {
    // Health check failed, connection is probably dead
    return false
  }
}

export async function stopStreaming(): Promise<{ success: boolean; error?: string }> {
  try {
    const accountId = streamingConnection?.accountId || metaApiConnection?.id
    
    if (!isStreaming && !streamingConnection) {
      console.log('⚠️ Streaming already stopped')
      return { success: true }
    }

    console.log('🛑 Stopping MetaAPI real-time streaming...')
    
    // Set flag first
    isStreaming = false
    
    // Actually close the connection and free subscription
    await cleanupConnection()
    
    // Log streaming stop
    try {
      await addStreamingLog({
        type: 'streaming_stopped',
        message: `Streaming stopped for account ${accountId || 'unknown'}`,
        accountId,
        success: true
      })
    } catch (logError) {
      console.error('Error logging streaming stop:', logError)
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
    
    console.log('✅ Streaming stopped and cleaned up')
    
    return { success: true }
  } catch (error) {
    console.error('❌ Error stopping streaming:', error)
    
    // Force cleanup even on error
    isStreaming = false
    streamingConnection = null
    metaApiConnection = null
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
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
        lastEvent: new Date(),
        active: true
      }
    }
    
    console.log('📊 Streaming status: INACTIVE')
    return {
      isConnected: false,
      active: false
    }
  } catch (error) {
    console.error('Error getting streaming status:', error)
    return {
      isConnected: false,
      active: false
    }
  }
}

/**
 * Cleanup on process exit
 * This ensures subscriptions are freed when server restarts
 */
if (typeof process !== 'undefined') {
  const exitHandler = async (signal: string) => {
    console.log(`\n🛑 Received ${signal} - cleaning up MetaAPI connections...`)
    try {
      await cleanupConnection()
      console.log('✅ Cleanup complete on exit')
      process.exit(0)
    } catch (error) {
      console.error('❌ Cleanup error on exit:', error)
      process.exit(1)
    }
  }

  // Handle graceful shutdown
  process.on('SIGTERM', () => exitHandler('SIGTERM'))
  process.on('SIGINT', () => exitHandler('SIGINT'))
  
  // Handle server restart (Next.js dev mode)
  process.on('beforeExit', async () => {
    console.log('🔄 Process exiting - cleaning up MetaAPI connections...')
    await cleanupConnection()
  })
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

/**
 * Get the current streaming connection (for reuse)
 */
export function getStreamingConnection() {
  return streamingConnection
}

/**
 * Force cleanup all MetaAPI subscriptions
 * Use this if you have subscription quota issues
 */
export async function forceCleanupAllSubscriptions(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🧹 Force cleaning up all MetaAPI subscriptions...')
    
    // Stop current streaming
    await stopStreaming()
    
    // Clear all state
    positionStates.clear()
    processingPositions.clear()
    archivedPositions.clear()
    
    // Reset connection references
    streamingConnection = null
    metaApiConnection = null
    isStreaming = false
    reconnectAttempts = 0
    
    console.log('✅ All subscriptions cleaned up')
    return { 
      success: true, 
      message: 'All subscriptions cleaned. Wait 1 minute before reconnecting.' 
    }
  } catch (error) {
    console.error('❌ Error during force cleanup:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Export singleton status
export { isStreaming, streamingConnection }

