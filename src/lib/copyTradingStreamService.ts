/**
 * Copy Trading Streaming Service
 * Streams trades from master account using MetaAPI SDK
 * Archives closed trades to Firestore with pips calculation
 */

import MetaApi from 'metaapi.cloud-sdk'
import { SynchronizationListener } from 'metaapi.cloud-sdk'
import { getMasterStrategy } from './copyTradingRepo'
import { decrypt } from './crypto'
import { archiveClosedTrade } from './mt5TradeHistoryService'
import { calculatePipsFromPosition } from './pipCalculator'
import { shouldSendAlert, sendTradeAlert } from './copyTradingTradeAlertsService'
import { db } from './firebaseConfig'
import { collectionGroup, query, where, getDocs } from 'firebase/firestore'

// Singleton pattern to maintain streaming connections per account
const streamingConnections = new Map<string, any>()

interface StreamingConnection {
  accountId: string
  strategyId: string
  connection: any
  listener: any
  isActive: boolean
}

/**
 * Start streaming trades for a master account
 */
export async function startCopyTradingStream(
  masterAccountId: string,
  strategyId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get master strategy
    let masterStrategy
    if (strategyId) {
      masterStrategy = await getMasterStrategy(strategyId)
    } else {
      // Get active strategy for this account
      const { listMasterStrategies } = await import('./copyTradingRepo')
      const strategies = await listMasterStrategies()
      masterStrategy = strategies.find(s => s.accountId === masterAccountId && s.status === 'active')
    }

    if (!masterStrategy) {
      throw new Error(`No active master strategy found for account ${masterAccountId}`)
    }

    if (!masterStrategy.tokenEnc) {
      throw new Error('Master strategy token not configured')
    }

    // Decrypt token
    const token = await decrypt(masterStrategy.tokenEnc)
    const accountId = masterStrategy.accountId

    // Check if already streaming
    if (streamingConnections.has(accountId)) {
      const existing = streamingConnections.get(accountId)
      if (existing.isActive) {
        return { success: true } // Already streaming
      }
    }

    console.log(`[CopyTradingStream] Starting stream for account ${accountId}`)

    // Initialize MetaAPI
    const metaApi = new MetaApi(token, { application: 'redemptionfx' })
    const account = await metaApi.metatraderAccountApi.getAccount(accountId)
    
    // Deploy account if needed
    if (account.state !== 'DEPLOYED') {
      await account.deploy()
      await account.waitDeployed()
    }
    
    // Wait for connection
    if (account.connectionStatus !== 'CONNECTED') {
      await account.waitConnected()
    }
    
    const connection = account.getStreamingConnection()

    // Create position listener
    const listener = new CopyTradingPositionListener(accountId, strategyId || masterStrategy.strategyId)

    // Add listener
    connection.addSynchronizationListener(listener)

    // Connect
    await connection.connect()
    console.log(`[CopyTradingStream] Connection opened for account ${accountId}`)

    // Wait for synchronization
    await connection.waitSynchronized()
    console.log(`[CopyTradingStream] Synchronized with terminal state for account ${accountId}`)

    // Store connection
    streamingConnections.set(accountId, {
      accountId,
      strategyId: strategyId || masterStrategy.strategyId,
      connection,
      listener,
      isActive: true
    })

    return { success: true }
  } catch (error) {
    console.error('[CopyTradingStream] Error starting stream:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start streaming'
    }
  }
}

/**
 * Stop streaming for a master account
 */
export async function stopCopyTradingStream(accountId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const connection = streamingConnections.get(accountId)
    if (!connection) {
      return { success: true } // Already stopped
    }

    if (connection.connection) {
      await connection.connection.close()
    }

    streamingConnections.delete(accountId)
    console.log(`[CopyTradingStream] Stopped stream for account ${accountId}`)

    return { success: true }
  } catch (error) {
    console.error('[CopyTradingStream] Error stopping stream:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop streaming'
    }
  }
}

/**
 * Get streaming status for an account
 */
export function getStreamingStatus(accountId: string): { isActive: boolean } {
  const connection = streamingConnections.get(accountId)
  return {
    isActive: connection?.isActive || false
  }
}

/**
 * Position listener for copy trading
 */
class CopyTradingPositionListener extends SynchronizationListener {
  private accountId: string
  private strategyId: string
  private seenPositions = new Map<string, any>()

  constructor(accountId: string, strategyId: string) {
    super()
    this.accountId = accountId
    this.strategyId = strategyId
  }

