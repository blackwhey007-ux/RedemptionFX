/**
 * Account Closed Trades Service
 * Fetches closed trades from mt5_trade_history for user's linked accounts
 */

import { getUserLinkedAccounts, getAccountByLinkId } from './accountService'
import { getTradeHistory, getTradeHistoryStats, getTradeHistorySymbols, TradeHistoryFilters, TradeHistoryStats, MT5TradeHistory } from './mt5TradeHistoryService'
import { listUserCopyTradingAccounts } from './copyTradingRepo'

/**
 * Get closed trades for a user's linked accounts
 */
export async function getAccountClosedTrades(
  userId: string,
  accountLinkId?: string,
  filters: Omit<TradeHistoryFilters, 'accountId' | 'userId'> = {}
): Promise<MT5TradeHistory[]> {
  try {
    // Get user's linked accounts
    const linkedAccounts = accountLinkId
      ? [await getAccountByLinkId(userId, accountLinkId)].filter(Boolean)
      : await getUserLinkedAccounts(userId)

    if (linkedAccounts.length === 0) {
      console.log('[AccountClosedTrades] No linked accounts found for user:', userId)
      return []
    }

    // Collect account IDs from linked accounts
    const accountIds: string[] = []
    for (const account of linkedAccounts) {
      if (account.mt5AccountId) {
        accountIds.push(account.mt5AccountId)
        console.log(`[AccountClosedTrades] Added MT5 accountId: ${account.mt5AccountId} from account link: ${account.id}`)
      }
      if (account.copyTradingAccountId) {
        // For copy trading accounts, get the MetaAPI account ID from the master strategy
        try {
          const { getMasterStrategy } = await import('./copyTradingRepo')
          const copyTradingAccounts = await listUserCopyTradingAccounts(userId)
          const copyAccount = copyTradingAccounts.find(acc => acc.accountId === account.copyTradingAccountId)
          
          if (copyAccount) {
            const masterStrategy = await getMasterStrategy(copyAccount.strategyId)
            if (masterStrategy && masterStrategy.accountId) {
              accountIds.push(masterStrategy.accountId)
              console.log(`[AccountClosedTrades] Added copy trading accountId: ${masterStrategy.accountId} from account link: ${account.id}`)
            }
          }
        } catch (error) {
          console.error('[AccountClosedTrades] Error getting master strategy accountId:', error)
          // Continue without this account
        }
      }
    }

    console.log(`[AccountClosedTrades] Found ${accountIds.length} account IDs to query:`, accountIds)

    if (accountIds.length === 0) {
      console.warn('[AccountClosedTrades] No account IDs found for linked accounts:', linkedAccounts.map(a => ({ id: a.id, mt5AccountId: a.mt5AccountId, copyTradingAccountId: a.copyTradingAccountId })))
      return []
    }

    // Fetch trades for each account - use userId as primary filter (for data isolation)
    // This ensures users only see their own trades
    const allTrades: MT5TradeHistory[] = []
    for (const account of linkedAccounts) {
      console.log(`[AccountClosedTrades] Fetching trades for accountLinkId: ${account.id}`)
      
      // Get accountId for filtering
      let accountId: string | undefined = account.mt5AccountId
      if (!accountId && account.copyTradingAccountId) {
        try {
          const { getMasterStrategy } = await import('./copyTradingRepo')
          const copyTradingAccounts = await listUserCopyTradingAccounts(userId)
          const copyAccount = copyTradingAccounts.find(acc => acc.accountId === account.copyTradingAccountId)
          if (copyAccount) {
            const masterStrategy = await getMasterStrategy(copyAccount.strategyId)
            accountId = masterStrategy?.accountId
          }
        } catch (e) {
          console.error('[AccountClosedTrades] Error getting accountId for copy trading account:', e)
        }
      }
      
      if (!accountId) {
        console.warn(`[AccountClosedTrades] No accountId found for account link: ${account.id}`)
        continue
      }
      
      // Use userId as primary filter - this ensures data isolation
      // Pass accountId as fallback for old trades that don't have userId set
      const trades = await getTradeHistory({
        ...filters,
        userId: userId, // Primary filter for data isolation
        accountId: accountId // Pass as fallback for old trades without userId
      })
      console.log(`[AccountClosedTrades] Found ${trades.length} trades for accountLinkId: ${account.id}`)
      allTrades.push(...trades)
    }
    
    console.log(`[AccountClosedTrades] Total trades found: ${allTrades.length}`)

    // Remove duplicates (same positionId) - prefer trades with SL/TP
    const tradesByPosition = new Map<string, MT5TradeHistory>()
    
    for (const trade of allTrades) {
      const existing = tradesByPosition.get(trade.positionId)
      
      if (!existing) {
        // First trade with this positionId
        tradesByPosition.set(trade.positionId, trade)
        console.log(`[AccountClosedTrades] 🆕 First entry for position ${trade.positionId}:`, {
          id: trade.id,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          userId: (trade as any).userId
        })
      } else {
        // Duplicate found - choose the better one
        const existingHasSLTP = (existing.stopLoss && existing.stopLoss !== 0) || (existing.takeProfit && existing.takeProfit !== 0)
        const newHasSLTP = (trade.stopLoss && trade.stopLoss !== 0) || (trade.takeProfit && trade.takeProfit !== 0)
        
        let shouldReplace = false
        let reason = ''
        
        if (newHasSLTP && !existingHasSLTP) {
          // New has SL/TP, existing doesn't - prefer new
          shouldReplace = true
          reason = 'new has SL/TP, existing does not'
        } else if (!newHasSLTP && existingHasSLTP) {
          // Existing has SL/TP, new doesn't - keep existing
          shouldReplace = false
          reason = 'existing has SL/TP, new does not'
        } else if ((trade as any).userId === userId && (existing as any).userId !== userId) {
          // Both have same SL/TP status, but new matches userId
          shouldReplace = true
          reason = 'new matches userId'
        } else {
          // Keep existing (first one wins if all else equal)
          shouldReplace = false
          reason = 'keeping first entry (all else equal)'
        }
        
        console.log(`[AccountClosedTrades] 🔄 Duplicate position ${trade.positionId}:`, {
          existingId: existing.id,
          existingSLTP: { sl: existing.stopLoss, tp: existing.takeProfit },
          existingHasSLTP,
          newId: trade.id,
          newSLTP: { sl: trade.stopLoss, tp: trade.takeProfit },
          newHasSLTP,
          shouldReplace,
          reason
        })
        
        if (shouldReplace) {
          tradesByPosition.set(trade.positionId, trade)
        }
      }
    }
    
    const uniqueTrades = Array.from(tradesByPosition.values())
    console.log(`[AccountClosedTrades] After deduplication: ${uniqueTrades.length} unique trades`)

    // Sort by close time (newest first)
    return uniqueTrades.sort((a, b) => 
      b.closeTime.getTime() - a.closeTime.getTime()
    )
  } catch (error) {
    console.error('[AccountClosedTrades] Error fetching closed trades:', error)
    throw error
  }
}

