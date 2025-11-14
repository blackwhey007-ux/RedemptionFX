/**
 * Account MT5 Sync Service
 * Syncs trades from MT5 accounts or copy trading accounts to user's trades collection
 * Uses direct account linking instead of profiles
 */

import { db } from './firebaseConfig'
import { collection, addDoc, updateDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { getAccountByLinkId, updateLastSyncAt } from './accountService'
import { listUserCopyTradingAccounts } from './copyTradingRepo'
import { getMetaApiInstance } from './mt5VipService'
import { getAccountInfo } from './metaapiRestClient'
import { Trade } from '@/types/trade'
import { MT5Deal } from '@/types/mt5'
import { calculatePips } from './currencyDatabase'
import { calculateRiskReward } from './mt5TradeHistoryService'

/**
 * Normalize broker-specific symbols to standard format
 * Maps common broker symbol formats to currency database format
 */
function normalizeSymbol(symbol: string | undefined): string {
  if (!symbol) return 'UNKNOWN'
  
  const symbolUpper = symbol.toUpperCase()
  
  // Symbol mapping: broker format -> standard format
  const symbolMap: Record<string, string> = {
    // Indices
    'US100CASH': 'NAS100',
    'US100': 'NAS100',
    'NAS100CASH': 'NAS100',
    'US30CASH': 'US30',
    'US30': 'US30',
    'SPX500CASH': 'SPX500',
    'SPX500': 'SPX500',
    'UK100CASH': 'UK100',
    'UK100': 'UK100',
    'GER30CASH': 'GER30',
    'GER30': 'GER30',
    'FRA40CASH': 'FRA40',
    'FRA40': 'FRA40',
    'JPN225CASH': 'JPN225',
    'JP225CASH': 'JPN225',
    'JP225': 'JPN225',
    'AUS200CASH': 'AUS200',
    'AUS200': 'AUS200',
    
    // Commodities
    'GOLD': 'XAU/USD',
    'XAUUSD': 'XAU/USD',
    'GOLDCASH': 'XAU/USD',
    'SILVER': 'XAG/USD',
    'XAGUSD': 'XAG/USD',
    'SILVERCASH': 'XAG/USD',
    'OIL': 'USOIL',
    'USOILCASH': 'USOIL',
    'CRUDEOIL': 'USOIL',
    
    // Crypto
    'BTCUSD': 'BTC/USD',
    'BTCCASH': 'BTC/USD',
    'ETHUSD': 'ETH/USD',
    'ETHCASH': 'ETH/USD',
    'LTCUSD': 'LTC/USD',
    'XRPUSD': 'XRP/USD',
    'ADAUSD': 'ADA/USD',
    'DOTUSD': 'DOT/USD',
    
    // Forex - ensure proper format
    'USDCAD': 'USD/CAD',
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY',
    'AUDUSD': 'AUD/USD',
    'NZDUSD': 'NZD/USD',
    'EURGBP': 'EUR/GBP',
    'EURJPY': 'EUR/JPY',
    'GBPJPY': 'GBP/JPY',
    'AUDJPY': 'AUD/JPY',
  }
  
  // Check if symbol needs mapping
  if (symbolMap[symbolUpper]) {
    return symbolMap[symbolUpper]
  }
  
  // If symbol already contains '/', return as-is
  if (symbol.includes('/')) {
    return symbol
  }
  
  // Try to infer forex pair format (e.g., EURUSD -> EUR/USD)
  if (symbolUpper.length === 6 && !symbolUpper.includes('CASH') && !symbolUpper.includes('OIL')) {
    // Likely a forex pair without separator
    const base = symbolUpper.substring(0, 3)
    const quote = symbolUpper.substring(3, 6)
    // Only format if both parts look like currency codes
    if (base.length === 3 && quote.length === 3) {
      return `${base}/${quote}`
    }
  }
  
  // Return original symbol if no mapping found
  return symbol
}

/**
 * Sync trades for a specific account
 */
export async function syncAccountTrades(
  userId: string,
  accountLinkId: string,
  mt5AccountId: string,
  accountType: 'mt5' | 'copy-trading',
  startDate?: Date,
  endDate?: Date
): Promise<{ success: boolean; summary?: any; error?: string }> {
  try {
    // Verify the account belongs to the user
    const account = await getAccountByLinkId(userId, accountLinkId)
    if (!account) {
      throw new Error('Account not found or access denied')
    }

    // Incremental sync logic: determine date range
    let actualStartDate: Date | undefined = startDate
    let actualEndDate: Date | undefined = endDate
    let isIncrementalSync = false

    // If startDate is explicitly provided, use it (full sync mode)
    // Otherwise, implement incremental sync logic
    if (!actualStartDate) {
      // Check for lastSyncAt to determine incremental sync
      if (account.lastSyncAt) {
        // Convert lastSyncAt to Date if it's a string
        const lastSync = account.lastSyncAt instanceof Date 
          ? account.lastSyncAt 
          : new Date(account.lastSyncAt)
        
        actualStartDate = lastSync
        isIncrementalSync = true
        console.log(`[AccountSync] 🔄 Incremental sync: using lastSyncAt ${lastSync.toISOString()}`)
      } else {
        // First sync: default to last 7 days
        actualStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        console.log(`[AccountSync] 🆕 First sync: defaulting to last 7 days (${actualStartDate.toISOString()})`)
      }
    } else {
      console.log(`[AccountSync] 📅 Full sync: using provided startDate ${actualStartDate.toISOString()}`)
    }

    // Always use current time as endDate if not provided
    if (!actualEndDate) {
      actualEndDate = new Date()
    }

    console.log(`[AccountSync] 📊 Sync mode: ${isIncrementalSync ? 'INCREMENTAL' : 'FULL'}`)
    console.log(`[AccountSync] 📅 Date range: ${actualStartDate.toISOString()} to ${actualEndDate.toISOString()}`)

    // For copy trading accounts, get the MetaAPI account ID from the master strategy
    let actualAccountId = mt5AccountId
    if (accountType === 'copy-trading' && account.copyTradingAccountId) {
      const copyTradingAccounts = await listUserCopyTradingAccounts(userId)
      const copyAccount = copyTradingAccounts.find(acc => acc.accountId === account.copyTradingAccountId)
      
      if (!copyAccount) {
        throw new Error('Copy trading account not found')
      }

      // Get the MetaAPI account ID from the master strategy
      const { getMasterStrategy } = await import('./copyTradingRepo')
      const masterStrategy = await getMasterStrategy(copyAccount.strategyId)
      
      if (!masterStrategy) {
        throw new Error('Master strategy not found for copy trading account')
      }

      // Use the master strategy's accountId as the MetaAPI account ID
      actualAccountId = masterStrategy.accountId
    }

    if (!actualAccountId) {
      throw new Error('Account ID not found')
    }

    // Get MetaAPI token
    const token = process.env.METAAPI_TOKEN
    if (!token) {
      throw new Error('METAAPI_TOKEN not configured')
    }

    // Validate account access and get region URL
    let regionUrl: string | undefined = undefined
    try {
      const accountInfo = await getAccountInfo(actualAccountId, token)
      // Extract region URL from account info if available
      const { extractRegionUrlFromAccount } = await import('./metaapiRestClient')
      regionUrl = extractRegionUrlFromAccount(accountInfo) || undefined
    } catch (error) {
      console.error('Error validating account:', error)
      throw new Error('Failed to validate account access. Please check your MetaAPI account ID and token.')
    }

    // Get deals from MT5 (pass regionUrl if available)
    console.log(`[AccountSync] Starting to fetch deals for account ${actualAccountId}...`)
    const deals = await getDealsFromMT5(actualAccountId, token, actualStartDate, actualEndDate, regionUrl)
    console.log(`[AccountSync] ✅ Found ${deals.length} deals from MT5 for account ${accountLinkId}`)
    
    // Fetch order history to get SL/TP for closed positions
    let orderHistory: any[] = []
    try {
      console.log(`[AccountSync] 🔍 Fetching order history for SL/TP data...`)
      console.log(`[AccountSync] Date range: ${actualStartDate ? actualStartDate.toISOString() : 'all time'} to ${actualEndDate ? actualEndDate.toISOString() : 'now'}`)
      const apiInstance = await getMetaApiInstance(token)
      const account = await apiInstance.metatraderAccountApi.getAccount(actualAccountId)
      const connection = account.getRPCConnection()
      
      // Try to get order history via RPC connection
      if (connection.getHistoryOrders) {
        try {
          orderHistory = await connection.getHistoryOrders(actualStartDate, actualEndDate)
          console.log(`[AccountSync] ✅ Found ${orderHistory.length} orders from RPC connection`)
          if (orderHistory.length > 0) {
            console.log(`[AccountSync] 📋 Sample order structure:`, JSON.stringify(orderHistory[0], null, 2))
            // Log what fields are available in orders
            const sampleOrder = orderHistory[0]
            const availableFields = Object.keys(sampleOrder)
            console.log(`[AccountSync] 📋 Available fields in orders:`, availableFields.join(', '))
            // Check if SL/TP fields exist
            const hasStopLoss = availableFields.some(f => f.toLowerCase().includes('stop') || f.toLowerCase().includes('sl'))
            const hasTakeProfit = availableFields.some(f => f.toLowerCase().includes('take') || f.toLowerCase().includes('tp') || f.toLowerCase().includes('profit'))
            console.log(`[AccountSync] 📋 Order has SL field: ${hasStopLoss}, TP field: ${hasTakeProfit}`)
          }
        } catch (rpcError) {
          console.log('[AccountSync] ⚠️ RPC getHistoryOrders failed:', rpcError)
          console.log('[AccountSync] Trying REST API fallback...')
        }
      } else {
        console.log('[AccountSync] ⚠️ RPC connection does not have getHistoryOrders method')
      }
      
      // Fallback to REST API if RPC didn't work
      if (orderHistory.length === 0 && typeof window === 'undefined') {
        console.log('[AccountSync] 🔄 Trying REST API to fetch order history...')
        const { getHistoryOrders } = await import('./metaapiRestClient')
        orderHistory = await getHistoryOrders(actualAccountId, token, regionUrl, actualStartDate, actualEndDate)
        console.log(`[AccountSync] ✅ Found ${orderHistory.length} orders from REST API`)
        if (orderHistory.length > 0) {
          console.log(`[AccountSync] 📋 Sample REST API order structure:`, JSON.stringify(orderHistory[0], null, 2))
          const sampleOrder = orderHistory[0]
          const availableFields = Object.keys(sampleOrder)
          console.log(`[AccountSync] 📋 Available fields in REST orders:`, availableFields.join(', '))
        }
      }
      
      if (orderHistory.length === 0) {
        console.warn('[AccountSync] ⚠️ No order history found - SL/TP will not be available from orders')
      } else {
        console.log(`[AccountSync] ✅ Order history ready: ${orderHistory.length} orders available for SL/TP matching`)
      }
    } catch (orderError) {
      console.warn('[AccountSync] ❌ Could not fetch order history (non-critical):', orderError)
      if (orderError instanceof Error) {
        console.warn('[AccountSync] Error details:', orderError.message, orderError.stack)
      }
      // Continue without order history - SL/TP will be undefined
    }
    
    if (deals.length === 0) {
      console.warn(`[AccountSync] ⚠️ No deals found. This could mean:
        1. The account has no trades in the date range (${startDate ? startDate.toISOString() : 'last 90 days'} to ${endDate ? endDate.toISOString() : 'now'})
        2. The MetaAPI deals endpoint is not working correctly
        3. The account needs to be synchronized in MetaAPI first`)
    } else {
      console.log(`[AccountSync] Sample deal types:`, [...new Set(deals.map(d => d.entry))].join(', '))
      console.log(`[AccountSync] Sample symbols:`, [...new Set(deals.slice(0, 10).map(d => d.symbol))].join(', '))
    }

    let tradesImported = 0
    let tradesUpdated = 0
    const errors: string[] = []

    // Fetch open positions to get SL/TP data and create OPEN trades
    let openPositions: any[] = []
    try {
      const { getPositions } = await import('./metaapiRestClient')
      openPositions = await getPositions(actualAccountId, token, regionUrl)
      console.log(`[AccountSync] Found ${openPositions.length} open positions`)
    } catch (posError) {
      console.warn('[AccountSync] Could not fetch open positions (non-critical):', posError)
    }

    // Process open positions as OPEN trades
    for (const position of openPositions) {
      try {
        if (!position.symbol || !position.id) {
          continue
        }

        const normalizedSymbol = normalizeSymbol(position.symbol)
        const positionTicketId = String(position.id || position.ticket || '')
        
        if (!positionTicketId || positionTicketId === 'undefined') {
          continue
        }

        // Check if this position already exists as a trade
        const existingTrade = await checkDuplicateTrade(positionTicketId, userId, actualAccountId)
        
        if (!existingTrade) {
          // Create OPEN trade from position
          const openTrade: any = {
            pair: normalizedSymbol,
            type: position.type || 'BUY',
            status: 'OPEN',
            entryPrice: position.openPrice || 0,
            exitPrice: position.openPrice || 0, // Same as entry for open trades
            pips: 0, // Will be calculated when closed
            profit: position.profit || 0,
            rr: 0,
            risk: 0,
            lotSize: position.volume || 0,
            result: 0,
            date: position.time ? new Date(position.time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            time: position.time ? new Date(position.time).toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5),
            notes: position.comment || '',
            source: 'MT5_VIP',
            mt5TicketId: positionTicketId,
            mt5Commission: position.commission || 0,
            mt5Swap: position.swap || 0,
            syncMethod: 'api',
            importedAt: new Date(),
            accountId: actualAccountId,
            accountLinkId: accountLinkId,
            userId: userId,
            openTime: position.time ? new Date(position.time) : new Date(),
            // Store SL/TP for later use
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit
          }

          await saveAccountTrade(openTrade)
          tradesImported++
        }
      } catch (error) {
        console.warn('[AccountSync] Error processing open position:', error)
      }
    }

    // Group deals by positionId to aggregate data correctly
    const dealsByPosition = new Map<string, MT5Deal[]>()
    let dealsWithoutPositionId = 0
    for (const deal of deals) {
      const positionId = String(deal.positionId || deal.ticket || deal.id || '')
      if (positionId && positionId !== 'undefined') {
        if (!dealsByPosition.has(positionId)) {
          dealsByPosition.set(positionId, [])
        }
        dealsByPosition.get(positionId)!.push(deal)
      } else {
        dealsWithoutPositionId++
      }
    }
    
    console.log(`[AccountSync] Grouped ${deals.length} deals into ${dealsByPosition.size} positions`)
    console.log(`[AccountSync] Deals without positionId: ${dealsWithoutPositionId}`)
    
    // Log sample deal structure to understand field names
    if (deals.length > 0) {
      const sampleDeal = deals[0]
      console.log(`[AccountSync] Sample deal structure:`, {
        keys: Object.keys(sampleDeal),
        entry: sampleDeal.entry,
        type: sampleDeal.type,
        positionId: sampleDeal.positionId,
        ticket: sampleDeal.ticket,
        id: sampleDeal.id
      })
    }
    
    // Count entry vs exit deals - check multiple possible field names
    let totalEntryDeals = 0
    let totalExitDeals = 0
    for (const [posId, posDeals] of dealsByPosition) {
      // Check multiple possible field names for entry/exit
      const entryCount = posDeals.filter(d => {
        return d.entry === 'IN' || 
               ((d as any).entryType === 'DEAL_ENTRY_IN' || (d as any).entryType === 0) ||
               ((d as any).action && (d as any).action.includes('IN'))
      }).length
      const exitCount = posDeals.filter(d => {
        return d.entry === 'OUT' || 
               ((d as any).entryType === 'DEAL_ENTRY_OUT' || (d as any).entryType === 1) ||
               ((d as any).action && (d as any).action.includes('OUT'))
      }).length
      totalEntryDeals += entryCount
      totalExitDeals += exitCount
    }
    console.log(`[AccountSync] Total entry deals: ${totalEntryDeals}, Total exit deals: ${totalExitDeals}`)

    // Track which position IDs are currently open
    const openPositionIds = new Set(openPositions.map(p => String(p.id || p.ticket || '')))
    
    // Close trades that are OPEN but no longer in open positions
    if (openPositionIds.size < openPositions.length || openPositions.length === 0) {
      // Get all OPEN trades for this account and user
      const { query: q, where: w, getDocs: gd } = await import('firebase/firestore')
      const openTradesQuery = q(
        collection(db, 'trades'),
        w('userId', '==', userId),
        w('accountId', '==', actualAccountId),
        w('status', '==', 'OPEN'),
        w('source', '==', 'MT5_VIP')
      )
      const openTradesSnapshot = await gd(openTradesQuery)
      
      for (const tradeDoc of openTradesSnapshot.docs) {
        const tradeData = tradeDoc.data()
        const tradePositionId = String(tradeData.mt5TicketId || '')
        
        // If this trade's position ID is not in the current open positions, close it
        if (tradePositionId && !openPositionIds.has(tradePositionId)) {
          console.log(`[AccountSync] Closing trade that is no longer open: ${tradePositionId}`)
          const tradeRef = doc(db, 'trades', tradeDoc.id)
          await updateDoc(tradeRef, {
            status: 'CLOSED', // Default to CLOSED, will be updated when we process the actual close deal
            updatedAt: Timestamp.now()
          })
          tradesUpdated++
        }
      }
    }

    // Process each position (group of deals)
    let skippedOpenPositions = 0
    let processedClosedPositions = 0
    for (const [positionId, positionDeals] of dealsByPosition) {
      try {
        // Find entry and exit deals for this position
        // Check multiple possible field names for entry/exit
        const entryDeals = positionDeals.filter(d => {
          return d.entry === 'IN' || 
                 ((d as any).entryType === 'DEAL_ENTRY_IN' || (d as any).entryType === 0) ||
                 ((d as any).action && (d as any).action.includes('IN'))
        })
        const exitDeals = positionDeals.filter(d => {
          return d.entry === 'OUT' || 
                 ((d as any).entryType === 'DEAL_ENTRY_OUT' || (d as any).entryType === 1) ||
                 ((d as any).action && (d as any).action.includes('OUT'))
        })
        
        // Only process positions that have been closed (have exit deals)
        if (exitDeals.length === 0) {
          skippedOpenPositions++
          continue // Skip open positions - handled separately above
        }
        
        processedClosedPositions++

        // Get the first entry deal and last exit deal
        const entryDeal = entryDeals[0]
        const exitDeal = exitDeals[exitDeals.length - 1] // Use last exit deal (final close)
        
        if (!entryDeal || !exitDeal) {
          console.warn(`[AccountSync] Position ${positionId} missing entry or exit deal`)
          continue
        }

        // Aggregate profit, commission, and swap from ALL deals for this position
        const totalProfit = positionDeals.reduce((sum, d) => sum + (d.profit || 0), 0)
        const totalCommission = positionDeals.reduce((sum, d) => sum + (d.commission || 0), 0)
        const totalSwap = positionDeals.reduce((sum, d) => sum + (d.swap || 0), 0)

        // Validate required fields
        if (!entryDeal.symbol || !entryDeal.positionId) {
          console.warn(`[AccountSync] Skipping position - missing required fields:`, {
            symbol: entryDeal.symbol,
            positionId: entryDeal.positionId
          })
          continue
        }
        
        // Convert to trade format using aggregated data
        const trade = convertMT5DealToAccountTrade(
          exitDeal, 
          userId,
          accountLinkId,
          actualAccountId,
          accountType, 
          deals, 
          openPositions,
          entryDeal,
          totalProfit,
          totalCommission,
          totalSwap,
          orderHistory
        )
        
        // Validate trade has all required fields
        if (!trade.mt5TicketId || trade.mt5TicketId === 'undefined' || trade.mt5TicketId === 'null' || trade.mt5TicketId === '') {
          console.warn(`[AccountSync] Skipping trade - invalid ticket ID after conversion:`, { positionId, trade })
          continue
        }
        
        if (!trade.pair || trade.pair === 'UNKNOWN') {
          console.warn(`[AccountSync] Skipping trade - invalid pair:`, { positionId, trade })
          continue
        }
        
        console.log(`[AccountSync] Processing closed trade:`, {
          positionId,
          symbol: trade.pair,
          type: trade.type,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          profit: trade.profit,
          commission: trade.mt5Commission,
          swap: trade.mt5Swap,
          pips: trade.pips,
          status: trade.status,
          stopLoss: trade.stopLoss !== undefined ? trade.stopLoss : 'NOT_SET',
          takeProfit: trade.takeProfit !== undefined ? trade.takeProfit : 'NOT_SET',
          stopLossType: typeof trade.stopLoss,
          takeProfitType: typeof trade.takeProfit
        })
        
        // Check if trade already exists - try multiple ways to match
        // 1. Try by mt5TicketId (from exit deal)
        let existingTrade = await checkDuplicateTrade(trade.mt5TicketId, userId, actualAccountId)
        
        // 2. If not found, try by positionId (in case ticket IDs differ)
        if (!existingTrade && positionId) {
          // Query by positionId stored in mt5TicketId field
          const { query: q2, where: w2, getDocs: gd2 } = await import('firebase/firestore')
          const positionQuery = q2(
            collection(db, 'trades'),
            w2('mt5TicketId', '==', positionId),
            w2('userId', '==', userId),
            w2('accountId', '==', actualAccountId)
          )
          const positionSnapshot = await gd2(positionQuery)
          if (!positionSnapshot.empty) {
            const doc = positionSnapshot.docs[0]
            const data = doc.data()
            existingTrade = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate(),
              openTime: data.openTime?.toDate(),
              closeTime: data.closeTime?.toDate(),
              importedAt: data.importedAt?.toDate()
            } as Trade
          }
        }
        
        if (existingTrade) {
          // Update existing trade
          await updateAccountTrade(existingTrade.id, trade)
          tradesUpdated++
        } else {
          // Create new trade
          await saveAccountTrade(trade)
          tradesImported++
        }
        
        // ALSO save to mt5_trade_history for closed trades page and analytics
        try {
          await saveToTradeHistory(
            exitDeal, 
            actualAccountId, 
            userId, 
            deals, 
            openPositions, 
            entryDeal, 
            totalProfit, 
            totalCommission, 
            totalSwap, 
            orderHistory,
            // Only pass SL/TP if they were successfully extracted (not undefined)
            // This allows saveToTradeHistory to try its own extraction if needed
            trade.stopLoss !== undefined ? trade.stopLoss : undefined,
            trade.takeProfit !== undefined ? trade.takeProfit : undefined
          )
        } catch (historyError) {
          console.warn('[AccountSync] Failed to save to trade history (non-critical):', historyError)
        }
      } catch (error) {
        const errorMsg = `Error processing position ${positionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error('[AccountSync]', errorMsg, error)
      }
    }

    console.log(`[AccountSync] Processing summary:`)
    console.log(`  - Total deals fetched: ${deals.length}`)
    console.log(`  - Positions grouped: ${dealsByPosition.size}`)
    console.log(`  - Closed positions processed: ${processedClosedPositions}`)
    console.log(`  - Open positions skipped: ${skippedOpenPositions}`)
    console.log(`  - Trades imported: ${tradesImported}`)
    console.log(`  - Trades updated: ${tradesUpdated}`)
    console.log(`  - Errors: ${errors.length}`)
    
    if (errors.length > 0) {
      console.warn(`[AccountSync] Errors encountered:`, errors.slice(0, 5)) // Log first 5 errors
    }

    // Update lastSyncAt timestamp after successful sync
    try {
      const syncTime = actualEndDate || new Date()
      await updateLastSyncAt(userId, accountLinkId, syncTime)
      console.log(`[AccountSync] ✅ Updated lastSyncAt to ${syncTime.toISOString()}`)
    } catch (syncTimeError) {
      console.warn(`[AccountSync] ⚠️ Failed to update lastSyncAt (non-critical):`, syncTimeError)
      // Don't fail the entire sync if updating timestamp fails
    }

    return {
      success: true,
      summary: {
        totalDeals: deals.length,
        tradesImported,
        tradesUpdated,
        errors: errors.length,
        accountType,
        syncMode: isIncrementalSync ? 'incremental' : 'full',
        dateRange: {
          start: actualStartDate?.toISOString(),
          end: actualEndDate?.toISOString()
        }
      }
    }
  } catch (error) {
    console.error('[AccountSync] Error syncing account trades:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get all deals in batches (for "all time" sync)
 * Fetches deals in 1-year batches to avoid API limits
 */
async function getAllDealsInBatches(
  accountId: string,
  token: string,
  regionUrl?: string
): Promise<MT5Deal[]> {
  const allDeals: MT5Deal[] = []
  const now = new Date()
  const batchSizeDays = 365 // Fetch 1 year at a time
  let batchNumber = 1
  
  // Start from 5 years ago and work backwards
  let currentEnd = now
  let currentStart = new Date(now.getTime() - (batchSizeDays * 24 * 60 * 60 * 1000))
  
  console.log(`[AccountSync] Starting batch fetch from ${currentStart.toISOString()} to ${currentEnd.toISOString()}`)
  
  // Safety limit: don't go back more than 10 years
  const tenYearsAgo = new Date(now.getTime() - (10 * 365 * 24 * 60 * 60 * 1000))
  
  while (currentStart >= tenYearsAgo) {
    try {
      console.log(`[AccountSync] Fetching batch ${batchNumber}: ${currentStart.toISOString()} to ${currentEnd.toISOString()}`)
      
      // Call the actual getDealsFromMT5 implementation directly (not recursively)
      const apiInstance = await getMetaApiInstance(token)
      const account = await apiInstance.metatraderAccountApi.getAccount(accountId)
      const connection = account.getRPCConnection()
      
      let batchDeals: MT5Deal[] = []
      
      // Try RPC connection first
      try {
        if (!connection.connected) {
          try {
            await connection.connect()
            await account.waitSynchronized()
          } catch (connectError) {
            console.log('[AccountSync] RPC connection not available for batch fetch')
          }
        }
        
        if (connection.getDeals) {
          batchDeals = await connection.getDeals(currentStart, currentEnd)
        }
      } catch (rpcError) {
        console.log('[AccountSync] RPC getDeals failed in batch fetch, trying REST API')
      }
      
      // Fallback to REST API
      if (batchDeals.length === 0 && typeof window === 'undefined') {
        const { getDeals } = await import('./metaapiRestClient')
        batchDeals = await getDeals(accountId, token, regionUrl, currentStart, currentEnd)
      }
      
      if (batchDeals.length === 0) {
        console.log(`[AccountSync] No more deals found in batch ${batchNumber}, stopping batch fetch`)
        break
      }
      
      allDeals.push(...batchDeals)
      console.log(`[AccountSync] Batch ${batchNumber}: Found ${batchDeals.length} deals (Total: ${allDeals.length})`)
      
      // Move to previous batch (go backwards in time)
      currentEnd = new Date(currentStart.getTime() - 1) // End of previous batch
      currentStart = new Date(currentEnd.getTime() - (batchSizeDays * 24 * 60 * 60 * 1000))
      batchNumber++
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`[AccountSync] Error fetching batch ${batchNumber}:`, error)
      // Continue with next batch even if one fails
      currentEnd = new Date(currentStart.getTime() - 1)
      currentStart = new Date(currentEnd.getTime() - (batchSizeDays * 24 * 60 * 60 * 1000))
      batchNumber++
      
      // Safety check
      if (currentStart < tenYearsAgo) {
        break
      }
    }
  }
  
  console.log(`[AccountSync] ✅ Completed batch fetch: ${allDeals.length} total deals from ${batchNumber - 1} batches`)
  return allDeals
}

/**
 * Get deals from MT5 account
 */
async function getDealsFromMT5(
  accountId: string,
  token: string,
  startDate?: Date,
  endDate?: Date,
  regionUrl?: string
): Promise<MT5Deal[]> {
  try {
    // Handle "all time" sync by fetching in batches
    if (!startDate && !endDate) {
      console.log(`[AccountSync] Fetching all available deals (all time) - will fetch in batches`)
      return await getAllDealsInBatches(accountId, token, regionUrl)
    }
    
    // Use default date range if not provided (last 365 days to get more historical data)
    const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const end = endDate || new Date()
    
    console.log(`[AccountSync] Fetching deals from ${start.toISOString()} to ${end.toISOString()} (${Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))} days)`)

    // Use SDK's RPC connection for both server-side and client-side
    // MetaAPI doesn't expose deals via REST API, only via RPC connection
    const apiInstance = await getMetaApiInstance(token)
    const account = await apiInstance.metatraderAccountApi.getAccount(accountId)
    const connection = account.getRPCConnection()
    
    // Try to get deals via RPC connection
    // For server-side, the RPC connection wrapper will use REST API fallback
    try {
      if (!connection.connected) {
        // Try to connect (may fail on server-side, that's OK)
        try {
          await connection.connect()
          await account.waitSynchronized()
        } catch (connectError) {
          console.log('[AccountSync] RPC connection not available, using REST API fallback')
        }
      }

      // Try to get deals via RPC connection
      if (connection.getDeals) {
        console.log('[AccountSync] Attempting to get deals via RPC connection...')
        const deals = await connection.getDeals(start, end)
        if (deals && deals.length > 0) {
          console.log(`[AccountSync] ✅ Successfully fetched ${deals.length} deals via RPC connection`)
          return deals
        } else {
          console.log(`[AccountSync] RPC connection returned ${deals?.length || 0} deals`)
        }
      } else {
        console.log('[AccountSync] RPC connection does not have getDeals method')
      }
    } catch (rpcError) {
      console.log('[AccountSync] RPC getDeals failed, trying REST API fallback:', rpcError instanceof Error ? rpcError.message : 'Unknown error')
    }

    // Fallback to REST API (though it may not work for deals)
    if (typeof window === 'undefined') {
      console.log('[AccountSync] Attempting to get deals via REST API...')
      const { getDeals } = await import('./metaapiRestClient')
      const restDeals = await getDeals(accountId, token, regionUrl, start, end)
      if (restDeals && restDeals.length > 0) {
        console.log(`[AccountSync] ✅ Successfully fetched ${restDeals.length} deals via REST API`)
        return restDeals
      } else {
        console.log(`[AccountSync] REST API returned ${restDeals?.length || 0} deals`)
      }
    }

    // If both fail, return empty array (no deals found or endpoints not available)
    console.warn('[AccountSync] ⚠️ Could not fetch deals via RPC or REST API. This could mean:')
    console.warn('  1. The account has no trades in the specified date range')
    console.warn('  2. The MetaAPI deals endpoint is not working correctly')
    console.warn('  3. The account needs to be synchronized in MetaAPI dashboard first')
    console.warn('  4. The account may need to be deployed and connected in MetaAPI')
    return []
  } catch (error) {
    console.error('[AccountSync] Error getting deals from MT5:', error)
    // Don't throw - return empty array instead
    return []
  }
}

/**
 * Convert MT5 deal to account Trade format
 */
function convertMT5DealToAccountTrade(
  deal: MT5Deal,
  userId: string,
  accountLinkId: string,
  accountId: string,
  accountType: 'mt5' | 'copy-trading' | null,
  allDeals: MT5Deal[],
  openPositions?: any[],
  entryDeal?: MT5Deal,
  totalProfit?: number,
  totalCommission?: number,
  totalSwap?: number,
  orderHistory?: any[]
): Omit<Trade, 'id' | 'createdAt' | 'updatedAt'> {
  const isBuy = deal.type === 'BUY'
  // Check multiple possible field names for entry/exit
  const isEntry = deal.entry === 'IN' || 
                  ((deal as any).entryType === 'DEAL_ENTRY_IN' || (deal as any).entryType === 0) ||
                  ((deal as any).action && (deal as any).action.includes('IN'))
  
  // Use provided entryDeal or find it
  let finalEntryDeal: MT5Deal | undefined = entryDeal
  let entryPrice = deal.price
  let exitPrice = deal.price
  let openTime: Date | undefined = undefined
  let closeTime: Date | undefined = undefined
  
  // For exit deals, find matching entry deal if not provided
  if (!isEntry && !finalEntryDeal) {
    // This is an exit deal - find the matching entry deal
    finalEntryDeal = allDeals.find(d => {
      const isEntryDeal = d.entry === 'IN' || 
                          ((d as any).entryType === 'DEAL_ENTRY_IN' || (d as any).entryType === 0) ||
                          ((d as any).action && (d as any).action.includes('IN'))
      return d.positionId === deal.positionId && 
             isEntryDeal &&
             d.symbol === deal.symbol
    })
  }
  
  if (finalEntryDeal) {
    entryPrice = finalEntryDeal.price
    exitPrice = deal.price
    
    // Parse entry time
    try {
      if (finalEntryDeal.timeMsc && !isNaN(parseInt(finalEntryDeal.timeMsc))) {
        openTime = new Date(parseInt(finalEntryDeal.timeMsc))
      } else if (finalEntryDeal.time) {
        openTime = new Date(finalEntryDeal.time)
      }
    } catch (e) {
      // Ignore
    }
    
    // Parse exit time
    try {
      if (deal.timeMsc && !isNaN(parseInt(deal.timeMsc))) {
        closeTime = new Date(parseInt(deal.timeMsc))
      } else if (deal.time) {
        closeTime = new Date(deal.time)
      }
    } catch (e) {
      // Ignore
    }
  }
  
  // Try to find position data for SL/TP
  // First try open positions, then try to get from entry deal's position if available
  let stopLoss: number | undefined = undefined
  let takeProfit: number | undefined = undefined
  
  // Try to get SL/TP from open positions first
  if (openPositions && deal.positionId) {
    const position = openPositions.find(p => 
      String(p.id) === String(deal.positionId) || 
      String(p.ticket) === String(deal.positionId) ||
      String(p.id) === String(deal.positionId)
    )
    if (position && (position.stopLoss !== undefined || position.takeProfit !== undefined)) {
      stopLoss = position.stopLoss
      takeProfit = position.takeProfit
    }
  }
  
  // If we still don't have SL/TP and we have an entry deal, try to get from entry deal's position
  // (This is a fallback - MetaAPI deals don't contain SL/TP directly)
  // Check for undefined specifically (0 is a valid value)
  if ((stopLoss === undefined || takeProfit === undefined) && finalEntryDeal && deal.positionId) {
    // Try to find the position in openPositions using the entry deal's positionId
    if (openPositions) {
      const entryPosition = openPositions.find(p => 
        String(p.id) === String(finalEntryDeal.positionId) || 
        String(p.ticket) === String(finalEntryDeal.positionId)
      )
      if (entryPosition && (entryPosition.stopLoss !== undefined || entryPosition.takeProfit !== undefined)) {
        if (stopLoss === undefined) stopLoss = entryPosition.stopLoss
        if (takeProfit === undefined) takeProfit = entryPosition.takeProfit
      }
    }
  }
  
  // Try to get SL/TP from order history (for closed positions)
  // Check for undefined specifically (0 is a valid value)
  if ((stopLoss === undefined || takeProfit === undefined) && orderHistory && orderHistory.length > 0) {
    const positionIdStr = String(deal.positionId || finalEntryDeal?.positionId || '')
    const ticketStr = String(deal.ticket || deal.id || finalEntryDeal?.ticket || '')
    
    console.log(`[AccountSync] 🔍 Attempting to match order for positionId: ${positionIdStr}, ticket: ${ticketStr}`)
    console.log(`[AccountSync] 🔍 Searching through ${orderHistory.length} orders...`)
    
    // Match order by positionId or ticket
    const matchingOrder = orderHistory.find((order: any) => {
      const orderPositionId = String(order.positionId || order.position || order.positionId || '')
      const orderTicket = String(order.ticket || order.id || order.order || order.deal || '')
      const matches = (positionIdStr && orderPositionId && orderPositionId === positionIdStr) ||
                      (ticketStr && orderTicket && orderTicket === ticketStr)
      
      if (matches) {
        console.log(`[AccountSync] ✅ Found matching order!`, {
          orderPositionId,
          orderTicket,
          orderKeys: Object.keys(order)
        })
      }
      
      return matches
    })
    
    if (matchingOrder) {
      console.log(`[AccountSync] 📋 Matching order data:`, JSON.stringify(matchingOrder, null, 2))
      
      // Extract SL/TP from order (check multiple field name variations)
      const slFields = ['stopLoss', 'sl', 'stop_loss', 'stopLossPrice', 'stopLossValue', 'stop', 'stopPrice']
      const tpFields = ['takeProfit', 'tp', 'take_profit', 'takeProfitPrice', 'takeProfitValue', 'take', 'takePrice', 'profit']
      
      // Try to find SL (only if not already set)
      if (stopLoss === undefined) {
        for (const field of slFields) {
          const fieldValue = matchingOrder[field]
          // Exclude 0, undefined, and null - treat 0 as "not set"
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
            stopLoss = Number(fieldValue)
            console.log(`[AccountSync] ✅ Found stopLoss from field '${field}': ${stopLoss}`)
            break
          }
        }
      }
      
      // Try to find TP (only if not already set)
      if (takeProfit === undefined) {
        for (const field of tpFields) {
          const fieldValue = matchingOrder[field]
          // Exclude 0, undefined, and null - treat 0 as "not set"
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
            takeProfit = Number(fieldValue)
            console.log(`[AccountSync] ✅ Found takeProfit from field '${field}': ${takeProfit}`)
            break
          }
        }
      }
      
      if (stopLoss !== undefined || takeProfit !== undefined) {
        console.log(`[AccountSync] ✅ Successfully extracted SL/TP from order history: SL=${stopLoss !== undefined ? stopLoss : 'N/A'}, TP=${takeProfit !== undefined ? takeProfit : 'N/A'} for position ${positionIdStr}`)
      } else {
        console.warn(`[AccountSync] ⚠️ Matching order found but no SL/TP fields detected. Order fields:`, Object.keys(matchingOrder))
      }
    } else {
      console.warn(`[AccountSync] ⚠️ No matching order found for positionId: ${positionIdStr}, ticket: ${ticketStr}`)
      // Log sample orders for debugging
      if (orderHistory.length > 0) {
        console.log(`[AccountSync] 📋 Sample order IDs for reference:`, orderHistory.slice(0, 3).map((o: any) => ({
          positionId: o.positionId || o.position,
          ticket: o.ticket || o.id || o.order,
          symbol: o.symbol || o.instrument
        })))
      }
    }
  } else if (stopLoss === undefined || takeProfit === undefined) {
    if (!orderHistory || orderHistory.length === 0) {
      console.log(`[AccountSync] ℹ️ No order history available for SL/TP extraction (positionId: ${deal.positionId || finalEntryDeal?.positionId || 'N/A'})`)
    } else {
      console.log(`[AccountSync] ℹ️ Order history available but SL/TP already found from positions (positionId: ${deal.positionId || finalEntryDeal?.positionId || 'N/A'})`)
    }
  }
  
  // Try to get SL/TP directly from deals if available (fallback)
  // Exclude 0 values - treat 0 as "not set"
  if ((stopLoss === undefined || takeProfit === undefined) && deal) {
    const dealSlFields = ['stopLoss', 'sl', 'stop_loss', 'stopLossPrice']
    const dealTpFields = ['takeProfit', 'tp', 'take_profit', 'takeProfitPrice']
    
    if (stopLoss === undefined) {
      for (const field of dealSlFields) {
        const fieldValue = deal[field]
        // Exclude 0, undefined, and null - treat 0 as "not set"
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
          stopLoss = Number(fieldValue)
          console.log(`[AccountSync] ✅ Found stopLoss from deal field '${field}': ${stopLoss}`)
          break
        }
      }
    }
    
    if (takeProfit === undefined) {
      for (const field of dealTpFields) {
        const fieldValue = deal[field]
        // Exclude 0, undefined, and null - treat 0 as "not set"
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
          takeProfit = Number(fieldValue)
          console.log(`[AccountSync] ✅ Found takeProfit from deal field '${field}': ${takeProfit}`)
          break
        }
      }
    }
  }
  
  // Try to get SL/TP from entry deal if still missing
  if (finalEntryDeal && (stopLoss === undefined || takeProfit === undefined)) {
    const entrySlFields = ['stopLoss', 'sl', 'stop_loss', 'stopLossPrice']
    const entryTpFields = ['takeProfit', 'tp', 'take_profit', 'takeProfitPrice']
    
    if (stopLoss === undefined) {
      for (const field of entrySlFields) {
        const fieldValue = finalEntryDeal[field]
        // Exclude 0, undefined, and null - treat 0 as "not set"
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
          stopLoss = Number(fieldValue)
          console.log(`[AccountSync] ✅ Found stopLoss from entry deal field '${field}': ${stopLoss}`)
          break
        }
      }
    }
    
    if (takeProfit === undefined) {
      for (const field of entryTpFields) {
        const fieldValue = finalEntryDeal[field]
        // Exclude 0, undefined, and null - treat 0 as "not set"
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
          takeProfit = Number(fieldValue)
          console.log(`[AccountSync] ✅ Found takeProfit from entry deal field '${field}': ${takeProfit}`)
          break
        }
      }
    }
  }
  
  // Normalize symbol to standard format FIRST (before calculating pips)
  const normalizedSymbol = normalizeSymbol(deal.symbol)
  
  // Parse time correctly - use closeTime if available (for exit deals), otherwise parse from deal
  let dealTime: Date
  if (closeTime) {
    dealTime = closeTime
  } else {
    try {
      if (deal.timeMsc && !isNaN(parseInt(deal.timeMsc))) {
        dealTime = new Date(parseInt(deal.timeMsc))
      } else if (deal.time) {
        dealTime = new Date(deal.time)
      } else {
        dealTime = new Date() // Fallback to current time
      }
      
      // Validate the date
      if (isNaN(dealTime.getTime())) {
        dealTime = new Date() // Fallback if invalid
      }
    } catch (error) {
      console.warn('[AccountSync] Error parsing deal time, using current time:', error)
      dealTime = new Date()
    }
  }
  
  const dateStr = dealTime.toISOString().split('T')[0]
  const timeStr = dealTime.toTimeString().slice(0, 5)

  // Get ticket ID - use ticket, id, or positionId as fallback
  const ticketId = String(deal.ticket || deal.id || deal.positionId || deal.order || '')
  
  // Ensure all numeric fields have valid values
  // Use aggregated totals if provided, otherwise use single deal values
  const entryPriceValue = entryPrice && !isNaN(entryPrice) ? entryPrice : 0
  const exitPriceValue = exitPrice && !isNaN(exitPrice) ? exitPrice : 0
  const profitValue = (totalProfit !== undefined && totalProfit !== null && !isNaN(totalProfit)) 
    ? totalProfit 
    : ((deal.profit !== undefined && deal.profit !== null && !isNaN(deal.profit)) ? deal.profit : 0)
  const volumeValue = (finalEntryDeal?.volume !== undefined && finalEntryDeal.volume !== null && !isNaN(finalEntryDeal.volume)) 
    ? finalEntryDeal.volume 
    : ((deal.volume !== undefined && deal.volume !== null && !isNaN(deal.volume)) ? deal.volume : 0)
  const commissionValue = (totalCommission !== undefined && totalCommission !== null && !isNaN(totalCommission))
    ? totalCommission
    : ((deal.commission !== undefined && deal.commission !== null && !isNaN(deal.commission)) ? deal.commission : 0)
  const swapValue = (totalSwap !== undefined && totalSwap !== null && !isNaN(totalSwap))
    ? totalSwap
    : ((deal.swap !== undefined && deal.swap !== null && !isNaN(deal.swap)) ? deal.swap : 0)
  
  // Calculate pips using normalized symbol - for exit deals
  // Always calculate pips for closed trades, even if prices are very close (they might be slightly different)
  // SIMPLIFIED: Calculate magnitude from prices, then apply profit sign directly (profit is the source of truth)
  let pips = 0
  if (!isEntry && finalEntryDeal && entryPriceValue > 0 && exitPriceValue > 0) {
    try {
      // Calculate raw pips magnitude from price difference
      const rawPips = calculatePips(entryPriceValue, exitPriceValue, normalizedSymbol, false)
      const pipsMagnitude = Math.abs(rawPips)
      
      // CRITICAL: Profit sign is the ONLY source of truth for pips sign
      // If profit is negative, pips MUST be negative (and vice versa)
      if (profitValue !== 0) {
        const profitSign = profitValue > 0 ? 1 : -1
        pips = pipsMagnitude * profitSign
      } else {
        pips = 0
      }
      
      // If pips is 0 but prices are different, log for debugging
      if (pips === 0 && Math.abs(entryPriceValue - exitPriceValue) > 0.0001) {
        console.warn(`[AccountSync] Pips calculated as 0 but prices differ: entry=${entryPriceValue}, exit=${exitPriceValue}, symbol=${normalizedSymbol}`)
      }
    } catch (error) {
      console.error(`[AccountSync] Error calculating pips:`, error, {
        entryPrice: entryPriceValue,
        exitPrice: exitPriceValue,
        symbol: normalizedSymbol
      })
      pips = 0
    }
  }
  
  // Determine trade status automatically based on aggregated profit
  // Exit deals are always closed (CLOSED, LOSS, or BREAKEVEN)
  let status: 'OPEN' | 'CLOSED' | 'CLOSE' | 'LOSS' | 'BREAKEVEN' = 'OPEN'
  if (!isEntry) {
    // Automatically set status based on total profit (aggregated)
    if (profitValue > 0) {
      status = 'CLOSED'
    } else if (profitValue < 0) {
      status = 'LOSS'
    } else {
      status = 'BREAKEVEN'
    }
  }
  
  // Calculate Risk:Reward ratio using the proper function from mt5TradeHistoryService
  let rr = 0
  if (stopLoss && takeProfit && entryPriceValue) {
    try {
      const calculatedRR = calculateRiskReward(
        isBuy ? 'BUY' : 'SELL',
        entryPriceValue,
        stopLoss,
        takeProfit
      )
      if (calculatedRR !== null && calculatedRR !== undefined) {
        rr = calculatedRR
      }
    } catch (error) {
      console.warn('[AccountSync] Error calculating R:R, using fallback:', error)
      // Fallback calculation
      const risk = Math.abs(entryPriceValue - stopLoss)
      const reward = Math.abs(takeProfit - entryPriceValue)
      if (risk > 0) {
        rr = reward / risk
      }
    }
  }
  
  // Calculate duration in seconds if we have both open and close times
  let duration = 0
  if (openTime && closeTime) {
    duration = Math.floor((closeTime.getTime() - openTime.getTime()) / 1000)
  }
  
  // Build trade object without undefined fields
  // Pips already has correct sign (set directly from profit sign above)
  const tradeData: any = {
    pair: normalizedSymbol,
    type: isBuy ? 'BUY' : 'SELL',
    status, // Automatically set based on profit
    entryPrice: entryPriceValue,
    exitPrice: exitPriceValue,
    pips: Math.round(pips), // Pips sign matches profit sign (set above)
    profit: profitValue, // Real profit from API
    rr: rr, // Calculated from SL/TP or pips
    risk: 0, // Can be calculated from SL if needed
    lotSize: volumeValue, // Real volume from API
    result: Math.round(pips), // Same as pips for result
    date: dateStr,
    time: timeStr,
    notes: deal.comment || '',
    source: 'MT5_VIP', // Both MT5 and copy trading accounts use MT5_VIP source
    mt5TicketId: ticketId,
    mt5Commission: commissionValue, // Real commission from API
    mt5Swap: swapValue, // Real swap from API
    syncMethod: 'api',
    importedAt: new Date(),
    accountId: accountId,
    accountLinkId: accountLinkId,
    userId: userId,
    // Include SL/TP - keep undefined if not found (don't default to 0 yet)
    stopLoss: stopLoss,
    takeProfit: takeProfit,
    // Include duration
    duration: duration
  }
  
  // Only include openTime/closeTime if they have values (Firestore rejects undefined)
  if (openTime) {
    tradeData.openTime = openTime
  }
  if (closeTime) {
    tradeData.closeTime = closeTime
  }
  
  return tradeData
}

/**
 * Save account trade to Firebase
 */
async function saveAccountTrade(trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  // Remove undefined values before saving (Firestore rejects undefined)
  const tradeData: any = {
    ...trade,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    // Ensure SL/TP are always defined (0 if not set, matching admin section)
    stopLoss: trade.stopLoss !== undefined ? trade.stopLoss : 0,
    takeProfit: trade.takeProfit !== undefined ? trade.takeProfit : 0
  }
  
  // Remove undefined fields
  Object.keys(tradeData).forEach(key => {
    if (tradeData[key] === undefined) {
      delete tradeData[key]
    }
  })
  
  await addDoc(collection(db, 'trades'), tradeData)
  console.log(`[AccountSync] Saved trade: ${trade.pair} ${trade.type} - Ticket: ${trade.mt5TicketId}`)
}

/**
 * Update existing account trade
 */
async function updateAccountTrade(tradeId: string, trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const tradeRef = doc(db, 'trades', tradeId)
  const updateData: any = {
    ...trade,
    updatedAt: Timestamp.now(),
    // Ensure SL/TP are always defined (0 if not set, matching admin section)
    stopLoss: trade.stopLoss !== undefined ? trade.stopLoss : 0,
    takeProfit: trade.takeProfit !== undefined ? trade.takeProfit : 0
  }
  
  // Remove undefined fields (Firestore rejects undefined)
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key]
    }
  })
  
  await updateDoc(tradeRef, updateData)
  console.log(`[AccountSync] Updated trade: ${tradeId}`)
}

/**
 * Check for duplicate trade
 */
async function checkDuplicateTrade(mt5TicketId: string, userId: string, accountId: string): Promise<Trade | null> {
  try {
    // Validate inputs - don't query with invalid values
    if (!mt5TicketId || mt5TicketId === 'undefined' || mt5TicketId === 'null' || mt5TicketId === '') {
      return null
    }
    
    if (!userId || userId === 'undefined' || userId === 'null' || userId === '') {
      return null
    }
    
    if (!accountId || accountId === 'undefined' || accountId === 'null' || accountId === '') {
      return null
    }
    
    const q = query(
      collection(db, 'trades'),
      where('mt5TicketId', '==', mt5TicketId),
      where('userId', '==', userId),
      where('accountId', '==', accountId)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0]
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      openTime: data.openTime?.toDate(),
      closeTime: data.closeTime?.toDate(),
      importedAt: data.importedAt?.toDate()
    } as Trade
  } catch (error) {
    console.error('[AccountSync] Error checking duplicate trade:', error)
    return null
  }
}

/**
 * Save deal to mt5_trade_history collection for closed trades page and analytics
 * This ensures closed trades page and analytics can see the data
 */
async function saveToTradeHistory(
  deal: MT5Deal, 
  accountId: string, 
  userId: string, 
  allDeals: MT5Deal[], 
  openPositions?: any[],
  entryDeal?: MT5Deal,
  totalProfit?: number,
  totalCommission?: number,
  totalSwap?: number,
  orderHistory?: any[],
  extractedStopLoss?: number,
  extractedTakeProfit?: number
): Promise<void> {
  try {
    // Log received parameters at the very start
    console.log(`[AccountSync] [TradeHistory] 🔍 saveToTradeHistory called with:`, {
      positionId: deal.positionId || deal.ticket || deal.id,
      extractedStopLoss: extractedStopLoss !== undefined ? extractedStopLoss : 'NOT PROVIDED',
      extractedTakeProfit: extractedTakeProfit !== undefined ? extractedTakeProfit : 'NOT PROVIDED',
      extractedStopLossType: typeof extractedStopLoss,
      extractedTakeProfitType: typeof extractedTakeProfit
    })
    // Only save position close deals (entry = 'OUT')
    // Entry deals (entry = 'IN') are not closed trades yet
    // Check multiple possible field names for entry/exit
    const isExitDeal = deal.entry === 'OUT' || 
                       ((deal as any).entryType === 'DEAL_ENTRY_OUT' || (deal as any).entryType === 1) ||
                       ((deal as any).action && (deal as any).action.includes('OUT'))
    if (!isExitDeal) {
      return // Skip entry deals
    }
    
    // Validate required fields
    if (!deal.symbol || (!deal.positionId && !deal.ticket && !deal.id && !deal.order)) {
      console.warn('[AccountSync] Skipping trade history save - missing required fields:', deal)
      return
    }
    
    // Check if this trade already exists in history
    const { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('./firebaseConfig')
    
    // Get position ID - use positionId, ticket, id, or order as fallback
    const positionId = String(deal.positionId || deal.ticket || deal.id || deal.order || '')
    if (!positionId || positionId === 'undefined' || positionId === 'null' || positionId === '') {
      console.warn('[AccountSync] Skipping trade history save - no valid position ID:', deal)
      return
    }
    
    // Normalize symbol
    const normalizedSymbol = normalizeSymbol(deal.symbol)
    const existingQuery = query(
      collection(db, 'mt5_trade_history'),
      where('positionId', '==', positionId),
      where('accountId', '==', accountId)
    )
    
    // Store existing doc reference for potential update
    let existingDoc: any = null
    let existingStopLoss: number = 0
    let existingTakeProfit: number = 0
    
    const existingDocs = await getDocs(existingQuery)
    if (!existingDocs.empty) {
      // Trade already exists - check if we need to update SL/TP
      existingDoc = existingDocs.docs[0]
      const existingData = existingDoc.data()
      existingStopLoss = existingData.stopLoss || 0
      existingTakeProfit = existingData.takeProfit || 0
      
      // Check if we have extracted SL/TP values to potentially update with
      // We'll extract them later in the function, but for now just check if we should proceed
      // If existing record has both SL and TP (non-zero), skip update
      // Otherwise, we'll continue to extract and update if we find better values
      const hasExistingSLTP = (existingStopLoss && existingStopLoss !== 0) || (existingTakeProfit && existingTakeProfit !== 0)
      
      if (hasExistingSLTP) {
        console.log(`[AccountSync] [TradeHistory] Trade already exists with SL/TP, skipping update:`, {
          positionId,
          existingStopLoss,
          existingTakeProfit
        })
        return
      } else {
        console.log(`[AccountSync] [TradeHistory] Trade exists but missing SL/TP, will update if found:`, {
          positionId,
          existingStopLoss,
          existingTakeProfit,
          docId: existingDoc.id
        })
        // Continue to extraction logic below - we'll update the existing doc if we find SL/TP
      }
    }
    
    // Use provided entryDeal or find it
    const finalEntryDeal = entryDeal || allDeals.find(d => {
      const isEntryDeal = d.entry === 'IN' || 
                          ((d as any).entryType === 'DEAL_ENTRY_IN' || (d as any).entryType === 0) ||
                          ((d as any).action && (d as any).action.includes('IN'))
      return d.positionId === deal.positionId && 
             isEntryDeal &&
             d.symbol === deal.symbol
    })
    
    // Calculate basic trade data
    const isBuy = deal.type === 'BUY'
    const type = isBuy ? 'BUY' : 'SELL'
    
    // Parse time correctly
    let closeTime: Date
    try {
      if (deal.timeMsc && !isNaN(parseInt(deal.timeMsc))) {
        closeTime = new Date(parseInt(deal.timeMsc))
      } else if (deal.time) {
        closeTime = new Date(deal.time)
      } else {
        closeTime = new Date()
      }
      if (isNaN(closeTime.getTime())) closeTime = new Date()
    } catch (error) {
      closeTime = new Date()
    }
    
    let openTime: Date
    if (finalEntryDeal) {
      try {
        if (finalEntryDeal.timeMsc && !isNaN(parseInt(finalEntryDeal.timeMsc))) {
          openTime = new Date(parseInt(finalEntryDeal.timeMsc))
        } else if (finalEntryDeal.time) {
          openTime = new Date(finalEntryDeal.time)
        } else {
          openTime = closeTime
        }
        if (isNaN(openTime.getTime())) openTime = closeTime
      } catch (error) {
        openTime = closeTime
      }
    } else {
      openTime = closeTime
    }
    
    // Use aggregated totals if provided, otherwise use single deal values
    const openPriceValue = (finalEntryDeal?.price !== undefined && finalEntryDeal.price !== null && !isNaN(finalEntryDeal.price)) 
      ? finalEntryDeal.price 
      : ((deal.price !== undefined && deal.price !== null && !isNaN(deal.price)) ? deal.price : 0)
    const closePriceValue = (deal.price !== undefined && deal.price !== null && !isNaN(deal.price)) ? deal.price : 0
    const volumeValue = (finalEntryDeal?.volume !== undefined && finalEntryDeal.volume !== null && !isNaN(finalEntryDeal.volume))
      ? finalEntryDeal.volume
      : ((deal.volume !== undefined && deal.volume !== null && !isNaN(deal.volume)) ? deal.volume : 0)
    
    // Use aggregated totals if provided
    const profitValue = (totalProfit !== undefined && totalProfit !== null && !isNaN(totalProfit))
      ? totalProfit
      : ((deal.profit !== undefined && deal.profit !== null && !isNaN(deal.profit)) ? deal.profit : 0)
    const swapValue = (totalSwap !== undefined && totalSwap !== null && !isNaN(totalSwap))
      ? totalSwap
      : ((deal.swap !== undefined && deal.swap !== null && !isNaN(deal.swap)) ? deal.swap : 0)
    const commissionValue = (totalCommission !== undefined && totalCommission !== null && !isNaN(totalCommission))
      ? totalCommission
      : ((deal.commission !== undefined && deal.commission !== null && !isNaN(deal.commission)) ? deal.commission : 0)
    
    // Use extracted SL/TP values if provided (from convertMT5DealToAccountTrade)
    // This ensures we use the successfully extracted values instead of re-extracting
    // IMPORTANT: Check for undefined specifically, not falsy (0 is a valid value)
    let stopLoss: number | undefined = extractedStopLoss !== undefined ? extractedStopLoss : undefined
    let takeProfit: number | undefined = extractedTakeProfit !== undefined ? extractedTakeProfit : undefined
    
    if (extractedStopLoss !== undefined || extractedTakeProfit !== undefined) {
      console.log(`[AccountSync] [TradeHistory] ✅ Using extracted SL/TP values: SL=${extractedStopLoss !== undefined ? extractedStopLoss : 'N/A'}, TP=${extractedTakeProfit !== undefined ? extractedTakeProfit : 'N/A'}`)
    } else {
      console.log(`[AccountSync] [TradeHistory] ℹ️ No extracted SL/TP provided, will attempt extraction`)
    }
    
    // Try to get SL/TP from open positions (fallback if not provided)
    // Check for undefined specifically (0 is a valid value)
    if ((stopLoss === undefined || takeProfit === undefined) && openPositions && deal.positionId) {
      const position = openPositions.find(p => 
        String(p.id) === String(deal.positionId) || 
        String(p.ticket) === String(deal.positionId)
      )
      if (position && (position.stopLoss !== undefined || position.takeProfit !== undefined)) {
        stopLoss = position.stopLoss
        takeProfit = position.takeProfit
      }
    }
    
    // If we still don't have SL/TP and we have an entry deal, try to get from entry deal's position
    // Check for undefined specifically (0 is a valid value)
    if ((stopLoss === undefined || takeProfit === undefined) && finalEntryDeal && openPositions) {
      const entryPosition = openPositions.find(p => 
        String(p.id) === String(finalEntryDeal.positionId) || 
        String(p.ticket) === String(finalEntryDeal.positionId)
      )
      if (entryPosition && (entryPosition.stopLoss !== undefined || entryPosition.takeProfit !== undefined)) {
        stopLoss = stopLoss || entryPosition.stopLoss
        takeProfit = takeProfit || entryPosition.takeProfit
      }
    }
    
    // Try to get SL/TP from order history (for closed positions)
    // Check for undefined specifically (0 is a valid value)
    if ((stopLoss === undefined || takeProfit === undefined) && orderHistory && orderHistory.length > 0) {
      const positionIdStr = String(deal.positionId || finalEntryDeal?.positionId || '')
      const ticketStr = String(deal.ticket || deal.id || finalEntryDeal?.ticket || '')
      
      console.log(`[AccountSync] [TradeHistory] 🔍 Attempting to match order for positionId: ${positionIdStr}, ticket: ${ticketStr}`)
      
      // Match order by positionId or ticket
      const matchingOrder = orderHistory.find((order: any) => {
        const orderPositionId = String(order.positionId || order.position || order.positionId || '')
        const orderTicket = String(order.ticket || order.id || order.order || order.deal || '')
        const matches = (positionIdStr && orderPositionId && orderPositionId === positionIdStr) ||
                        (ticketStr && orderTicket && orderTicket === ticketStr)
        return matches
      })
      
      if (matchingOrder) {
        console.log(`[AccountSync] [TradeHistory] ✅ Found matching order for position ${positionIdStr}`)
        
        // Extract SL/TP from order (check multiple field name variations)
        const slFields = ['stopLoss', 'sl', 'stop_loss', 'stopLossPrice', 'stopLossValue', 'stop', 'stopPrice']
        const tpFields = ['takeProfit', 'tp', 'take_profit', 'takeProfitPrice', 'takeProfitValue', 'take', 'takePrice', 'profit']
        
        // Try to find SL (only if not already set)
        if (stopLoss === undefined) {
          for (const field of slFields) {
            const fieldValue = matchingOrder[field]
            // Exclude 0, undefined, and null - treat 0 as "not set"
            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
              stopLoss = Number(fieldValue)
              console.log(`[AccountSync] [TradeHistory] ✅ Found stopLoss from field '${field}': ${stopLoss}`)
              break
            }
          }
        }
        
        // Try to find TP (only if not already set)
        if (takeProfit === undefined) {
          for (const field of tpFields) {
            const fieldValue = matchingOrder[field]
            // Exclude 0, undefined, and null - treat 0 as "not set"
            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
              takeProfit = Number(fieldValue)
              console.log(`[AccountSync] [TradeHistory] ✅ Found takeProfit from field '${field}': ${takeProfit}`)
              break
            }
          }
        }
        
        if (stopLoss !== undefined || takeProfit !== undefined) {
          console.log(`[AccountSync] [TradeHistory] ✅ Successfully extracted SL/TP: SL=${stopLoss !== undefined ? stopLoss : 'N/A'}, TP=${takeProfit !== undefined ? takeProfit : 'N/A'}`)
        } else {
          console.warn(`[AccountSync] [TradeHistory] ⚠️ Matching order found but no SL/TP fields detected`)
        }
      } else {
        console.warn(`[AccountSync] [TradeHistory] ⚠️ No matching order found for positionId: ${positionIdStr}`)
      }
    }
    
    // Try to get SL/TP directly from deals if available (fallback)
    // Exclude 0 values - treat 0 as "not set"
    if ((stopLoss === undefined || takeProfit === undefined) && deal) {
      const dealSlFields = ['stopLoss', 'sl', 'stop_loss', 'stopLossPrice']
      const dealTpFields = ['takeProfit', 'tp', 'take_profit', 'takeProfitPrice']
      
      if (stopLoss === undefined) {
        for (const field of dealSlFields) {
          const fieldValue = deal[field]
          // Exclude 0, undefined, and null - treat 0 as "not set"
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
            stopLoss = Number(fieldValue)
            console.log(`[AccountSync] [TradeHistory] ✅ Found stopLoss from deal field '${field}': ${stopLoss}`)
            break
          }
        }
      }
      
      if (takeProfit === undefined) {
        for (const field of dealTpFields) {
          const fieldValue = deal[field]
          // Exclude 0, undefined, and null - treat 0 as "not set"
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
            takeProfit = Number(fieldValue)
            console.log(`[AccountSync] [TradeHistory] ✅ Found takeProfit from deal field '${field}': ${takeProfit}`)
            break
          }
        }
      }
    }
    
    // Try to get SL/TP from entry deal if still missing
    if (finalEntryDeal && (stopLoss === undefined || takeProfit === undefined)) {
      const entrySlFields = ['stopLoss', 'sl', 'stop_loss', 'stopLossPrice']
      const entryTpFields = ['takeProfit', 'tp', 'take_profit', 'takeProfitPrice']
      
      if (stopLoss === undefined) {
        for (const field of entrySlFields) {
          const fieldValue = finalEntryDeal[field]
          // Exclude 0, undefined, and null - treat 0 as "not set"
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
            stopLoss = Number(fieldValue)
            console.log(`[AccountSync] [TradeHistory] ✅ Found stopLoss from entry deal field '${field}': ${stopLoss}`)
            break
          }
        }
      }
      
      if (takeProfit === undefined) {
        for (const field of entryTpFields) {
          const fieldValue = finalEntryDeal[field]
          // Exclude 0, undefined, and null - treat 0 as "not set"
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== 0) {
            takeProfit = Number(fieldValue)
            console.log(`[AccountSync] [TradeHistory] ✅ Found takeProfit from entry deal field '${field}': ${takeProfit}`)
            break
          }
        }
      }
    }
    
    // Calculate pips - correct parameter order: (entryPrice, exitPrice, symbol, useDisplayMultiplier)
    // Always calculate pips for closed trades
    // SIMPLIFIED: Calculate magnitude from prices, then apply profit sign directly (profit is the source of truth)
    let pips = 0
    if (openPriceValue > 0 && closePriceValue > 0) {
      try {
        // Calculate raw pips magnitude from price difference
        const rawPips = calculatePips(openPriceValue, closePriceValue, normalizedSymbol, false)
        const pipsMagnitude = Math.abs(rawPips)
        
        // CRITICAL: Profit sign is the ONLY source of truth for pips sign
        // If profit is negative, pips MUST be negative (and vice versa)
        if (profitValue !== 0) {
          const profitSign = profitValue > 0 ? 1 : -1
          pips = pipsMagnitude * profitSign
        } else {
          pips = 0
        }
        
        // If pips is 0 but prices are different, log for debugging
        if (pips === 0 && Math.abs(openPriceValue - closePriceValue) > 0.0001) {
          console.warn(`[AccountSync] Trade history pips calculated as 0 but prices differ: open=${openPriceValue}, close=${closePriceValue}, symbol=${normalizedSymbol}`)
        }
      } catch (error) {
        console.error(`[AccountSync] Error calculating pips for trade history:`, error, {
          openPrice: openPriceValue,
          closePrice: closePriceValue,
          symbol: normalizedSymbol
        })
        pips = 0
      }
    }
    
    // Calculate duration in seconds
    const duration = Math.floor((closeTime.getTime() - openTime.getTime()) / 1000)
    
    // Determine closedBy - try to infer from profit and prices
    let closedBy: 'TP' | 'SL' | 'MANUAL' | 'UNKNOWN' = 'MANUAL'
    if (stopLoss && takeProfit && openPriceValue) {
      // If closed at TP price (within small tolerance)
      if (isBuy && Math.abs(closePriceValue - takeProfit) < Math.abs(closePriceValue - stopLoss)) {
        closedBy = 'TP'
      } else if (!isBuy && Math.abs(closePriceValue - takeProfit) < Math.abs(closePriceValue - stopLoss)) {
        closedBy = 'TP'
      } else if (isBuy && Math.abs(closePriceValue - stopLoss) < Math.abs(closePriceValue - takeProfit)) {
        closedBy = 'SL'
      } else if (!isBuy && Math.abs(closePriceValue - stopLoss) < Math.abs(closePriceValue - takeProfit)) {
        closedBy = 'SL'
      }
    }
    
    // Get ticket - use ticket, id, positionId, or order as fallback
    const ticket = String(deal.ticket || deal.id || deal.positionId || deal.order || positionId)
    
    // Calculate Risk:Reward ratio if we have SL/TP
    let riskReward: number | null = null
    if (stopLoss && takeProfit && openPriceValue) {
      try {
        riskReward = calculateRiskReward(
          isBuy ? 'BUY' : 'SELL',
          openPriceValue,
          stopLoss,
          takeProfit
        )
      } catch (error) {
        console.warn('[AccountSync] Error calculating R:R for trade history, using fallback:', error)
        // Fallback calculation
        const risk = Math.abs(openPriceValue - stopLoss)
        const reward = Math.abs(takeProfit - openPriceValue)
        if (risk > 0) {
          riskReward = reward / risk
        }
      }
    }
    
    const tradeHistory: any = {
      positionId,
      ticket,
      symbol: normalizedSymbol,
      type,
      volume: volumeValue,
      openPrice: openPriceValue,
      closePrice: closePriceValue,
      stopLoss: stopLoss !== undefined ? stopLoss : 0, // Always include, use 0 if not found (matches admin section pattern)
      takeProfit: takeProfit !== undefined ? takeProfit : 0, // Always include, use 0 if not found (matches admin section pattern)
      openTime: Timestamp.fromDate(openTime),
      closeTime: Timestamp.fromDate(closeTime),
      profit: profitValue, // Aggregated total profit
      pips: Math.round(pips) || 0, // Pips sign matches profit sign (set above)
      swap: swapValue, // Aggregated total swap
      commission: commissionValue, // Aggregated total commission
      duration,
      closedBy,
      accountId,
      userId, // Link to user (replaces profileId)
      archivedAt: Timestamp.now()
    }
    
    // Only add riskReward if it was calculated (not null)
    if (riskReward !== null && riskReward !== undefined) {
      tradeHistory.riskReward = riskReward
    }
    
    // Log SL/TP values that will be saved
    console.log(`[AccountSync] [TradeHistory] 📋 SL/TP values in tradeHistory:`, {
      stopLoss: tradeHistory.stopLoss,
      takeProfit: tradeHistory.takeProfit,
      hasRiskReward: 'riskReward' in tradeHistory
    })
    
    // Log the complete tradeHistory object before saving
    console.log(`[AccountSync] [TradeHistory] 📄 Complete tradeHistory object to save:`, {
      positionId,
      symbol: normalizedSymbol,
      stopLoss: tradeHistory.stopLoss !== undefined ? tradeHistory.stopLoss : 'NOT INCLUDED',
      takeProfit: tradeHistory.takeProfit !== undefined ? tradeHistory.takeProfit : 'NOT INCLUDED',
      hasStopLoss: 'stopLoss' in tradeHistory,
      hasTakeProfit: 'takeProfit' in tradeHistory
    })
    
    // Log complete tradeHistory object before saving to Firestore
    console.log(`[AccountSync] [TradeHistory] 📄 About to save to Firestore - Complete tradeHistory object:`, {
      positionId,
      symbol: normalizedSymbol,
      stopLoss: tradeHistory.stopLoss !== undefined ? tradeHistory.stopLoss : 'NOT INCLUDED',
      takeProfit: tradeHistory.takeProfit !== undefined ? tradeHistory.takeProfit : 'NOT INCLUDED',
      hasStopLoss: 'stopLoss' in tradeHistory,
      hasTakeProfit: 'takeProfit' in tradeHistory,
      stopLossValue: tradeHistory.stopLoss,
      takeProfitValue: tradeHistory.takeProfit,
      allKeys: Object.keys(tradeHistory)
    })
    
    // Check if we should update existing document or create new one
    if (existingDoc) {
      // Update existing document with SL/TP if we found them
      // Only update if we have better SL/TP values (non-zero) than what's currently stored
      const shouldUpdate = (stopLoss !== undefined && stopLoss !== 0 && (existingStopLoss === 0 || existingStopLoss === undefined)) ||
                          (takeProfit !== undefined && takeProfit !== 0 && (existingTakeProfit === 0 || existingTakeProfit === undefined))
      
      if (shouldUpdate) {
        const updateData: any = {}
        
        // Only update fields that we have better values for
        if (stopLoss !== undefined && stopLoss !== 0 && (existingStopLoss === 0 || existingStopLoss === undefined)) {
          updateData.stopLoss = stopLoss
        }
        if (takeProfit !== undefined && takeProfit !== 0 && (existingTakeProfit === 0 || existingTakeProfit === undefined)) {
          updateData.takeProfit = takeProfit
        }
        
        // Recalculate R:R if we're updating SL/TP
        if ((updateData.stopLoss !== undefined || updateData.takeProfit !== undefined) && openPriceValue) {
          const finalStopLoss = updateData.stopLoss !== undefined ? updateData.stopLoss : (existingStopLoss || stopLoss || 0)
          const finalTakeProfit = updateData.takeProfit !== undefined ? updateData.takeProfit : (existingTakeProfit || takeProfit || 0)
          
          if (finalStopLoss && finalTakeProfit && finalStopLoss !== 0 && finalTakeProfit !== 0) {
            try {
              const newRiskReward = calculateRiskReward(
                isBuy ? 'BUY' : 'SELL',
                openPriceValue,
                finalStopLoss,
                finalTakeProfit
              )
              if (newRiskReward !== null && newRiskReward !== undefined) {
                updateData.riskReward = newRiskReward
              }
            } catch (error) {
              console.warn('[AccountSync] Error calculating R:R for update:', error)
            }
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          await updateDoc(doc(db, 'mt5_trade_history', existingDoc.id), updateData)
          console.log(`[AccountSync] [TradeHistory] ✅ Updated existing document with SL/TP:`, {
            documentId: existingDoc.id,
            positionId,
            symbol: normalizedSymbol,
            updates: updateData
          })
        } else {
          console.log(`[AccountSync] [TradeHistory] ℹ️ Existing document already has SL/TP, no update needed:`, {
            documentId: existingDoc.id,
            positionId,
            existingStopLoss,
            existingTakeProfit
          })
        }
      } else {
        console.log(`[AccountSync] [TradeHistory] ℹ️ No better SL/TP values found, skipping update:`, {
          documentId: existingDoc.id,
          positionId,
          existingStopLoss,
          existingTakeProfit,
          extractedStopLoss: stopLoss,
          extractedTakeProfit: takeProfit
        })
      }
    } else {
      // Create new document
      const docRef = await addDoc(collection(db, 'mt5_trade_history'), tradeHistory)
      
      // Log after Firestore save to confirm what was written
      console.log(`[AccountSync] [TradeHistory] ✅ Document saved to Firestore:`, {
        documentId: docRef.id,
        collection: 'mt5_trade_history',
        positionId,
        symbol: normalizedSymbol,
        stopLoss: tradeHistory.stopLoss !== undefined ? tradeHistory.stopLoss : 'NOT SAVED',
        takeProfit: tradeHistory.takeProfit !== undefined ? tradeHistory.takeProfit : 'NOT SAVED',
        stopLossIncluded: 'stopLoss' in tradeHistory,
        takeProfitIncluded: 'takeProfit' in tradeHistory
      })
      
      console.log(`[AccountSync] ✅ Saved trade to mt5_trade_history:`, {
        positionId,
        symbol: normalizedSymbol,
        stopLoss: tradeHistory.stopLoss !== undefined ? tradeHistory.stopLoss : 'NOT SAVED',
        takeProfit: tradeHistory.takeProfit !== undefined ? tradeHistory.takeProfit : 'NOT SAVED',
        type,
        accountId,
        userId,
        profit: profitValue,
        commission: commissionValue,
        swap: swapValue,
        pips: Math.round(pips)
      })
    }
  } catch (error) {
    console.error('[AccountSync] Error saving to trade history:', error)
    // Don't throw - this is supplementary data, main sync should continue
  }
}

/**
 * Get open positions for an account
 */
export async function getAccountOpenPositions(userId: string, accountLinkId: string): Promise<any[]> {
  try {
    const account = await getAccountByLinkId(userId, accountLinkId)
    if (!account) {
      throw new Error('Account not found or access denied')
    }

    let accountId: string | undefined

    if (account.copyTradingAccountId) {
      const copyTradingAccounts = await listUserCopyTradingAccounts(userId)
      const copyAccount = copyTradingAccounts.find(acc => acc.accountId === account.copyTradingAccountId)
      if (copyAccount) {
        const { getMasterStrategy } = await import('./copyTradingRepo')
        const masterStrategy = await getMasterStrategy(copyAccount.strategyId)
        if (masterStrategy) {
          accountId = masterStrategy.accountId
        }
      }
    } else if (account.mt5AccountId) {
      accountId = account.mt5AccountId
    }

    if (!accountId) {
      return []
    }

    const token = process.env.METAAPI_TOKEN
    if (!token) {
      throw new Error('METAAPI_TOKEN not configured')
    }

    // Get positions from MT5
    if (typeof window === 'undefined') {
      const { getPositions } = await import('./metaapiRestClient')
      return await getPositions(accountId, token)
    }

    const apiInstance = await getMetaApiInstance(token)
    const accountObj = await apiInstance.metatraderAccountApi.getAccount(accountId)
    const connection = accountObj.getRPCConnection()
    
    if (!connection.connected) {
      await connection.connect()
      await accountObj.waitSynchronized()
    }

    return await connection.getPositions()
  } catch (error) {
    console.error('[AccountSync] Error getting open positions:', error)
    return []
  }
}