  async onPositionUpdated(instanceIndex: string, position: any): Promise<void> {
    const positionId = position.id || position.ticket || position.positionId
    if (!positionId) return

    console.log(`[CopyTradingStream] Position updated: ${positionId} for account ${this.accountId}`)

    // Store position state
    this.seenPositions.set(positionId.toString(), position)
  }

  async onPositionClosed(instanceIndex: string, position: any): Promise<void> {
    const positionId = position.id || position.ticket || position.positionId
    if (!positionId) return

    console.log(`[CopyTradingStream] Position closed: ${positionId} for account ${this.accountId}`)

    try {
      // Get previous position state
      const previousPosition = this.seenPositions.get(positionId.toString())

      // Archive the closed trade
      await this.archiveTrade(position, previousPosition)
    } catch (error) {
      console.error(`[CopyTradingStream] Error archiving trade ${positionId}:`, error)
    } finally {
      // Remove from seen positions
      this.seenPositions.delete(positionId.toString())
    }
  }

  private async archiveTrade(position: any, previousPosition?: any): Promise<void> {
    try {
      // Extract trade data
      const symbol = position.symbol
      const type = position.type === 'POSITION_TYPE_BUY' || position.type === 'BUY' ? 'BUY' : 'SELL'
      const openPrice = position.openPrice || previousPosition?.openPrice
      const closePrice = position.closePrice || position.currentPrice
      const profit = position.profit || 0
      const volume = position.volume || 0
      const openTime = previousPosition?.openTime ? new Date(previousPosition.openTime) : new Date()
      const closeTime = new Date()

      if (!openPrice || !closePrice || !symbol) {
        console.warn(`[CopyTradingStream] Missing required data for trade ${position.id}:`, {
          openPrice,
          closePrice,
          symbol
        })
        return
      }

      // Calculate pips
      const pips = calculatePipsFromPosition({
        symbol,
        type,
        openPrice,
        currentPrice: closePrice
      })

      // Create a minimal signal object for archiveClosedTrade
      // We'll use type assertion since we only have position data, not full signal data
      const signal = {
        id: position.id?.toString() || '',
        pair: symbol,
        type,
        entryPrice: openPrice,
        stopLoss: position.stopLoss || previousPosition?.stopLoss,
        takeProfit1: position.takeProfit || previousPosition?.takeProfit,
        takeProfit2: undefined,
        takeProfit3: undefined,
        status: 'closed' as const,
        // Required Signal fields with defaults
        title: `${type} ${symbol}`,
        description: `Trade closed for ${symbol}`,
        category: 'vip' as const,
        postedAt: openTime,
        postedBy: 'system',
        vipOnly: false,
        createdAt: openTime,
        updatedAt: closeTime
      } as any

      // Archive the trade
      await archiveClosedTrade({
        positionId: position.id?.toString() || position.ticket?.toString() || '',
        signal,
        finalProfit: profit,
        finalPrice: closePrice,
        accountId: this.accountId,
        realPositionData: {
          type,
          openTime,
          volume,
          symbol,
          openPrice,
          stopLoss: position.stopLoss || previousPosition?.stopLoss,
          takeProfit: position.takeProfit || previousPosition?.takeProfit,
          commission: position.commission || 0,
          swap: position.swap || 0
        }
      })

      console.log(`[CopyTradingStream] Archived trade ${position.id}: ${pips} pips, $${profit} profit`)

      // Send trade alerts to followers if enabled
      if (process.env.ENABLE_AUTOMATION_FEATURES === 'true') {
        try {
          await this.sendTradeAlertsToFollowers({
            id: position.id?.toString() || position.ticket?.toString() || '',
            accountId: this.accountId,
            symbol,
            type,
            volume,
            profit,
            pips,
            openPrice,
            closePrice,
            openTime,
            closeTime
          })
        } catch (alertError) {
          console.warn(`[CopyTradingStream] Error sending trade alerts:`, alertError)
          // Don't throw - alerts are non-critical
        }
      }
    } catch (error) {
      console.error(`[CopyTradingStream] Error archiving trade:`, error)
      throw error
    }
  }

  async onPositionsSynchronized(instanceIndex: string, synchronizationId: string): Promise<void> {
    console.log(`[CopyTradingStream] Positions synchronized for account ${this.accountId}`)
  }

