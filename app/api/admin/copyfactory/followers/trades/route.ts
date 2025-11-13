import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { getTradeHistory, getTradeHistoryStats, MT5TradeHistory, TradeHistoryStats } from '@/lib/mt5TradeHistoryService'
import { db } from '@/lib/firebaseConfig'
import { collectionGroup, getDocs, query } from 'firebase/firestore'

/**
 * GET /api/admin/copyfactory/followers/trades
 * Get trades for a specific day with account filtering (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') // YYYY-MM-DD
    const masterAccountId = searchParams.get('masterAccountId')
    const accountType = searchParams.get('accountType') || 'all' // 'master' | 'follower' | 'all'
    const followerAccountId = searchParams.get('followerAccountId') || undefined
    const symbol = searchParams.get('symbol') || undefined
    const type = searchParams.get('type') as 'BUY' | 'SELL' | undefined
    const profitLoss = searchParams.get('profitLoss') as 'profit' | 'loss' | 'all' | undefined
    const closedBy = searchParams.get('closedBy') as 'TP' | 'SL' | 'MANUAL' | 'all' | undefined
    const limitCount = parseInt(searchParams.get('limit') || '100')

    if (!dateStr) {
      return NextResponse.json(
        {
          success: false,
          error: 'date parameter is required (YYYY-MM-DD)'
        },
        { status: 400 }
      )
    }

    // Parse date
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        },
        { status: 400 }
      )
    }

    // Set time range for the day
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    console.log(`[TradesEndpoint] Fetching trades for ${dateStr}, accountType=${accountType}, masterAccountId=${masterAccountId}`)

    // Determine which account IDs to fetch
    let accountIds: string[] = []

    if (accountType === 'master' && masterAccountId) {
      accountIds = [masterAccountId]
    } else if (accountType === 'follower') {
      if (followerAccountId) {
        accountIds = [followerAccountId]
      } else {
        // Get all follower account IDs using collectionGroup query
        const copyTradingQuery = query(collectionGroup(db, 'copyTradingAccounts'))
        const snapshot = await getDocs(copyTradingQuery)
        accountIds = snapshot.docs
          .map(doc => doc.data())
          .filter((data: any) => data.status === 'active')
          .map((data: any) => data.accountId)
      }
    } else if (accountType === 'all') {
      // Get both master and followers
      const copyTradingQuery = query(collectionGroup(db, 'copyTradingAccounts'))
      const snapshot = await getDocs(copyTradingQuery)
      const followerIds = snapshot.docs
        .map(doc => doc.data())
        .filter((data: any) => data.status === 'active')
        .map((data: any) => data.accountId)
      
      accountIds = masterAccountId ? [masterAccountId, ...followerIds] : followerIds
    } else {
      // Default: master account only
      accountIds = masterAccountId ? [masterAccountId] : []
    }

    // Fetch trades for all relevant accounts (with batching for performance)
    const allTrades: MT5TradeHistory[] = []
    
    // Batch fetch to avoid overwhelming Firestore
    const BATCH_SIZE = 5
    for (let i = 0; i < accountIds.length; i += BATCH_SIZE) {
      const batch = accountIds.slice(i, i + BATCH_SIZE)
      const batchPromises = batch.map(async (accountId) => {
        try {
          const trades = await getTradeHistory({
            startDate: startOfDay,
            endDate: endOfDay,
            accountId,
            symbol,
            type,
            profitLoss: profitLoss === 'all' ? undefined : profitLoss,
            closedBy: closedBy === 'all' ? undefined : closedBy,
            limitCount
          })
          return trades
        } catch (error) {
          console.error(`[TradesEndpoint] Error fetching trades for account ${accountId}:`, error)
          return [] // Return empty array on error
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      allTrades.push(...batchResults.flat())
    }

    // Sort by close time (newest first)
    allTrades.sort((a, b) => b.closeTime.getTime() - a.closeTime.getTime())

    // Limit results
    const limitedTrades = allTrades.slice(0, limitCount)

    // Calculate statistics
    const stats: TradeHistoryStats = {
      totalTrades: limitedTrades.length,
      winningTrades: limitedTrades.filter(t => t.profit > 0).length,
      losingTrades: limitedTrades.filter(t => t.profit < 0).length,
      breakevenTrades: limitedTrades.filter(t => t.profit === 0).length,
      totalProfit: limitedTrades.reduce((sum, t) => sum + (t.profit || 0), 0),
      totalPips: limitedTrades.reduce((sum, t) => sum + (t.pips || 0), 0),
      winRate: limitedTrades.length > 0
        ? (limitedTrades.filter(t => t.profit > 0).length / limitedTrades.length) * 100
        : 0,
      profitFactor: (() => {
        const wins = limitedTrades.filter(t => t.profit > 0).reduce((sum, t) => sum + Math.abs(t.profit), 0)
        const losses = limitedTrades.filter(t => t.profit < 0).reduce((sum, t) => sum + Math.abs(t.profit), 0)
        return losses > 0 ? wins / losses : wins > 0 ? Infinity : 0
      })(),
      averageDuration: limitedTrades.length > 0
        ? limitedTrades.reduce((sum, t) => sum + (t.duration || 0), 0) / limitedTrades.length
        : 0,
      bestTrade: limitedTrades.length > 0
        ? Math.max(...limitedTrades.map(t => t.profit || 0))
        : 0,
      worstTrade: limitedTrades.length > 0
        ? Math.min(...limitedTrades.map(t => t.profit || 0))
        : 0
    }

    console.log(`[TradesEndpoint] Returning ${limitedTrades.length} trades with stats:`, stats)

    return NextResponse.json({
      success: true,
      data: {
        trades: limitedTrades,
        stats,
        filters: {
          date: dateStr,
          accountType,
          masterAccountId,
          followerAccountId,
          symbol,
          type,
          profitLoss,
          closedBy,
          limit: limitCount
        }
      }
    })
  } catch (error) {
    console.error('[TradesEndpoint] Error fetching trades:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch trades'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

