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
  
  // Enhanced metrics (new)
  bestTimeAnalysis?: BestTimeAnalysis
  riskMetrics?: RiskMetrics
  optimizationInsights?: OptimizationInsights
  expectancy?: number
  profitFactor?: number
  netProfit?: number
  averageRR?: number
}

// Best Time to Trade Analysis
export interface BestTimeAnalysis {
  hourlyPerformance: {
    hour: number
    hourLabel: string
    profit: number
    winRate: number
    tradeCount: number
    profitFactor: number
    avgRR: number
  }[]
  bestHours: string[] // Top 5 hours
  worstHours: string[] // Bottom 5 hours
  optimalWindows: {
    start: string
    end: string
    profit: number
    winRate: number
    tradeCount: number
  }[]
  recommendations: string[]
  heatmapData: {
    hour: number
    day: number
    dayLabel: string
    profit: number
    winRate: number
    tradeCount: number
  }[]
}

// Advanced Risk Metrics
export interface RiskMetrics {
  maxDrawdown: number
  maxDrawdownPercent: number
  recoveryFactor: number
  riskOfRuin: number
  averageRisk: number
  sharpeRatio: number
  expectancy: number
  drawdownPeriods: {
    start: Date
    end: Date
    depth: number
    depthPercent: number
  }[]
  equityCurve: {
    date: Date
    equity: number
    drawdown: number
    drawdownPercent: number
  }[]
}

// Performance Optimization Insights
export interface OptimizationInsights {
  bestPairs: {
    symbol: string
    profit: number
    winRate: number
    trades: number
    avgRR: number
    profitFactor: number
  }[]
  optimalDuration: {
    duration: string
    profit: number
    winRate: number
    trades: number
  }
  bestTradeSize: {
    size: string
    profit: number
    winRate: number
    trades: number
  }
  monthlyConsistency: number
  bestDay: {
    day: string
    profit: number
    winRate: number
    trades: number
  }
  bestMonth: {
    month: string
    profit: number
    winRate: number
    trades: number
  }
  recommendations: string[]
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
  
  // Calculate profit factor
  const totalWins = winningTrades.reduce((sum, t) => sum + Math.abs(t.profit), 0)
  const totalLosses = losingTrades.reduce((sum, t) => sum + Math.abs(t.profit), 0)
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0
  
  // Calculate average R:R
  const tradesWithRR = closedTrades.filter(t => t.rr && t.rr > 0)
  const averageRR = tradesWithRR.length > 0
    ? tradesWithRR.reduce((sum, t) => sum + (t.rr || 0), 0) / tradesWithRR.length
    : 0
  
  // Calculate expectancy
  const expectancy = calculateExpectancy(closedTrades)
  
  // Enhanced analytics
  const bestTimeAnalysis = calculateBestTradingTimes(closedTrades)
  const riskMetrics = calculateAdvancedRiskMetrics(closedTrades, actualInitialBalance, pnlOverTime)
  const optimizationInsights = calculatePerformanceOptimization(closedTrades, dailyData, monthlyData)
  
