import { Trade } from '@/types/trade'
import { format, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'

export interface AnalyticsData {
  totalPnL: number
  accountBalance: number
  winRate: number
  totalTrades: number
  breakEvenThreshold: number
  
  // Winners/Losers
  totalWinners: number
  totalLosers: number
  bestWin: number
  worstLoss: number
  averageWin: number
  averageLoss: number
  avgWinDuration: string
  avgLossDuration: string
  maxConsecutiveWins: number
  maxConsecutiveLosses: number
  avgConsecutiveWins: number
  avgConsecutiveLosses: number
  
  // P&L over time
  pnlOverTime: { date: string; pnl: number; trade?: Trade }[]
  
  // Performance by side
  buyTrades: number
  sellTrades: number
  buyWinRate: number
  sellWinRate: number
  
  // Performance by session
  sessionData: {
    session: string
    winRate: number
    totalTrades: number
    avgRR: number
    profit: number
  }[]
  
  // Performance by time (hourly)
  hourlyData: { hour: string; profit: number }[]
  
  // Performance by day
  dailyData: {
    day: string
    profit: number
    winRate: number
    trades: number
  }[]
  
  // Performance by month
  monthlyData: {
    month: string
    year: number
    profit: number
    percentage: number
    trades: number
  }[]
  
  // Calendar data
  calendarData: {
    date: string
    profit: number
    trades: number
    tradesList: Trade[]
  }[]
  
  // Trade frequency
  tradesPerDay: { label: string; count: number }[]
  tradesPerWeek: { label: string; count: number }[]
  tradesPerMonth: { label: string; count: number }[]
}

export const calculateAnalytics = (trades: Trade[], initialBalance?: number, profileStartingBalance?: number): AnalyticsData => {
  // Filter to only include closed trades for analytics (CLOSED, CLOSE, LOSS, BREAKEVEN statuses)
  const closedTrades = trades.filter(t => ['CLOSED', 'CLOSE', 'LOSS', 'BREAKEVEN'].includes(t.status))
  
  // Basic metrics (only from closed trades)
  const totalTrades = closedTrades.length
  const winningTrades = closedTrades.filter(t => t.result > 0)
  const losingTrades = closedTrades.filter(t => t.result < 0)
  const breakEvenTrades = closedTrades.filter(t => t.result === 0)
  const totalWinners = winningTrades.length
  const totalLosers = losingTrades.length
  const totalBreakEven = breakEvenTrades.length
  
  const totalPnL = closedTrades.reduce((sum, t) => sum + t.profit, 0)
  
  // Calculate actual account balance from trade data
  let actualInitialBalance = profileStartingBalance || initialBalance || 0
  if (!profileStartingBalance && !initialBalance && closedTrades.length > 0) {
    // If no initial balance provided, estimate based on trade sizes
    // Look at the lot sizes and risk amounts to estimate starting capital
    const avgLotSize = closedTrades.reduce((sum, t) => sum + (t.lotSize || 0.1), 0) / closedTrades.length
    const avgRisk = closedTrades.reduce((sum, t) => sum + (t.risk || 0), 0) / closedTrades.length
    
    // Estimate initial balance based on typical risk management (1-2% risk per trade)
    // If average risk is reasonable, use it to estimate starting capital
    if (avgRisk > 0) {
      actualInitialBalance = Math.max(1000, avgRisk * 100) // Assume 1% risk
    } else {
      // Fallback: estimate based on lot sizes (typical starting capital for 0.1 lots)
      actualInitialBalance = Math.max(1000, avgLotSize * 10000)
    }
  }
  
  const accountBalance = actualInitialBalance + totalPnL
  const winRate = totalTrades > 0 ? (totalWinners / totalTrades) * 100 : 0
  
  // Best/Worst/Average
  const bestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(t => t.pips)) 
    : 0
  const worstLoss = losingTrades.length > 0 
    ? Math.min(...losingTrades.map(t => t.pips)) 
    : 0
  const averageWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.pips, 0) / winningTrades.length
    : 0
  const averageLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + t.pips, 0) / losingTrades.length
    : 0
  
  // Consecutive wins/losses
  const { maxWins, maxLosses, avgWins, avgLosses } = calculateConsecutiveStreaks(closedTrades)
  
  // P&L over time (cumulative) - only closed trades
  const sortedTrades = [...closedTrades].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`)
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`)
    return dateA.getTime() - dateB.getTime()
  })
  
  let cumulativePnL = 0
  const pnlOverTime = sortedTrades.map(trade => {
    cumulativePnL += trade.profit
    return {
      date: format(parseISO(trade.date), 'MMM dd'),
      pnl: cumulativePnL,
      trade
    }
  })
  
  // Performance by side (BUY/SELL) - only closed trades
  const buyTrades = closedTrades.filter(t => t.type === 'BUY').length
  const sellTrades = closedTrades.filter(t => t.type === 'SELL').length
  const buyWins = closedTrades.filter(t => t.type === 'BUY' && t.result > 0).length
  const sellWins = closedTrades.filter(t => t.type === 'SELL' && t.result > 0).length
  const buyWinRate = buyTrades > 0 ? (buyWins / buyTrades) * 100 : 0
  const sellWinRate = sellTrades > 0 ? (sellWins / sellTrades) * 100 : 0
  
  // Performance by session - only closed trades
  const sessionData = calculateSessionPerformance(closedTrades)
  
  // Performance by time (hourly) - only closed trades
  const hourlyData = calculateHourlyPerformance(closedTrades)
  
  // Performance by day of week - only closed trades
  const dailyData = calculateDailyPerformance(closedTrades)
  
  // Performance by month - only closed trades
  const monthlyData = calculateMonthlyPerformance(closedTrades, actualInitialBalance)
  
  // Calendar data - only closed trades
  const calendarData = calculateCalendarData(closedTrades)
  
  // Trade frequency - only closed trades
  const { tradesPerDay, tradesPerWeek, tradesPerMonth } = calculateTradeFrequency(closedTrades)
  
  return {
    totalPnL,
    accountBalance,
    winRate,
    totalTrades,
    breakEvenThreshold: 0, // Can be customized
    totalWinners,
    totalLosers,
    bestWin,
    worstLoss,
    averageWin,
    averageLoss,
    avgWinDuration: '1d 10h 42m', // Placeholder - calculate from actual trade data
    avgLossDuration: '0h 0m',
    maxConsecutiveWins: maxWins,
    maxConsecutiveLosses: maxLosses,
    avgConsecutiveWins: avgWins,
    avgConsecutiveLosses: avgLosses,
    pnlOverTime,
    buyTrades,
    sellTrades,
    buyWinRate,
    sellWinRate,
    sessionData,
    hourlyData,
    dailyData,
    monthlyData,
    calendarData,
    tradesPerDay,
    tradesPerWeek,
    tradesPerMonth
  }
}

