/**
 * Profile MT5 Sync Service
 * Syncs trades from MT5 accounts or copy trading accounts to profile's trades collection
 */

import { db } from './firebaseConfig'
import { collection, addDoc, updateDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { getProfileById } from './profileService'
import { listUserCopyTradingAccounts } from './copyTradingRepo'
import { getMetaApiInstance } from './mt5VipService'
import { getAccountInfo } from './metaapiRestClient'
import { Trade } from '@/types/trade'
import { MT5Deal } from '@/types/mt5'
import { calculatePips } from './currencyDatabase'

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
 * Sync trades for a specific profile
 */
export async function syncProfileTrades(
  profileId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ success: boolean; summary?: any; error?: string }> {
  try {
    // Get profile
    const profile = await getProfileById(profileId)
    if (!profile) {
      throw new Error('Profile not found')
    }

    // Determine account to sync from
    let accountId: string | undefined
    let accountType: 'mt5' | 'copy-trading' | null = null

    if (profile.copyTradingAccountId) {
      // Sync from copy trading account
      accountType = 'copy-trading'
      const copyTradingAccounts = await listUserCopyTradingAccounts(profile.userId)
      const copyAccount = copyTradingAccounts.find(acc => acc.accountId === profile.copyTradingAccountId)
      
      if (!copyAccount) {
        throw new Error('Copy trading account not found')
      }

      // Get the MetaAPI account ID from the master strategy
      // The copy trading account's strategyId points to the master strategy
      // The master strategy's accountId is the MetaAPI account ID
      const { getMasterStrategy } = await import('./copyTradingRepo')
      const masterStrategy = await getMasterStrategy(copyAccount.strategyId)
      
      if (!masterStrategy) {
        throw new Error('Master strategy not found for copy trading account')
      }

      // Use the master strategy's accountId as the MetaAPI account ID
      accountId = masterStrategy.accountId
    } else if (profile.mt5AccountId) {
      // Sync from direct MT5 account
      accountType = 'mt5'
      accountId = profile.mt5AccountId
    } else {
      throw new Error('No account linked to profile')
    }

    if (!accountId) {
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
      const accountInfo = await getAccountInfo(accountId, token)
      // Extract region URL from account info if available
      const { extractRegionUrlFromAccount } = await import('./metaapiRestClient')
      regionUrl = extractRegionUrlFromAccount(accountInfo) || undefined
    } catch (error) {
      console.error('Error validating account:', error)
      throw new Error('Failed to validate account access. Please check your MetaAPI account ID and token.')
    }

    // Get deals from MT5 (pass regionUrl if available)
    const deals = await getDealsFromMT5(accountId, token, startDate, endDate, regionUrl)
    console.log(`[ProfileSync] Found ${deals.length} deals from MT5 for profile ${profileId}`)

    let tradesImported = 0
    let tradesUpdated = 0
    const errors: string[] = []

    // Fetch open positions to get SL/TP data and create OPEN trades
    let openPositions: any[] = []
    try {
      const { getPositions } = await import('./metaapiRestClient')
      openPositions = await getPositions(accountId, token, regionUrl)
      console.log(`[ProfileSync] Found ${openPositions.length} open positions`)
    } catch (posError) {
      console.warn('[ProfileSync] Could not fetch open positions (non-critical):', posError)
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
        const existingTrade = await checkDuplicateTrade(positionTicketId, profileId)
        
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
            profileId: profile.id,
            userId: profile.userId,
            openTime: position.time ? new Date(position.time) : new Date(),
            // Store SL/TP for later use
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit
          }

          await saveProfileTrade(openTrade)
          tradesImported++
        }
      } catch (error) {
        console.warn('[ProfileSync] Error processing open position:', error)
      }
    }

    // Group deals by positionId to aggregate data correctly
    const dealsByPosition = new Map<string, MT5Deal[]>()
    for (const deal of deals) {
      const positionId = String(deal.positionId || deal.ticket || deal.id || '')
      if (positionId && positionId !== 'undefined') {
        if (!dealsByPosition.has(positionId)) {
          dealsByPosition.set(positionId, [])
        }
        dealsByPosition.get(positionId)!.push(deal)
      }
    }

    // Track which position IDs are currently open
    const openPositionIds = new Set(openPositions.map(p => String(p.id || p.ticket || '')))
    
    // Close trades that are OPEN but no longer in open positions
    if (openPositionIds.size < openPositions.length || openPositions.length === 0) {
      // Get all OPEN trades for this profile
      const { query: q, where: w, getDocs: gd } = await import('firebase/firestore')
      const openTradesQuery = q(
        collection(db, 'trades'),
        w('profileId', '==', profileId),
        w('status', '==', 'OPEN'),
        w('source', '==', 'MT5_VIP')
      )
      const openTradesSnapshot = await gd(openTradesQuery)
      
      for (const tradeDoc of openTradesSnapshot.docs) {
        const tradeData = tradeDoc.data()
        const tradePositionId = String(tradeData.mt5TicketId || '')
        
        // If this trade's position ID is not in the current open positions, close it
        if (tradePositionId && !openPositionIds.has(tradePositionId)) {
          console.log(`[ProfileSync] Closing trade that is no longer open: ${tradePositionId}`)
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
    for (const [positionId, positionDeals] of dealsByPosition) {
      try {
        // Find entry and exit deals for this position
        const entryDeals = positionDeals.filter(d => d.entry === 'IN')
        const exitDeals = positionDeals.filter(d => d.entry === 'OUT')
        
        // Only process positions that have been closed (have exit deals)
        if (exitDeals.length === 0) {
          continue // Skip open positions - handled separately above
        }

        // Get the first entry deal and last exit deal
        const entryDeal = entryDeals[0]
        const exitDeal = exitDeals[exitDeals.length - 1] // Use last exit deal (final close)
        
        if (!entryDeal || !exitDeal) {
          console.warn(`[ProfileSync] Position ${positionId} missing entry or exit deal`)
          continue
        }

        // Aggregate profit, commission, and swap from ALL deals for this position
        const totalProfit = positionDeals.reduce((sum, d) => sum + (d.profit || 0), 0)
        const totalCommission = positionDeals.reduce((sum, d) => sum + (d.commission || 0), 0)
        const totalSwap = positionDeals.reduce((sum, d) => sum + (d.swap || 0), 0)

        // Validate required fields
        if (!entryDeal.symbol || !entryDeal.positionId) {
          console.warn(`[ProfileSync] Skipping position - missing required fields:`, {
            symbol: entryDeal.symbol,
            positionId: entryDeal.positionId
          })
          continue
        }
        
        // Convert to trade format using aggregated data
        const trade = convertMT5DealToProfileTrade(
          exitDeal, 
          profile, 
          accountType, 
          deals, 
          openPositions,
          entryDeal,
          totalProfit,
          totalCommission,
          totalSwap
        )
        
        // Validate trade has all required fields
        if (!trade.mt5TicketId || trade.mt5TicketId === 'undefined' || trade.mt5TicketId === 'null' || trade.mt5TicketId === '') {
          console.warn(`[ProfileSync] Skipping trade - invalid ticket ID after conversion:`, { positionId, trade })
          continue
        }
        
        if (!trade.pair || trade.pair === 'UNKNOWN') {
          console.warn(`[ProfileSync] Skipping trade - invalid pair:`, { positionId, trade })
          continue
        }
        
        console.log(`[ProfileSync] Processing closed trade:`, {
          positionId,
          symbol: trade.pair,
          type: trade.type,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          profit: trade.profit,
          commission: trade.mt5Commission,
          swap: trade.mt5Swap,
          pips: trade.pips,
          status: trade.status
        })
        
        // Check if trade already exists - try multiple ways to match
        // 1. Try by mt5TicketId (from exit deal)
        let existingTrade = await checkDuplicateTrade(trade.mt5TicketId, profileId)
        
        // 2. If not found, try by positionId (in case ticket IDs differ)
        if (!existingTrade && positionId) {
          // Query by positionId stored in mt5TicketId field
          const { query: q2, where: w2, getDocs: gd2 } = await import('firebase/firestore')
          const positionQuery = q2(
            collection(db, 'trades'),
            w2('mt5TicketId', '==', positionId),
            w2('profileId', '==', profileId)
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
          await updateProfileTrade(existingTrade.id, trade)
          tradesUpdated++
        } else {
          // Create new trade
          await saveProfileTrade(trade)
          tradesImported++
        }
        
        // ALSO save to mt5_trade_history for closed trades page and analytics
        try {
          await saveToTradeHistory(exitDeal, accountId, profileId, deals, openPositions, entryDeal, totalProfit, totalCommission, totalSwap)
        } catch (historyError) {
          console.warn('[ProfileSync] Failed to save to trade history (non-critical):', historyError)
        }
      } catch (error) {
        const errorMsg = `Error processing position ${positionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error('[ProfileSync]', errorMsg, error)
      }
    }

    // Update profile's lastSyncAt
    const { updateProfile } = await import('./profileService')
    await updateProfile(profileId, {
      lastSyncAt: new Date().toISOString()
    })

    return {
      success: true,
      summary: {
        totalDeals: deals.length,
        tradesImported,
        tradesUpdated,
        errors: errors.length,
        accountType
      }
    }
  } catch (error) {
    console.error('[ProfileSync] Error syncing profile trades:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
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
    // Use default date range if not provided (last 30 days)
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate || new Date()

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
          console.log('[ProfileSync] RPC connection not available, using REST API fallback')
        }
      }

      // Try to get deals via RPC connection
      if (connection.getDeals) {
        const deals = await connection.getDeals(start, end)
        if (deals && deals.length > 0) {
          return deals
        }
      }
    } catch (rpcError) {
      console.log('[ProfileSync] RPC getDeals failed, trying REST API fallback:', rpcError instanceof Error ? rpcError.message : 'Unknown error')
    }

    // Fallback to REST API (though it may not work for deals)
    if (typeof window === 'undefined') {
      const { getDeals } = await import('./metaapiRestClient')
      const restDeals = await getDeals(accountId, token, regionUrl, start, end)
      if (restDeals && restDeals.length > 0) {
        return restDeals
      }
    }

    // If both fail, return empty array (no deals found or endpoints not available)
    console.warn('[ProfileSync] Could not fetch deals via RPC or REST API. MetaAPI may not expose deals via REST API - RPC connection required.')
    return []
  } catch (error) {
    console.error('[ProfileSync] Error getting deals from MT5:', error)
    // Don't throw - return empty array instead
    return []
  }
}

/**
 * Convert MT5 deal to profile Trade format
 */
function convertMT5DealToProfileTrade(
  deal: MT5Deal,
  profile: any,
  accountType: 'mt5' | 'copy-trading' | null,
  allDeals: MT5Deal[],
  openPositions?: any[],
  entryDeal?: MT5Deal,
  totalProfit?: number,
  totalCommission?: number,
  totalSwap?: number
): Omit<Trade, 'id' | 'createdAt' | 'updatedAt'> {
  const isBuy = deal.type === 'BUY'
  const isEntry = deal.entry === 'IN'
  
  // Use provided entryDeal or find it
  let finalEntryDeal: MT5Deal | undefined = entryDeal
  let entryPrice = deal.price
  let exitPrice = deal.price
  let openTime: Date | undefined = undefined
  let closeTime: Date | undefined = undefined
  
  // For exit deals, find matching entry deal if not provided
  if (!isEntry && !finalEntryDeal) {
    // This is an exit deal - find the matching entry deal
    finalEntryDeal = allDeals.find(d => 
      d.positionId === deal.positionId && 
      d.entry === 'IN' &&
      d.symbol === deal.symbol
    )
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
  if ((!stopLoss || !takeProfit) && finalEntryDeal && deal.positionId) {
    // Try to find the position in openPositions using the entry deal's positionId
    if (openPositions) {
      const entryPosition = openPositions.find(p => 
        String(p.id) === String(finalEntryDeal.positionId) || 
        String(p.ticket) === String(finalEntryDeal.positionId)
      )
      if (entryPosition && (entryPosition.stopLoss !== undefined || entryPosition.takeProfit !== undefined)) {
        stopLoss = stopLoss || entryPosition.stopLoss
        takeProfit = takeProfit || entryPosition.takeProfit
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
      console.warn('[ProfileSync] Error parsing deal time, using current time:', error)
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
  let pips = 0
  if (!isEntry && finalEntryDeal && entryPriceValue > 0 && exitPriceValue > 0) {
    // Calculate pips even if prices are the same (will return 0, but ensures calculation is attempted)
    try {
      pips = calculatePips(entryPriceValue, exitPriceValue, normalizedSymbol, false)
      // If pips is 0 but prices are different, log for debugging
      if (pips === 0 && Math.abs(entryPriceValue - exitPriceValue) > 0.0001) {
        console.warn(`[ProfileSync] Pips calculated as 0 but prices differ: entry=${entryPriceValue}, exit=${exitPriceValue}, symbol=${normalizedSymbol}`)
      }
    } catch (error) {
      console.error(`[ProfileSync] Error calculating pips:`, error, {
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
  
  // Calculate Risk:Reward ratio if we have SL/TP
  let rr = 0
  if (stopLoss && takeProfit && entryPriceValue) {
    const risk = Math.abs(entryPriceValue - stopLoss)
    const reward = Math.abs(takeProfit - entryPriceValue)
    if (risk > 0) {
      rr = reward / risk
    }
  } else if (pips !== 0) {
    // Fallback: calculate RR from pips if we have risk data
    // This is a simplified calculation
    rr = Math.abs(pips) / 20 // Assuming 20 pips risk as default if no SL
  }
  
  // Calculate duration in seconds if we have both open and close times
  let duration = 0
  if (openTime && closeTime) {
    duration = Math.floor((closeTime.getTime() - openTime.getTime()) / 1000)
  }
  
  // Build trade object without undefined fields
  const tradeData: any = {
    pair: normalizedSymbol,
    type: isBuy ? 'BUY' : 'SELL',
    status, // Automatically set based on profit
    entryPrice: entryPriceValue,
    exitPrice: exitPriceValue,
    pips: Math.round(pips), // Real pips from API
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
    profileId: profile.id,
    userId: profile.userId,
    // Include SL/TP if available
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
 * Save profile trade to Firebase
 */
async function saveProfileTrade(trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  // Remove undefined values before saving (Firestore rejects undefined)
  const tradeData: any = {
    ...trade,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
  
  // Remove undefined fields
  Object.keys(tradeData).forEach(key => {
    if (tradeData[key] === undefined) {
      delete tradeData[key]
    }
  })
  
  await addDoc(collection(db, 'trades'), tradeData)
  console.log(`[ProfileSync] Saved trade: ${trade.pair} ${trade.type} - Ticket: ${trade.mt5TicketId}`)
}

/**
 * Update existing profile trade
 */
async function updateProfileTrade(tradeId: string, trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const tradeRef = doc(db, 'trades', tradeId)
  const updateData: any = {
    ...trade,
    updatedAt: Timestamp.now()
  }
  
  // Remove undefined fields (Firestore rejects undefined)
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key]
    }
  })
  
  await updateDoc(tradeRef, updateData)
  console.log(`[ProfileSync] Updated trade: ${tradeId}`)
}

/**
 * Check for duplicate trade
 */
async function checkDuplicateTrade(mt5TicketId: string, profileId: string): Promise<Trade | null> {
  try {
    // Validate inputs - don't query with invalid values
    if (!mt5TicketId || mt5TicketId === 'undefined' || mt5TicketId === 'null' || mt5TicketId === '') {
      return null
    }
    
    if (!profileId || profileId === 'undefined' || profileId === 'null' || profileId === '') {
      return null
    }
    
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
    console.error('[ProfileSync] Error checking duplicate trade:', error)
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
  profileId: string, 
  allDeals: MT5Deal[], 
  openPositions?: any[],
  entryDeal?: MT5Deal,
  totalProfit?: number,
  totalCommission?: number,
  totalSwap?: number
): Promise<void> {
  try {
    // Only save position close deals (entry = 'OUT')
    // Entry deals (entry = 'IN') are not closed trades yet
    if (deal.entry !== 'OUT') {
      return // Skip entry deals
    }
    
    // Validate required fields
    if (!deal.symbol || (!deal.positionId && !deal.ticket && !deal.id && !deal.order)) {
      console.warn('[ProfileSync] Skipping trade history save - missing required fields:', deal)
      return
    }
    
    // Check if this trade already exists in history
    const { collection, query, where, getDocs, addDoc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('./firebaseConfig')
    
    // Get position ID - use positionId, ticket, id, or order as fallback
    const positionId = String(deal.positionId || deal.ticket || deal.id || deal.order || '')
    if (!positionId || positionId === 'undefined' || positionId === 'null' || positionId === '') {
      console.warn('[ProfileSync] Skipping trade history save - no valid position ID:', deal)
      return
    }
    
    // Normalize symbol
    const normalizedSymbol = normalizeSymbol(deal.symbol)
    const existingQuery = query(
      collection(db, 'mt5_trade_history'),
      where('positionId', '==', positionId),
      where('accountId', '==', accountId)
    )
    
    const existingDocs = await getDocs(existingQuery)
    if (!existingDocs.empty) {
      // Trade already archived
      return
    }
    
    // Use provided entryDeal or find it
    const finalEntryDeal = entryDeal || allDeals.find(d => 
      d.positionId === deal.positionId && 
      d.entry === 'IN' &&
      d.symbol === deal.symbol
    )
    
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
    
    // Try to get SL/TP from open positions
    // First try to find by positionId, then try entry deal's positionId
    let stopLoss: number | undefined = undefined
    let takeProfit: number | undefined = undefined
    
    if (openPositions && deal.positionId) {
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
    if ((!stopLoss || !takeProfit) && finalEntryDeal && openPositions) {
      const entryPosition = openPositions.find(p => 
        String(p.id) === String(finalEntryDeal.positionId) || 
        String(p.ticket) === String(finalEntryDeal.positionId)
      )
      if (entryPosition && (entryPosition.stopLoss !== undefined || entryPosition.takeProfit !== undefined)) {
        stopLoss = stopLoss || entryPosition.stopLoss
        takeProfit = takeProfit || entryPosition.takeProfit
      }
    }
    
    // Calculate pips - correct parameter order: (entryPrice, exitPrice, symbol, useDisplayMultiplier)
    // Always calculate pips for closed trades
    let pips = 0
    if (openPriceValue > 0 && closePriceValue > 0) {
      try {
        pips = calculatePips(openPriceValue, closePriceValue, normalizedSymbol, false)
        // If pips is 0 but prices are different, log for debugging
        if (pips === 0 && Math.abs(openPriceValue - closePriceValue) > 0.0001) {
          console.warn(`[ProfileSync] Trade history pips calculated as 0 but prices differ: open=${openPriceValue}, close=${closePriceValue}, symbol=${normalizedSymbol}`)
        }
      } catch (error) {
        console.error(`[ProfileSync] Error calculating pips for trade history:`, error, {
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
    
    const tradeHistory = {
      positionId,
      ticket,
      symbol: normalizedSymbol,
      type,
      volume: volumeValue,
      openPrice: openPriceValue,
      closePrice: closePriceValue,
      stopLoss: stopLoss || 0,
      takeProfit: takeProfit || 0,
      openTime: Timestamp.fromDate(openTime),
      closeTime: Timestamp.fromDate(closeTime),
      profit: profitValue, // Aggregated total profit
      pips: Math.round(pips) || 0,
      swap: swapValue, // Aggregated total swap
      commission: commissionValue, // Aggregated total commission
      duration,
      closedBy,
      accountId,
      profileId, // Link to profile
      archivedAt: Timestamp.now()
    }
    
    await addDoc(collection(db, 'mt5_trade_history'), tradeHistory)
    console.log(`[ProfileSync] ✅ Saved trade to mt5_trade_history:`, {
      positionId,
      symbol: normalizedSymbol,
      type,
      accountId,
      profileId,
      profit: profitValue,
      commission: commissionValue,
      swap: swapValue,
      pips: Math.round(pips)
    })
  } catch (error) {
    console.error('[ProfileSync] Error saving to trade history:', error)
    // Don't throw - this is supplementary data, main sync should continue
  }
}

/**
 * Get open positions for a profile
 */
export async function getProfileOpenPositions(profileId: string): Promise<any[]> {
  try {
    const profile = await getProfileById(profileId)
    if (!profile) {
      throw new Error('Profile not found')
    }

    let accountId: string | undefined

    if (profile.copyTradingAccountId) {
      const copyTradingAccounts = await listUserCopyTradingAccounts(profile.userId)
      const copyAccount = copyTradingAccounts.find(acc => acc.accountId === profile.copyTradingAccountId)
      if (copyAccount) {
        accountId = copyAccount.accountId
      }
    } else if (profile.mt5AccountId) {
      accountId = profile.mt5AccountId
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
    const account = await apiInstance.metatraderAccountApi.getAccount(accountId)
    const connection = account.getRPCConnection()
    
    if (!connection.connected) {
      await connection.connect()
      await account.waitSynchronized()
    }

    return await connection.getPositions()
  } catch (error) {
    console.error('[ProfileSync] Error getting open positions:', error)
    return []
  }
}