  return {
    totalPnL,
    netProfit: totalPnL,
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
    tradesPerMonth,
    // Enhanced metrics
    bestTimeAnalysis,
    riskMetrics,
    optimizationInsights,
    expectancy,
    profitFactor,
    averageRR
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

// Calculate Best Trading Times
function calculateBestTradingTimes(trades: Trade[]): BestTimeAnalysis {
  // Hourly performance with detailed metrics
  const hourlyMap = new Map<number, {
    profit: number
    wins: number
    losses: number
    trades: Trade[]
    totalRR: number
    rrCount: number
  }>()
  
  // Day x Hour heatmap data
  const heatmapMap = new Map<string, {
    profit: number
    wins: number
    losses: number
    trades: Trade[]
  }>()
  
  trades.forEach(trade => {
    const tradeDate = parseISO(trade.date)
    const dayOfWeek = tradeDate.getDay()
    const hour = trade.time ? parseInt(trade.time.split(':')[0]) : 0
    
    // Hourly aggregation
    const hourData = hourlyMap.get(hour) || { profit: 0, wins: 0, losses: 0, trades: [], totalRR: 0, rrCount: 0 }
    hourData.profit += trade.profit
    if (trade.result > 0) hourData.wins++
    else if (trade.result < 0) hourData.losses++
    hourData.trades.push(trade)
    if (trade.rr && trade.rr > 0) {
      hourData.totalRR += trade.rr
      hourData.rrCount++
    }
    hourlyMap.set(hour, hourData)
    
    // Heatmap aggregation (day x hour)
    const heatmapKey = `${dayOfWeek}-${hour}`
    const heatmapData = heatmapMap.get(heatmapKey) || { profit: 0, wins: 0, losses: 0, trades: [] }
    heatmapData.profit += trade.profit
    if (trade.result > 0) heatmapData.wins++
    else if (trade.result < 0) heatmapData.losses++
    heatmapData.trades.push(trade)
    heatmapMap.set(heatmapKey, heatmapData)
  })
  
  // Build hourly performance array
  const hourlyPerformance = Array.from({ length: 24 }, (_, hour) => {
    const data = hourlyMap.get(hour) || { profit: 0, wins: 0, losses: 0, trades: [], totalRR: 0, rrCount: 0 }
    const totalTrades = data.trades.length
    const winRate = totalTrades > 0 ? (data.wins / totalTrades) * 100 : 0
    const wins = data.wins > 0 ? data.wins : 1
    const losses = data.losses > 0 ? data.losses : 1
    const avgWin = data.wins > 0 ? data.trades.filter(t => t.result > 0).reduce((sum, t) => sum + Math.abs(t.profit), 0) / data.wins : 0
    const avgLoss = data.losses > 0 ? data.trades.filter(t => t.result < 0).reduce((sum, t) => sum + Math.abs(t.profit), 0) / data.losses : 0
    const profitFactor = avgLoss > 0 ? (avgWin * data.wins) / (avgLoss * data.losses) : data.wins > 0 ? 999 : 0
    const avgRR = data.rrCount > 0 ? data.totalRR / data.rrCount : 0
    
    return {
      hour,
      hourLabel: `${hour.toString().padStart(2, '0')}:00`,
      profit: data.profit,
      winRate,
      tradeCount: totalTrades,
      profitFactor,
      avgRR
    }
  }).filter(h => h.tradeCount > 0)
  
  // Find best and worst hours
  const sortedByProfit = [...hourlyPerformance].sort((a, b) => b.profit - a.profit)
  const bestHours = sortedByProfit.slice(0, 5).map(h => h.hourLabel)
  const worstHours = sortedByProfit.slice(-5).reverse().map(h => h.hourLabel)
  
  // Find optimal trading windows (2-3 hour windows)
  const optimalWindows: BestTimeAnalysis['optimalWindows'] = []
  for (let start = 0; start < 22; start++) {
    const end = start + 2
    const windowTrades = hourlyPerformance.filter(h => h.hour >= start && h.hour <= end)
    if (windowTrades.length > 0) {
      const totalProfit = windowTrades.reduce((sum, h) => sum + h.profit, 0)
      const totalTrades = windowTrades.reduce((sum, h) => sum + h.tradeCount, 0)
      const totalWins = windowTrades.reduce((sum, h) => sum + (h.tradeCount * h.winRate / 100), 0)
      const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0
      
      if (totalTrades >= 3) { // Minimum 3 trades to consider
        optimalWindows.push({
          start: `${start.toString().padStart(2, '0')}:00`,
          end: `${end.toString().padStart(2, '0')}:00`,
          profit: totalProfit,
          winRate,
          tradeCount: totalTrades
        })
      }
    }
  }
  optimalWindows.sort((a, b) => b.profit - a.profit)
  
  // Build heatmap data
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const heatmapData: BestTimeAnalysis['heatmapData'] = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`
      const data = heatmapMap.get(key)
      if (data && data.trades.length > 0) {
        const totalTrades = data.trades.length
        const winRate = totalTrades > 0 ? (data.wins / totalTrades) * 100 : 0
        heatmapData.push({
          hour,
          day,
          dayLabel: days[day],
          profit: data.profit,
          winRate,
          tradeCount: totalTrades
        })
      }
    }
  }
  
  // Generate recommendations
  const recommendations: string[] = []
  if (bestHours.length > 0) {
    recommendations.push(`Best trading hours: ${bestHours.slice(0, 3).join(', ')}`)
  }
  if (worstHours.length > 0) {
    recommendations.push(`Avoid trading during: ${worstHours.slice(0, 3).join(', ')}`)
  }
  if (optimalWindows.length > 0) {
    const bestWindow = optimalWindows[0]
    recommendations.push(`Optimal trading window: ${bestWindow.start} - ${bestWindow.end} (${bestWindow.winRate.toFixed(1)}% win rate)`)
  }
  const bestHourData = hourlyPerformance.find(h => h.profit === Math.max(...hourlyPerformance.map(h => h.profit)))
  if (bestHourData) {
    recommendations.push(`Peak performance at ${bestHourData.hourLabel} with ${bestHourData.winRate.toFixed(1)}% win rate`)
  }
  
  return {
    hourlyPerformance,
    bestHours,
    worstHours,
    optimalWindows: optimalWindows.slice(0, 5),
    recommendations,
    heatmapData
  }
}

// Calculate Advanced Risk Metrics
function calculateAdvancedRiskMetrics(
  trades: Trade[],
  initialBalance: number,
  pnlOverTime: { date: string; pnl: number; trade?: Trade }[]
): RiskMetrics {
  // Calculate equity curve
  let currentEquity = initialBalance
  const equityCurve: RiskMetrics['equityCurve'] = []
  let peakEquity = initialBalance
  let maxDrawdown = 0
  let maxDrawdownPercent = 0
  const drawdownPeriods: RiskMetrics['drawdownPeriods'] = []
  let drawdownStart: Date | null = null
  let drawdownDepth = 0
  let drawdownDepthPercent = 0
  
  // Sort trades by date
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`)
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`)
    return dateA.getTime() - dateB.getTime()
  })
  
  sortedTrades.forEach(trade => {
    currentEquity += trade.profit
    const tradeDate = new Date(`${trade.date}T${trade.time || '00:00'}`)
    
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity
      if (drawdownStart) {
        // End of drawdown period
        drawdownPeriods.push({
          start: drawdownStart,
          end: tradeDate,
          depth: drawdownDepth,
          depthPercent: drawdownDepthPercent
        })
        drawdownStart = null
        drawdownDepth = 0
        drawdownDepthPercent = 0
      }
    } else {
      const drawdown = peakEquity - currentEquity
      const drawdownPct = peakEquity > 0 ? (drawdown / peakEquity) * 100 : 0
      
      if (!drawdownStart) {
        drawdownStart = tradeDate
      }
      if (drawdown > drawdownDepth) {
        drawdownDepth = drawdown
        drawdownDepthPercent = drawdownPct
      }
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
        maxDrawdownPercent = drawdownPct
      }
    }
    
    equityCurve.push({
      date: tradeDate,
      equity: currentEquity,
      drawdown: peakEquity - currentEquity,
      drawdownPercent: peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0
    })
  })
  
  // Close any open drawdown period
  if (drawdownStart && sortedTrades.length > 0) {
    const lastTrade = sortedTrades[sortedTrades.length - 1]
    const lastDate = new Date(`${lastTrade.date}T${lastTrade.time || '00:00'}`)
    drawdownPeriods.push({
      start: drawdownStart,
      end: lastDate,
      depth: drawdownDepth,
      depthPercent: drawdownDepthPercent
    })
  }
  
  // Calculate recovery factor
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0)
  const recoveryFactor = maxDrawdown > 0 ? totalProfit / maxDrawdown : totalProfit > 0 ? 999 : 0
  
  // Calculate average risk per trade
  const tradesWithRisk = trades.filter(t => t.risk && t.risk > 0)
  const averageRisk = tradesWithRisk.length > 0
    ? tradesWithRisk.reduce((sum, t) => sum + (t.risk || 0), 0) / tradesWithRisk.length
    : 0
  
  // Calculate risk of ruin (simplified)
  const winRate = trades.length > 0 ? trades.filter(t => t.result > 0).length / trades.length : 0
  const avgWin = trades.filter(t => t.result > 0).length > 0
    ? trades.filter(t => t.result > 0).reduce((sum, t) => sum + Math.abs(t.profit), 0) / trades.filter(t => t.result > 0).length
    : 0
  const avgLoss = trades.filter(t => t.result < 0).length > 0
    ? trades.filter(t => t.result < 0).reduce((sum, t) => sum + Math.abs(t.profit), 0) / trades.filter(t => t.result < 0).length
    : 0
  
  // Simplified risk of ruin calculation
  let riskOfRuin = 0
  if (winRate > 0 && winRate < 1 && avgLoss > 0) {
    const riskRewardRatio = avgWin / avgLoss
    if (riskRewardRatio > 0) {
      // Kelly Criterion based approximation
      const kelly = (winRate * riskRewardRatio - (1 - winRate)) / riskRewardRatio
      riskOfRuin = kelly < 0 ? 100 : Math.max(0, Math.min(100, (1 - kelly) * 100))
    }
  }
  
  // Calculate Sharpe Ratio (simplified - requires risk-free rate, using 0)
  const returns = equityCurve.length > 1
    ? equityCurve.map((point, i) => {
        if (i === 0) return 0
        const prevEquity = equityCurve[i - 1].equity
        return prevEquity > 0 ? ((point.equity - prevEquity) / prevEquity) * 100 : 0
      }).filter(r => r !== 0)
    : []
  const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0
  const variance = returns.length > 0
    ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    : 0
  const stdDev = Math.sqrt(variance)
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) : 0
  
  // Calculate expectancy
  const expectancy = calculateExpectancy(trades)
  
  return {
    maxDrawdown,
    maxDrawdownPercent,
    recoveryFactor,
    riskOfRuin,
    averageRisk,
    sharpeRatio,
    expectancy,
    drawdownPeriods,
    equityCurve
  }
}

// Calculate Performance Optimization
function calculatePerformanceOptimization(
  trades: Trade[],
  dailyData: AnalyticsData['dailyData'],
  monthlyData: AnalyticsData['monthlyData']
): OptimizationInsights {
  // Best performing pairs
  const pairMap = new Map<string, {
    profit: number
    wins: number
    losses: number
    trades: Trade[]
    totalRR: number
    rrCount: number
  }>()
  
  trades.forEach(trade => {
    const symbol = trade.pair || 'Unknown'
    const data = pairMap.get(symbol) || { profit: 0, wins: 0, losses: 0, trades: [], totalRR: 0, rrCount: 0 }
    data.profit += trade.profit
    if (trade.result > 0) data.wins++
    else if (trade.result < 0) data.losses++
    data.trades.push(trade)
    if (trade.rr && trade.rr > 0) {
      data.totalRR += trade.rr
      data.rrCount++
    }
    pairMap.set(symbol, data)
  })
  
  const bestPairs = Array.from(pairMap.entries())
    .map(([symbol, data]) => {
      const totalTrades = data.trades.length
      const winRate = totalTrades > 0 ? (data.wins / totalTrades) * 100 : 0
      const avgRR = data.rrCount > 0 ? data.totalRR / data.rrCount : 0
      const wins = data.wins > 0 ? data.wins : 1
      const losses = data.losses > 0 ? data.losses : 1
      const avgWin = data.wins > 0 ? data.trades.filter(t => t.result > 0).reduce((sum, t) => sum + Math.abs(t.profit), 0) / data.wins : 0
      const avgLoss = data.losses > 0 ? data.trades.filter(t => t.result < 0).reduce((sum, t) => sum + Math.abs(t.profit), 0) / data.losses : 0
      const profitFactor = avgLoss > 0 ? (avgWin * data.wins) / (avgLoss * data.losses) : data.wins > 0 ? 999 : 0
      
      return {
        symbol,
        profit: data.profit,
        winRate,
        trades: totalTrades,
        avgRR,
        profitFactor
      }
    })
    .filter(p => p.trades >= 3) // Minimum 3 trades
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10)
  
  // Optimal trade duration
  const durationMap = new Map<string, {
    profit: number
    wins: number
    trades: Trade[]
  }>()
  
  trades.forEach(trade => {
    // Categorize duration (simplified - would need actual duration data)
    let duration = 'Unknown'
    if (trade.duration !== undefined) {
      const hours = trade.duration / 3600
      if (hours < 1) duration = '< 1 hour'
      else if (hours < 4) duration = '1-4 hours'
      else if (hours < 24) duration = '4-24 hours'
      else if (hours < 168) duration = '1-7 days'
      else duration = '> 7 days'
    }
    
    const data = durationMap.get(duration) || { profit: 0, wins: 0, trades: [] }
    data.profit += trade.profit
    if (trade.result > 0) data.wins++
    data.trades.push(trade)
    durationMap.set(duration, data)
  })
  
  const optimalDuration = Array.from(durationMap.entries())
    .map(([duration, data]) => {
      const totalTrades = data.trades.length
      const winRate = totalTrades > 0 ? (data.wins / totalTrades) * 100 : 0
      return {
        duration,
        profit: data.profit,
        winRate,
        trades: totalTrades
      }
    })
    .filter(d => d.trades >= 3)
    .sort((a, b) => b.profit - a.profit)[0] || { duration: 'Unknown', profit: 0, winRate: 0, trades: 0 }
  
  // Best trade size (using lot size if available)
  const sizeMap = new Map<string, {
    profit: number
    wins: number
    trades: Trade[]
  }>()
  
  trades.forEach(trade => {
    const lotSize = trade.lotSize || 0.1
    let size = 'Unknown'
    if (lotSize < 0.1) size = '< 0.1'
    else if (lotSize < 0.5) size = '0.1-0.5'
    else if (lotSize < 1) size = '0.5-1.0'
    else if (lotSize < 2) size = '1.0-2.0'
    else size = '> 2.0'
    
    const data = sizeMap.get(size) || { profit: 0, wins: 0, trades: [] }
    data.profit += trade.profit
    if (trade.result > 0) data.wins++
    data.trades.push(trade)
    sizeMap.set(size, data)
  })
  
  const bestTradeSize = Array.from(sizeMap.entries())
    .map(([size, data]) => {
      const totalTrades = data.trades.length
      const winRate = totalTrades > 0 ? (data.wins / totalTrades) * 100 : 0
      return {
        size,
        profit: data.profit,
        winRate,
        trades: totalTrades
      }
    })
    .filter(s => s.trades >= 3)
    .sort((a, b) => b.profit - a.profit)[0] || { size: 'Unknown', profit: 0, winRate: 0, trades: 0 }
  
  // Monthly consistency (coefficient of variation of monthly profits)
  const monthlyProfits = monthlyData.map(m => m.profit)
  const avgMonthlyProfit = monthlyProfits.length > 0
    ? monthlyProfits.reduce((sum, p) => sum + p, 0) / monthlyProfits.length
    : 0
  const variance = monthlyProfits.length > 0
    ? monthlyProfits.reduce((sum, p) => sum + Math.pow(p - avgMonthlyProfit, 2), 0) / monthlyProfits.length
    : 0
  const stdDev = Math.sqrt(variance)
  const monthlyConsistency = avgMonthlyProfit > 0 && stdDev > 0
    ? Math.max(0, 100 - (stdDev / Math.abs(avgMonthlyProfit)) * 100)
    : 0
  
  // Best day
  const bestDay = dailyData.length > 0
    ? dailyData.reduce((best, day) => day.profit > best.profit ? day : best, dailyData[0])
    : { day: 'Unknown', profit: 0, winRate: 0, trades: 0 }
  
  // Best month
  const bestMonth = monthlyData.length > 0
    ? monthlyData.reduce((best, month) => month.profit > best.profit ? month : best, monthlyData[0])
    : { month: 'Unknown', year: 0, profit: 0, percentage: 0, trades: 0 }
  
  // Generate recommendations
  const recommendations: string[] = []
  if (bestPairs.length > 0) {
    const topPair = bestPairs[0]
    recommendations.push(`Best performing pair: ${topPair.symbol} (${topPair.winRate.toFixed(1)}% win rate, $${topPair.profit.toFixed(2)} profit)`)
  }
  if (optimalDuration.trades > 0) {
    recommendations.push(`Optimal trade duration: ${optimalDuration.duration} (${optimalDuration.winRate.toFixed(1)}% win rate)`)
  }
  if (bestDay.trades > 0) {
    recommendations.push(`Best trading day: ${bestDay.day} (${bestDay.winRate.toFixed(1)}% win rate)`)
  }
  if (monthlyConsistency > 0) {
    recommendations.push(`Monthly consistency: ${monthlyConsistency.toFixed(1)}%`)
  }
  
  return {
    bestPairs,
    optimalDuration,
    bestTradeSize,
    monthlyConsistency,
    bestDay: {
      day: bestDay.day,
      profit: bestDay.profit,
      winRate: bestDay.winRate,
      trades: bestDay.trades
    },
    bestMonth: {
      month: bestMonth.month,
      profit: bestMonth.profit,
      winRate: 0, // Would need to calculate
      trades: bestMonth.trades
    },
    recommendations
  }
}

// Calculate Expectancy
function calculateExpectancy(trades: Trade[]): number {
  if (trades.length === 0) return 0
  
  const totalTrades = trades.length
  const winningTrades = trades.filter(t => t.result > 0)
  const losingTrades = trades.filter(t => t.result < 0)
  
  const winRate = totalTrades > 0 ? winningTrades.length / totalTrades : 0
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length
    : 0
  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + Math.abs(t.profit), 0) / losingTrades.length
    : 0
  
  // Expectancy = (Win Rate × Average Win) - (Loss Rate × Average Loss)
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss)
  
  return expectancy
}