const calculateConsecutiveStreaks = (trades: Trade[]) => {
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`)
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`)
    return dateA.getTime() - dateB.getTime()
  })
  
  let currentWinStreak = 0
  let currentLossStreak = 0
  let maxWins = 0
  let maxLosses = 0
  let winStreaks: number[] = []
  let lossStreaks: number[] = []
  
  sortedTrades.forEach(trade => {
    if (trade.result > 0) {
      currentWinStreak++
      if (currentLossStreak > 0) {
        lossStreaks.push(currentLossStreak)
        currentLossStreak = 0
      }
      maxWins = Math.max(maxWins, currentWinStreak)
    } else if (trade.result < 0) {
      currentLossStreak++
      if (currentWinStreak > 0) {
        winStreaks.push(currentWinStreak)
        currentWinStreak = 0
      }
      maxLosses = Math.max(maxLosses, currentLossStreak)
    }
  })
  
  // Push final streaks
  if (currentWinStreak > 0) winStreaks.push(currentWinStreak)
  if (currentLossStreak > 0) lossStreaks.push(currentLossStreak)
  
  const avgWins = winStreaks.length > 0 
    ? winStreaks.reduce((a, b) => a + b, 0) / winStreaks.length 
    : 0
  const avgLosses = lossStreaks.length > 0 
    ? lossStreaks.reduce((a, b) => a + b, 0) / lossStreaks.length 
    : 0
  
  return { maxWins, maxLosses, avgWins, avgLosses }
}

const calculateSessionPerformance = (trades: Trade[]) => {
  const sessions = ['New York', 'Asia', 'London', 'Out Of Session']
  
  return sessions.map(session => {
    const sessionTrades = trades.filter(t => {
      const sessionKillZone = t.ictAnalysis?.sessionKillZone?.toLowerCase() || ''
      if (session === 'New York') return sessionKillZone.includes('newyork') || sessionKillZone.includes('new york')
      if (session === 'Asia') return sessionKillZone.includes('asia')
      if (session === 'London') return sessionKillZone.includes('london')
      if (session === 'Out Of Session') return !sessionKillZone || sessionKillZone === ''
      return false
    })
    
    const totalTrades = sessionTrades.length
    const wins = sessionTrades.filter(t => t.result > 0).length
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
    const avgRR = totalTrades > 0 
      ? sessionTrades.reduce((sum, t) => sum + t.rr, 0) / totalTrades 
      : 0
    const profit = sessionTrades.reduce((sum, t) => sum + t.profit, 0)
    
    return {
      session,
      winRate,
      totalTrades,
      avgRR,
      profit
    }
  })
}