  private async sendTradeAlertsToFollowers(trade: {
    id: string
    accountId: string
    symbol: string
    type: 'BUY' | 'SELL'
    volume: number
    profit: number
    pips: number
    openPrice: number
    closePrice: number
    openTime: Date
    closeTime: Date
  }): Promise<void> {
    try {
      console.log(`[CopyTradingStream] sendTradeAlertsToFollowers called for trade:`, {
        id: trade.id,
        accountId: trade.accountId,
        symbol: trade.symbol,
        type: trade.type,
        volume: trade.volume,
        profit: trade.profit,
        pips: trade.pips,
        strategyId: this.strategyId
      })

      // Get all follower accounts for this strategy
      const copyTradingQuery = query(
        collectionGroup(db, 'copyTradingAccounts'),
        where('strategyId', '==', this.strategyId),
        where('status', '==', 'active')
      )
      const snapshot = await getDocs(copyTradingQuery)

      console.log(`[CopyTradingStream] Found ${snapshot.docs.length} active follower accounts for strategy ${this.strategyId}`)

      for (const docSnapshot of snapshot.docs) {
        try {
          const data = docSnapshot.data()
          const userId = docSnapshot.ref.parent.parent?.id

          console.log(`[CopyTradingStream] Processing follower: userId=${userId}, accountId=${data.accountId}, tradeAlertsEnabled=${data.tradeAlertsEnabled}`)

          if (!userId || !data.tradeAlertsEnabled) {
            console.log(`[CopyTradingStream] Skipping follower ${userId}: ${!userId ? 'no userId' : 'tradeAlertsEnabled=false'}`)
            continue
          }

          // Check if alert should be sent
          const account = {
            ...data,
            tradeAlertsEnabled: data.tradeAlertsEnabled,
            alertTypes: data.alertTypes || [],
            minTradeSizeForAlert: data.minTradeSizeForAlert || 0.1,
            minProfitForAlert: data.minProfitForAlert || 100,
            minLossForAlert: data.minLossForAlert || -100
          }

          console.log(`[CopyTradingStream] Follower alert settings:`, {
            userId,
            accountId: data.accountId,
            tradeAlertsEnabled: account.tradeAlertsEnabled,
            alertTypes: account.alertTypes,
            minTradeSizeForAlert: account.minTradeSizeForAlert,
            minProfitForAlert: account.minProfitForAlert,
            minLossForAlert: account.minLossForAlert
          })

          const alertCheck = shouldSendAlert(
            {
              id: trade.id,
              accountId: data.accountId || docSnapshot.id,
              symbol: trade.symbol,
              type: trade.type,
              volume: trade.volume,
              profit: trade.profit,
              pips: trade.pips,
              openPrice: trade.openPrice,
              closePrice: trade.closePrice,
              openTime: trade.openTime,
              closeTime: trade.closeTime
            },
            account as any
          )

          console.log(`[CopyTradingStream] Alert check result for follower ${userId}:`, {
            shouldSend: alertCheck.shouldSend,
            alertType: alertCheck.alertType,
            reason: alertCheck.reason
          })

          if (alertCheck.shouldSend && alertCheck.alertType) {
            console.log(`[CopyTradingStream] Sending alert to follower ${userId} for trade ${trade.id}`)
            try {
              await sendTradeAlert(
                userId,
                {
                  id: trade.id,
                  accountId: data.accountId || docSnapshot.id,
                  symbol: trade.symbol,
                  type: trade.type,
                  volume: trade.volume,
                  profit: trade.profit,
                  pips: trade.pips,
                  openPrice: trade.openPrice,
                  closePrice: trade.closePrice,
                  openTime: trade.openTime,
                  closeTime: trade.closeTime
                },
                alertCheck.alertType,
                alertCheck.reason || 'Trade alert'
              )
              console.log(`[CopyTradingStream] Successfully sent alert to follower ${userId}`)
            } catch (alertError) {
              console.error(`[CopyTradingStream] Error sending alert to follower ${userId}:`, alertError)
            }
          } else {
            console.log(`[CopyTradingStream] Alert not sent to follower ${userId}: shouldSend=${alertCheck.shouldSend}, alertType=${alertCheck.alertType}`)
          }
        } catch (error) {
          console.warn(`[CopyTradingStream] Error processing alert for follower:`, error)
          // Continue with other followers
        }
      }
    } catch (error) {
      console.error(`[CopyTradingStream] Error sending trade alerts:`, error)
      // Don't throw - alerts are non-critical
    }
  }
}