/**
 * Get closed trades statistics for user's linked accounts
 */
export async function getAccountClosedTradesStats(
  userId: string,
  accountLinkId?: string,
  filters: Omit<TradeHistoryFilters, 'accountId' | 'userId'> = {}
): Promise<TradeHistoryStats> {
  try {
    const trades = await getAccountClosedTrades(userId, accountLinkId, filters)
    
    // Calculate stats from trades
    const totalTrades = trades.length
    const winningTrades = trades.filter(t => t.profit > 0).length
    const losingTrades = trades.filter(t => t.profit < 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    // Correct pips to match profit sign before calculating total
    const totalPips = trades.reduce((sum, t) => {
      let correctedPips = t.pips
      // If profit and pips have opposite signs, flip pips sign to match profit
      if ((t.profit < 0 && t.pips > 0) || (t.profit > 0 && t.pips < 0)) {
        correctedPips = -t.pips
      }
      return sum + correctedPips
    }, 0)
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
    console.error('[AccountClosedTrades] Error calculating stats:', error)
    throw error
  }
}

/**
 * Get unique symbols from user's closed trades
 */
export async function getAccountClosedTradesSymbols(
  userId: string,
  accountLinkId?: string
): Promise<string[]> {
  try {
    const trades = await getAccountClosedTrades(userId, accountLinkId)
    const symbols = [...new Set(trades.map(t => t.symbol))]
    return symbols.sort()
  } catch (error) {
    console.error('[AccountClosedTrades] Error getting symbols:', error)
    return []
  }
}


