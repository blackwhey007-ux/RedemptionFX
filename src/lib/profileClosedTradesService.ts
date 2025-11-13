/**
 * Profile Closed Trades Service
 * Fetches closed trades from mt5_trade_history for user profiles
 */

import { getProfileById, getProfilesByUser } from './profileService'
import { getTradeHistory, getTradeHistoryStats, getTradeHistorySymbols, TradeHistoryFilters, TradeHistoryStats, MT5TradeHistory } from './mt5TradeHistoryService'

/**
 * Get closed trades for a user's profiles
 */
export async function getProfileClosedTrades(
  userId: string,
  profileId?: string,
  filters: Omit<TradeHistoryFilters, 'accountId'> = {}
): Promise<MT5TradeHistory[]> {
  try {
    // Get user's profiles
    const profiles = profileId 
      ? [await getProfileById(profileId)].filter(Boolean)
      : await getProfilesByUser(userId)

    // Collect account IDs from linked profiles
    const accountIds: string[] = []
    for (const profile of profiles) {
      if (profile.mt5AccountId) {
        accountIds.push(profile.mt5AccountId)
        console.log(`[ProfileClosedTrades] Added MT5 accountId: ${profile.mt5AccountId} from profile: ${profile.id}`)
      }
      if (profile.copyTradingAccountId) {
        // For copy trading accounts, get the MetaAPI account ID from the master strategy
        try {
          const { listUserCopyTradingAccounts, getMasterStrategy } = await import('./copyTradingRepo')
          const copyTradingAccounts = await listUserCopyTradingAccounts(profile.userId)
          const copyAccount = copyTradingAccounts.find(acc => acc.accountId === profile.copyTradingAccountId)
          
          if (copyAccount) {
            const masterStrategy = await getMasterStrategy(copyAccount.strategyId)
            if (masterStrategy && masterStrategy.accountId) {
              accountIds.push(masterStrategy.accountId)
              console.log(`[ProfileClosedTrades] Added copy trading accountId: ${masterStrategy.accountId} from profile: ${profile.id}`)
            }
          }
        } catch (error) {
          console.error('[ProfileClosedTrades] Error getting master strategy accountId:', error)
          // Continue without this account
        }
      }
    }

    console.log(`[ProfileClosedTrades] Found ${accountIds.length} account IDs to query:`, accountIds)

    if (accountIds.length === 0) {
      console.warn('[ProfileClosedTrades] No account IDs found for profiles:', profiles.map(p => ({ id: p.id, mt5AccountId: p.mt5AccountId, copyTradingAccountId: p.copyTradingAccountId })))
      return []
    }

    // Fetch trades for each profile - use profileId as primary filter (like admin section)
    // This ensures we get trades even if accountId doesn't match (trades might be from different account but same profile)
    const allTrades: MT5TradeHistory[] = []
    for (const profile of profiles) {
      console.log(`[ProfileClosedTrades] Fetching trades for profileId: ${profile.id}`)
      
      // Get accountId for fallback (when profileId is not set in old trades)
      const accountId = profile.mt5AccountId || 
        (profile.copyTradingAccountId ? 
          (await (async () => {
            try {
              const { listUserCopyTradingAccounts, getMasterStrategy } = await import('./copyTradingRepo')
              const copyTradingAccounts = await listUserCopyTradingAccounts(profile.userId)
              const copyAccount = copyTradingAccounts.find(acc => acc.accountId === profile.copyTradingAccountId)
              if (copyAccount) {
                const masterStrategy = await getMasterStrategy(copyAccount.strategyId)
                return masterStrategy?.accountId
              }
            } catch (e) {
              return undefined
            }
          })()) : undefined)
      
      // Use profileId as primary filter - this matches how admin section works
      // Pass accountId as fallback for old trades that don't have profileId set
      const trades = await getTradeHistory({
        ...filters,
        // Don't pass accountId in filters - let it fetch all trades and filter by profileId client-side
        // But pass accountId separately for fallback matching when profileId is not set
        profileId: profile.id,
        accountId: accountId // Pass as fallback for old trades without profileId
      } as any)
      console.log(`[ProfileClosedTrades] Found ${trades.length} trades for profileId: ${profile.id}`)
      allTrades.push(...trades)
    }
    
    console.log(`[ProfileClosedTrades] Total trades found: ${allTrades.length}`)

    // Remove duplicates (same positionId)
    const uniqueTrades = Array.from(
      new Map(allTrades.map(trade => [trade.positionId, trade])).values()
    )

    // Sort by close time (newest first)
    return uniqueTrades.sort((a, b) => 
      b.closeTime.getTime() - a.closeTime.getTime()
    )
  } catch (error) {
    console.error('[ProfileClosedTrades] Error fetching closed trades:', error)
    throw error
  }
}

/**
 * Get closed trades statistics for user's profiles
 */
export async function getProfileClosedTradesStats(
  userId: string,
  profileId?: string,
  filters: Omit<TradeHistoryFilters, 'accountId'> = {}
): Promise<TradeHistoryStats> {
  try {
    const trades = await getProfileClosedTrades(userId, profileId, filters)
    
    // Calculate stats from trades
    const totalTrades = trades.length
    const winningTrades = trades.filter(t => t.profit > 0).length
    const losingTrades = trades.filter(t => t.profit < 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    const totalPips = trades.reduce((sum, t) => sum + t.pips, 0)
    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0)
    const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0
    const averageDuration = totalTrades > 0 
      ? trades.reduce((sum, t) => sum + t.duration, 0) / totalTrades 
      : 0
    const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.profit)) : 0
    const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.profit)) : 0
    
    // Calculate profit factor
    const grossProfit = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0)
    const grossLoss = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0)
    
    // Calculate average R:R
    const tradesWithRR = trades.filter(t => t.riskReward !== null && t.riskReward !== undefined)
    const averageRR = tradesWithRR.length > 0
      ? tradesWithRR.reduce((sum, t) => sum + (t.riskReward || 0), 0) / tradesWithRR.length
      : 0

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPips,
      totalProfit,
      averageProfit,
      averageDuration,
      bestTrade,
      worstTrade,
      profitFactor,
      averageRR
    }
  } catch (error) {
    console.error('[ProfileClosedTrades] Error calculating stats:', error)
    throw error
  }
}

/**
 * Get unique symbols from user's closed trades
 */
export async function getProfileClosedTradesSymbols(
  userId: string,
  profileId?: string
): Promise<string[]> {
  try {
    const trades = await getProfileClosedTrades(userId, profileId)
    const symbols = [...new Set(trades.map(t => t.symbol))]
    return symbols.sort()
  } catch (error) {
    console.error('[ProfileClosedTrades] Error getting symbols:', error)
    return []
  }
}

