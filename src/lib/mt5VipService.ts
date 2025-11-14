import { db } from './firebaseConfig'
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore'
import { Trade } from '@/types/trade'
import { MT5Deal, MT5SyncLog, MT5AccountInfo } from '@/types/mt5'

// Lazy load MetaAPI to avoid "window is not defined" error in server-side code
let MetaApi: any = null
let metaapi: any = null

/**
 * Get MetaAPI instance with custom token (lazy loaded)
 * Uses REST API client for server-side to avoid "window is not defined" error
 */
export async function getMetaApiInstance(token?: string): Promise<any> {
  const tokenToUse = token || process.env.METAAPI_TOKEN
  if (!tokenToUse) {
    throw new Error('METAAPI_TOKEN not configured')
  }

  // For server-side, try using MetaAPI SDK with HTTP API methods
  // MetaAPI SDK has HTTP API wrapper that works server-side
  if (typeof window === 'undefined') {
    try {
      // Try to use MetaAPI SDK's HTTP API directly
      // The SDK has HTTP methods that don't require browser objects
      const MetaApiModule = await import('metaapi.cloud-sdk')
      const MetaApiClass = MetaApiModule.default || (MetaApiModule as any).MetaApi || MetaApiModule
      
      // Create MetaAPI instance - SDK may work if we avoid browser-specific methods
      const metaApiInstance = typeof MetaApiClass === 'function' ? new (MetaApiClass as any)(tokenToUse) : MetaApiClass
      
      // Use the HTTP API wrapper which should work server-side
      const httpApi = metaApiInstance.httpClient || metaApiInstance
      
      return {
        token: tokenToUse,
        metatraderAccountApi: {
          getAccount: async (accountId: string) => {
            try {
              // Try using SDK's HTTP API methods
              const account = await httpApi.metatraderAccountApi?.getAccount(accountId) || 
                             await metaApiInstance.metatraderAccountApi?.getAccount(accountId)
              
              if (account) {
                return account
              }
            } catch (sdkError) {
              console.log('SDK method failed, falling back to REST API wrapper:', sdkError instanceof Error ? sdkError.message : 'Unknown error')
            }
            
            // Fallback to REST API wrapper if SDK doesn't work
            return {
              id: accountId,
              token: tokenToUse,
              getRPCConnection: () => ({
                connected: false,
                connect: async () => {
                  throw new Error('RPC connection not available server-side. Use REST API endpoints instead.')
                },
                getPositions: async () => {
                  const { getPositions } = await import('./metaapiRestClient')
                  return getPositions(accountId, tokenToUse)
                },
                getDeals: async (startTime?: Date, endTime?: Date) => {
                  const { getDeals } = await import('./metaapiRestClient')
                  return getDeals(accountId, tokenToUse, undefined, startTime, endTime)
                },
                getHistoryOrders: async (startTime?: Date, endTime?: Date) => {
                  // Use REST API for order history
                  const { getHistoryOrders } = await import('./metaapiRestClient')
                  return getHistoryOrders(accountId, tokenToUse, undefined, startTime, endTime)
                },
                getOrders: async () => {
                  // Use REST API for orders
                  const { getOrders } = await import('./metaapiRestClient')
                  return getOrders(accountId, tokenToUse)
                }
              }),
              deploy: async () => {
                // Account deployment handled via REST API if needed
                console.log(`Account ${accountId} deployment check skipped (server-side)`)
              },
              waitConnected: async () => {
                // Connection check handled via REST API if needed
                console.log(`Account ${accountId} connection check skipped (server-side)`)
              },
              waitSynchronized: async () => {
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }
          }
        }
      }
    } catch (importError) {
      console.warn('Could not import MetaAPI SDK server-side, using REST API wrapper:', importError instanceof Error ? importError.message : 'Unknown')
      
      // Fallback to REST API wrapper
      return {
        token: tokenToUse,
        metatraderAccountApi: {
          getAccount: async (accountId: string) => {
            return {
              id: accountId,
              token: tokenToUse,
              getRPCConnection: () => ({
                connected: false,
                connect: async () => {
                  throw new Error('RPC connection not available server-side.')
                },
                getPositions: async () => {
                  const { getPositions } = await import('./metaapiRestClient')
                  return getPositions(accountId, tokenToUse)
                }
              }),
              deploy: async () => {
                // Account deployment handled via REST API if needed
                console.log(`Account ${accountId} deployment check skipped (server-side)`)
              },
              waitConnected: async () => {
                // Connection check handled via REST API if needed
                console.log(`Account ${accountId} connection check skipped (server-side)`)
              },
              waitSynchronized: async () => {
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }
          }
        }
      }
    }
  }
  
  // Client-side: use SDK
  if (!MetaApi) {
    MetaApi = (await import('metaapi.cloud-sdk')).default
  }
  
  if (!metaapi || metaapi.token !== tokenToUse) {
    metaapi = new MetaApi(tokenToUse)
    metaapi.token = tokenToUse
  }
  
  return metaapi
}

// VIP profile ID for storing MT5 trades
const VIP_PROFILE_ID = 'vip-showcase'
const VIP_USER_ID = 'vip-trader' // System user ID for VIP trades

/**
 * Connect to VIP MT5 account
 */
export async function connectVipAccount(): Promise<{ success: boolean; account?: any; error?: string }> {
  try {
    const accountId = process.env.MT5_ACCOUNT_ID
    if (!accountId) {
      throw new Error('MT5_ACCOUNT_ID not configured')
    }

    const apiInstance = await getMetaApiInstance()
    const account = await apiInstance.metatraderAccountApi.getAccount(accountId)
    await account.deploy()
    await account.waitConnected()

    return { success: true, account }
  } catch (error) {
    console.error('Error connecting VIP account:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get VIP account information
 */
export async function getVipAccountInfo(): Promise<MT5AccountInfo | null> {
  try {
    const accountId = process.env.MT5_ACCOUNT_ID
    if (!accountId) {
      throw new Error('MT5_ACCOUNT_ID not configured')
    }

    const apiInstance = await getMetaApiInstance()
    const account = await apiInstance.metatraderAccountApi.getAccount(accountId)
    const connection = account.getRPCConnection()
    
    if (!connection.connected) {
      await connection.connect()
    }

    const accountInfo = await connection.getAccountInformation()
    
    return {
      id: accountId,
      login: accountInfo.login,
      server: accountInfo.server,
      platform: accountInfo.platform,
      status: connection.connected ? 'connected' : 'disconnected',
      balance: accountInfo.balance,
      equity: accountInfo.equity,
      margin: accountInfo.margin,
      freeMargin: accountInfo.freeMargin,
      marginLevel: accountInfo.marginLevel,
      lastSyncAt: new Date()
    }
  } catch (error) {
    console.error('Error getting VIP account info:', error)
    return null
  }
}

/**
 * Get open positions from MT5 account
 */
export async function getMT5Positions(accountId?: string, token?: string): Promise<any[]> {
  try {
    const accountIdToUse = accountId || process.env.MT5_ACCOUNT_ID
    if (!accountIdToUse) {
      throw new Error('MT5_ACCOUNT_ID not configured')
    }

    const tokenToUse = token || process.env.METAAPI_TOKEN
    if (!tokenToUse) {
      throw new Error('METAAPI_TOKEN not configured')
    }

    console.log('Connecting to MT5 account:', { accountId: accountIdToUse, hasToken: !!tokenToUse })

    // Use custom token if provided, otherwise use default instance (now async)
    const apiInstance = await getMetaApiInstance(tokenToUse)
    
    // For server-side, always use REST API (SDK doesn't work server-side)
    if (typeof window === 'undefined') {
      console.log('Server-side detected, using REST API for positions with London default...')
      // London endpoint is default in metaapiRestClient, so we can pass undefined
      const { getPositions: getPositionsRest } = await import('./metaapiRestClient')
      const positions = await getPositionsRest(accountIdToUse, tokenToUse, undefined) // London will be used by default
      console.log(`Found ${positions.length} open positions via REST API`)
      return positions
    }
    
    // Client-side: use SDK RPC connection
    console.log('Getting account from MetaAPI...')
    const account = await apiInstance.metatraderAccountApi.getAccount(accountIdToUse)
    
    console.log('Deploying account...')
    await account.deploy()
    
    console.log('Waiting for account connection...')
    await account.waitConnected()
    
    console.log('Getting RPC connection...')
    const connection = account.getRPCConnection()
    
    if (!connection.connected) {
      console.log('Connecting RPC...')
      await connection.connect()
      console.log('Waiting for synchronization...')
      await account.waitSynchronized()
    }

    console.log('Getting positions via RPC...')
    const positions = await connection.getPositions()
    console.log(`Found ${positions.length} open positions from MT5`)
    
    return positions
  } catch (error) {
    console.error('Error getting MT5 positions:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    throw error
  }
}

/**
 * Sync VIP trades from MT5
 */
export async function syncVipTrades(startDate: Date, endDate: Date): Promise<{ success: boolean; summary?: any; error?: string }> {
  try {
    const accountId = process.env.MT5_ACCOUNT_ID
    if (!accountId) {
      throw new Error('MT5_ACCOUNT_ID not configured')
    }

    const apiInstance = await getMetaApiInstance()
    const account = await apiInstance.metatraderAccountApi.getAccount(accountId)
    const connection = account.getRPCConnection()
    
    if (!connection.connected) {
      await connection.connect()
    }

    // Get deals from MT5
    const deals = await connection.getDeals(startDate, endDate)
    console.log(`Found ${deals.length} deals from MT5`)

    let tradesImported = 0
    let tradesUpdated = 0
    const errors: string[] = []

    // Process each deal
    for (const deal of deals) {
      try {
        const trade = convertMT5DealToAppTrade(deal)
        
        // Check if trade already exists
        const existingTrade = await checkDuplicateTrade(trade.mt5TicketId!, VIP_PROFILE_ID)
        
        if (existingTrade) {
          // Update existing trade
          await updateVipTrade(existingTrade.id, trade)
          tradesUpdated++
        } else {
          // Create new trade
          await saveVipTrade(trade)
          tradesImported++
        }
      } catch (error) {
        const errorMsg = `Error processing deal ${deal.ticket}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    // Log sync result
    const syncLog: Omit<MT5SyncLog, 'id'> = {
      syncedAt: new Date(),
      tradesImported,
      tradesUpdated,
      errors,
      status: errors.length === 0 ? 'success' : errors.length < deals.length ? 'partial' : 'failed'
    }

    await addDoc(collection(db, 'mt5_sync_logs'), syncLog)

    return {
      success: true,
      summary: {
        totalDeals: deals.length,
        tradesImported,
        tradesUpdated,
        errors: errors.length,
        status: syncLog.status
      }
    }
  } catch (error) {
    console.error('Error syncing VIP trades:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Convert MT5 deal to app Trade format
 */
function convertMT5DealToAppTrade(deal: MT5Deal): Omit<Trade, 'id' | 'createdAt' | 'updatedAt'> {
  const isBuy = deal.type === 'BUY'
  const isEntry = deal.entry === 'IN'
  
  // Calculate pips (simplified - you may need to adjust based on symbol)
  const pips = Math.abs(deal.profit) * 10000 // Rough conversion
  
  // Determine trade status
  let status: 'OPEN' | 'CLOSED' | 'CLOSE' | 'LOSS' | 'BREAKEVEN' = 'OPEN'
  if (!isEntry) {
    if (deal.profit > 0) status = 'CLOSED'
    else if (deal.profit < 0) status = 'LOSS'
    else status = 'BREAKEVEN'
  }

  return {
    pair: deal.symbol,
    type: isBuy ? 'BUY' : 'SELL',
    status,
    entryPrice: deal.price,
    exitPrice: deal.price, // Will be updated when position closes
    pips: Math.round(pips),
    profit: deal.profit,
    rr: 0, // Will be calculated based on risk
    risk: 0, // Will be calculated
    lotSize: deal.volume,
    result: deal.profit,
    date: new Date(parseInt(deal.timeMsc)).toISOString().split('T')[0],
    time: new Date(parseInt(deal.timeMsc)).toISOString().split('T')[1].split('.')[0],
    notes: deal.comment || '',
    source: 'MT5_VIP',
    mt5TicketId: deal.ticket,
    mt5Commission: deal.commission,
    mt5Swap: deal.swap,
    openTime: isEntry ? new Date(parseInt(deal.timeMsc)) : undefined,
    closeTime: !isEntry ? new Date(parseInt(deal.timeMsc)) : undefined,
    profileId: VIP_PROFILE_ID,
    userId: VIP_USER_ID
  }
}

/**
 * Save VIP trade to Firebase
 */
async function saveVipTrade(trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const tradeData = {
    ...trade,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
  
  await addDoc(collection(db, 'trades'), tradeData)
  console.log(`Saved VIP trade: ${trade.pair} ${trade.type} - Ticket: ${trade.mt5TicketId}`)
}

/**
 * Update existing VIP trade
 */
async function updateVipTrade(tradeId: string, trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const tradeRef = doc(db, 'trades', tradeId)
  const updateData = {
    ...trade,
    updatedAt: Timestamp.now()
  }
  
  await updateDoc(tradeRef, updateData)
  console.log(`Updated VIP trade: ${tradeId}`)
}

/**
 * Check for duplicate trade
 */
async function checkDuplicateTrade(mt5TicketId: string, profileId: string): Promise<Trade | null> {
  try {
    const q = query(
      collection(db, 'trades'),
      where('mt5TicketId', '==', mt5TicketId),
      where('profileId', '==', profileId)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as Trade
  } catch (error) {
    console.error('Error checking duplicate trade:', error)
    return null
  }
}

/**
 * Get VIP sync logs
 */
export async function getVipSyncLogs(limitCount: number = 10): Promise<MT5SyncLog[]> {
  try {
    const q = query(
      collection(db, 'mt5_sync_logs'),
      orderBy('syncedAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      syncedAt: doc.data().syncedAt?.toDate()
    })) as MT5SyncLog[]
  } catch (error) {
    console.error('Error getting VIP sync logs:', error)
    return []
  }
}

/**
 * Get VIP trades for display
 */
export async function getVipTrades(limitCount: number = 100): Promise<Trade[]> {
  try {
    const q = query(
      collection(db, 'trades'),
      where('profileId', '==', VIP_PROFILE_ID),
      where('source', '==', 'MT5_VIP'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Trade[]
  } catch (error) {
    console.error('Error getting VIP trades:', error)
    return []
  }
}

/**
 * Get VIP trade statistics
 */
export async function getVipTradeStats(): Promise<{
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalProfit: number
  winRate: number
  averageWin: number
  averageLoss: number
  bestTrade: number
  worstTrade: number
}> {
  try {
    const trades = await getVipTrades(1000) // Get more trades for accurate stats
    
    const closedTrades = trades.filter(trade => trade.status === 'CLOSED' || trade.status === 'LOSS' || trade.status === 'BREAKEVEN')
    
    const stats = {
      totalTrades: closedTrades.length,
      winningTrades: closedTrades.filter(trade => trade.result && trade.result > 0).length,
      losingTrades: closedTrades.filter(trade => trade.result && trade.result < 0).length,
      totalProfit: closedTrades.reduce((sum, trade) => sum + (trade.result || 0), 0),
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      bestTrade: 0,
      worstTrade: 0
    }
    
    if (stats.totalTrades > 0) {
      stats.winRate = (stats.winningTrades / stats.totalTrades) * 100
      
      const winningTrades = closedTrades.filter(trade => trade.result && trade.result > 0)
      const losingTrades = closedTrades.filter(trade => trade.result && trade.result < 0)
      
      if (winningTrades.length > 0) {
        stats.averageWin = winningTrades.reduce((sum, trade) => sum + (trade.result || 0), 0) / winningTrades.length
      }
      
      if (losingTrades.length > 0) {
        stats.averageLoss = losingTrades.reduce((sum, trade) => sum + (trade.result || 0), 0) / losingTrades.length
      }
      
      const results = closedTrades.map(trade => trade.result || 0)
      stats.bestTrade = Math.max(...results)
      stats.worstTrade = Math.min(...results)
    }
    
    return stats
  } catch (error) {
    console.error('Error getting VIP trade stats:', error)
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      bestTrade: 0,
      worstTrade: 0
    }
  }
}