const calculateHourlyPerformance = (trades: Trade[]) => {
  const hourlyMap = new Map<number, number>()
  
  trades.forEach(trade => {
    const hour = trade.time ? parseInt(trade.time.split(':')[0]) : 0
    const currentProfit = hourlyMap.get(hour) || 0
    hourlyMap.set(hour, currentProfit + trade.profit)
  })
  
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    profit: hourlyMap.get(i) || 0
  }))
  
  return hourlyData.filter(h => h.profit !== 0)
}

const calculateDailyPerformance = (trades: Trade[]) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dailyMap = new Map<number, { profit: number; wins: number; total: number }>()
  
  trades.forEach(trade => {
    const dayOfWeek = parseISO(trade.date).getDay()
    const current = dailyMap.get(dayOfWeek) || { profit: 0, wins: 0, total: 0 }
    dailyMap.set(dayOfWeek, {
      profit: current.profit + trade.profit,
      wins: current.wins + (trade.result > 0 ? 1 : 0),
      total: current.total + 1
    })
  })
  
  return days.map((day, index) => {
    const data = dailyMap.get(index) || { profit: 0, wins: 0, total: 0 }
    return {
      day,
      profit: data.profit,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      trades: data.total
    }
  })
}

const calculateMonthlyPerformance = (trades: Trade[], initialBalance: number = 10000) => {
  const monthlyMap = new Map<string, { profit: number; trades: number }>()
  
  trades.forEach(trade => {
    const date = parseISO(trade.date)
    const key = format(date, 'yyyy-MM')
    const current = monthlyMap.get(key) || { profit: 0, trades: 0 }
    monthlyMap.set(key, {
      profit: current.profit + trade.profit,
      trades: current.trades + 1
    })
  })
  
  return Array.from(monthlyMap.entries()).map(([key, data]) => {
    const [year, month] = key.split('-')
    const percentage = initialBalance > 0 ? (data.profit / initialBalance) * 100 : 0
    
    return {
      month: format(new Date(parseInt(year), parseInt(month) - 1), 'MMM'),
      year: parseInt(year),
      profit: data.profit,
      percentage,
      trades: data.trades
    }
  })
}

const calculateCalendarData = (trades: Trade[]) => {
  const calendarMap = new Map<string, { profit: number; trades: Trade[] }>()
  
  trades.forEach(trade => {
    const dateKey = trade.date
    const current = calendarMap.get(dateKey) || { profit: 0, trades: [] }
    calendarMap.set(dateKey, {
      profit: current.profit + trade.profit,
      trades: [...current.trades, trade]
    })
  })
  
  return Array.from(calendarMap.entries()).map(([date, data]) => ({
    date,
    profit: data.profit,
    trades: data.trades.length,
    tradesList: data.trades
  }))
}

const calculateTradeFrequency = (trades: Trade[]) => {
  // Group by day
  const dailyMap = new Map<string, number>()
  trades.forEach(trade => {
    const day = format(parseISO(trade.date), 'EEEE')
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
  })
  
  // Group by week
  const weeklyMap = new Map<string, number>()
  trades.forEach(trade => {
    const week = `Week ${format(parseISO(trade.date), 'w')}`
    weeklyMap.set(week, (weeklyMap.get(week) || 0) + 1)
  })
  
  // Group by month
  const monthlyMap = new Map<string, number>()
  trades.forEach(trade => {
    const month = format(parseISO(trade.date), 'MMMM')
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1)
  })
  
  const tradesPerDay = Array.from(dailyMap.entries()).map(([label, count]) => ({ label, count }))
  const tradesPerWeek = Array.from(weeklyMap.entries()).map(([label, count]) => ({ label, count }))
  const tradesPerMonth = Array.from(monthlyMap.entries()).map(([label, count]) => ({ label, count }))
  
  // Calculate averages
  const avgPerDay = tradesPerDay.length > 0 
    ? tradesPerDay.reduce((sum, d) => sum + d.count, 0) / tradesPerDay.length 
    : 0
  const avgPerWeek = tradesPerWeek.length > 0 
    ? tradesPerWeek.reduce((sum, w) => sum + w.count, 0) / tradesPerWeek.length 
    : 0
  const avgPerMonth = tradesPerMonth.length > 0 
    ? tradesPerMonth.reduce((sum, m) => sum + m.count, 0) / tradesPerMonth.length 
    : 0
  
  return { 
    tradesPerDay: tradesPerDay.slice(0, 7),
    tradesPerWeek: tradesPerWeek.slice(0, 10), 
    tradesPerMonth: tradesPerMonth.slice(0, 12)
  }
}

