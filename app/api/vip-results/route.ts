import { NextResponse } from 'next/server'
import { getTradeHistory, getTradeHistoryStats, MT5TradeHistory } from '@/lib/mt5TradeHistoryService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    
    const startDate = month && year 
      ? new Date(parseInt(year), parseInt(month), 1)
      : undefined
    const endDate = month && year
      ? new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59)
      : undefined
    
    const [trades, stats] = await Promise.all([
      getTradeHistory({ startDate, endDate, limitCount: 1000 }),
      getTradeHistoryStats({ startDate, endDate })
    ])
    
    // Calculate win streak
    let currentWinStreak = 0
    const sortedTrades = [...trades].sort((a, b) => 
      b.closeTime.getTime() - a.closeTime.getTime()
    )
    for (const trade of sortedTrades) {
      if (trade.profit > 0) currentWinStreak++
      else break
    }
    
    // Group by day
    const dailyMap = new Map()
    trades.forEach(trade => {
      const date = trade.closeTime.toISOString().split('T')[0]
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, pips: 0, profit: 0, trades: [] })
      }
      const day = dailyMap.get(date)
      day.pips += trade.pips
      day.profit += trade.profit
      day.trades.push(trade)
    })
    
    return NextResponse.json({
      success: true,
      stats: {
        totalTrades: stats.totalTrades,
        completedTrades: stats.totalTrades,
        activeTrades: 0,
        winningTrades: stats.winningTrades,
        losingTrades: stats.losingTrades,
        breakevenTrades: trades.filter(t => Math.abs(t.profit) < 1).length,
        totalPips: stats.totalPips,
        totalProfit: stats.totalProfit,
        averageWin: stats.winningTrades > 0 ? trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0) / stats.winningTrades : 0,
        averageLoss: stats.losingTrades > 0 ? Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0) / stats.losingTrades) : 0,
        winRate: stats.winRate,
        profitFactor: stats.profitFactor,
        averageRR: stats.averageRR,
        bestTrade: stats.bestTrade,
        worstTrade: stats.worstTrade,
        currentWinStreak,
        monthlyPips: stats.totalPips,
        monthlyWinRate: stats.winRate,
        syncMethod: 'mt5_live',
        lastUpdated: new Date().toISOString()
      },
      trades,
      dailyData: Array.from(dailyMap.values())
    })
  } catch (error) {
    console.error('Error fetching VIP results:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch VIP results' }, { status: 500 })
  }
}



