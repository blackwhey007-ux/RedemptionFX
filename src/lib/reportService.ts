import { Signal } from '@/types/signal'
import { getSignalsByCategory } from '@/lib/signalService'

export interface ReportMetrics {
  totalPips: number
  winRate: number
  signalsCount: number
  winningSignals: number
  losingSignals: number
  bestSignal: number
  worstSignal: number
  avgWinPips?: number
  avgLossPips?: number
  currentStreak: number
  period: string
  timestamp?: Date
}

export interface ReportData {
  metrics: ReportMetrics
  signals: Signal[] | any[]  // Can be signals or MT5 trades
}

// Get signals for specific time period
const getSignalsForPeriod = async (period: 'daily' | 'weekly' | 'monthly'): Promise<Signal[]> => {
  const allSignals = await getSignalsByCategory('vip', 1000)
  const now = new Date()
  
  let startDate: Date
  
  switch (period) {
    case 'daily':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'monthly':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
  }
  
  return allSignals.filter(signal => {
    const signalDate = new Date(signal.postedAt)
    return signalDate >= startDate && signal.result !== undefined && signal.result !== null
  })
}

// Get MT5 trades for a period
const getMT5TradesForPeriod = async (period: 'daily' | 'weekly' | 'monthly') => {
  const { getTradeHistory } = await import('./mt5TradeHistoryService')
  
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      break
    case 'weekly':
      const dayOfWeek = now.getDay()
      startDate = new Date(now)
      startDate.setDate(now.getDate() - dayOfWeek)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      break
  }
  
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  
  return await getTradeHistory({
    startDate,
    endDate
  } as any)
}

// Calculate metrics from MT5 trades
const calculateMT5Metrics = (trades: any[], period: string): ReportMetrics => {
  const totalTrades = trades.length
  const winningTrades = trades.filter(t => (t.pips || 0) > 0)
  const losingTrades = trades.filter(t => (t.pips || 0) < 0)
  
  const totalPips = trades.reduce((sum, t) => sum + (t.pips || 0), 0)
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0
  const bestTrade = Math.max(...trades.map(t => t.pips || 0), 0)
  const worstTrade = Math.min(...trades.map(t => t.pips || 0), 0)
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + (t.pips || 0), 0) / winningTrades.length 
    : 0
  const avgLoss = losingTrades.length > 0 
    ? losingTrades.reduce((sum, t) => sum + (t.pips || 0), 0) / losingTrades.length 
    : 0
  
  // Calculate current streak
  let currentStreak = 0
  for (let i = trades.length - 1; i >= 0; i--) {
    const pips = trades[i].pips || 0
    if (currentStreak === 0) {
      currentStreak = pips > 0 ? 1 : pips < 0 ? -1 : 0
    } else if ((currentStreak > 0 && pips > 0) || (currentStreak < 0 && pips < 0)) {
      currentStreak += currentStreak > 0 ? 1 : -1
    } else {
      break
    }
  }
  
  return {
    period,
    totalPips: Math.round(totalPips * 10) / 10,
    winRate: Math.round(winRate * 10) / 10,
    signalsCount: totalTrades,
    winningSignals: winningTrades.length,
    losingSignals: losingTrades.length,
    bestSignal: Math.round(bestTrade * 10) / 10,
    worstSignal: Math.round(worstTrade * 10) / 10,
    avgWinPips: Math.round(avgWin * 10) / 10,
    avgLossPips: Math.round(avgLoss * 10) / 10,
    currentStreak,
    timestamp: new Date()
  }
}

// Calculate report metrics
const calculateMetrics = (signals: Signal[], period: string): ReportMetrics => {
  if (signals.length === 0) {
    return {
      totalPips: 0,
      winRate: 0,
      signalsCount: 0,
      winningSignals: 0,
      losingSignals: 0,
      bestSignal: 0,
      worstSignal: 0,
      currentStreak: 0,
      period
    }
  }
  
  const completedSignals = signals.filter(s => s.result !== undefined && s.result !== null)
  const winningSignals = completedSignals.filter(s => (s.result || 0) > 0)
  const losingSignals = completedSignals.filter(s => (s.result || 0) < 0)
  
  const totalPips = completedSignals.reduce((sum, s) => sum + (s.result || 0), 0)
  const winRate = completedSignals.length > 0 ? (winningSignals.length / completedSignals.length) * 100 : 0
  
  const results = completedSignals.map(s => s.result || 0)
  const bestSignal = results.length > 0 ? Math.max(...results) : 0
  const worstSignal = results.length > 0 ? Math.min(...results) : 0
  
  // Calculate current win streak
  const sortedSignals = [...completedSignals].sort((a, b) => 
    new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  )
  
  let currentStreak = 0
  for (const signal of sortedSignals) {
    if ((signal.result || 0) > 0) {
      currentStreak++
    } else {
      break
    }
  }
  
  return {
    totalPips,
    winRate,
    signalsCount: completedSignals.length,
    winningSignals: winningSignals.length,
    losingSignals: losingSignals.length,
    bestSignal,
    worstSignal,
    currentStreak,
    period
  }
}

// Generate VIP report (full details)
const generateVipReport = async (data: ReportData, template?: string): Promise<string> => {
  const { metrics } = data
  const periodText = metrics.period === 'daily' ? 'today' : 
                    metrics.period === 'weekly' ? 'this week' : 'this month'
  
  // Try to use custom template
  if (template) {
    const vars = {
      totalPips: metrics.totalPips > 0 ? `+${metrics.totalPips.toFixed(1)}` : metrics.totalPips.toFixed(1),
      tradesCount: metrics.signalsCount.toString(),
      winCount: metrics.winningSignals.toString(),
      lossCount: metrics.losingSignals.toString(),
      winRate: metrics.winRate.toFixed(1),
      bestTrade: metrics.bestSignal > 0 ? `+${metrics.bestSignal.toFixed(1)}` : metrics.bestSignal.toFixed(1),
      avgWin: metrics.avgWinPips?.toFixed(1) || '0',
      avgLoss: metrics.avgLossPips?.toFixed(1) || '0',
      timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    }
    
    let result = template
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
    return result
  }
  
  // Fallback to default format
  const reportTitle = `📊 VIP RESULTS - ${metrics.period.toUpperCase()} REPORT`
  const separator = '━━━━━━━━━━━━━━━━━━━━━━'
  
  return `${reportTitle}
${separator}

📈 Performance (${periodText})
✅ Total Pips: ${metrics.totalPips > 0 ? '+' : ''}${metrics.totalPips.toFixed(1)}
📊 Win Rate: ${metrics.winRate.toFixed(1)}%
🎯 Trades: ${metrics.signalsCount} (${metrics.winningSignals}W / ${metrics.losingSignals}L)

🏆 Best: ${metrics.bestSignal > 0 ? '+' : ''}${metrics.bestSignal} pips | 📉 Worst: ${metrics.worstSignal} pips
🔥 Streak: ${metrics.currentStreak} ${metrics.currentStreak > 0 ? 'wins' : 'losses'}

⏰ ${new Date().toLocaleString('en-US', { 
  timeZone: 'UTC',
  dateStyle: 'medium',
  timeStyle: 'short'
 })} UTC`
}

// Generate public report (marketing teaser)
const generatePublicReport = (data: ReportData, settings?: any, template?: string): string => {
  const { metrics } = data
  const periodText = metrics.period === 'daily' ? 'today' : 
                    metrics.period === 'weekly' ? 'this week' : 'this month'
  
  // Try to use custom template
  if (template) {
    const vars = {
      period: metrics.period.toUpperCase(),
      periodText,
      totalPips: metrics.totalPips > 0 ? `+${metrics.totalPips.toFixed(1)}` : metrics.totalPips.toFixed(1),
      tradesCount: metrics.signalsCount.toString(),
      winCount: metrics.winningSignals.toString(),
      winRate: metrics.winRate.toFixed(1),
      bestTrade: metrics.bestSignal > 0 ? `+${metrics.bestSignal.toFixed(1)}` : metrics.bestSignal.toFixed(1),
      vipWebsite: settings?.vipWebsiteUrl ? `🌐 ${settings.vipWebsiteUrl}` : '',
      vipContact: settings?.vipTelegramContact ? `📱 ${settings.vipTelegramContact}` : '',
      timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    }
    
    let result = template
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
    return result
  }
  
  // Fallback to default format
  const reportTitle = `🔥 ${metrics.period.toUpperCase()} PERFORMANCE UPDATE`
  const separator = '━━━━━━━━━━━━━━━━━━━━━━'
  
  return `${reportTitle}
${separator}
VIP members gained ${metrics.totalPips > 0 ? '+' : ''}${metrics.totalPips.toFixed(1)} pips ${periodText}! 💰
📊 Win Rate: ${metrics.winRate.toFixed(1)}%
🎯 ${metrics.signalsCount} Trades (${metrics.winningSignals} Winners!)
🏆 Best Trade: ${metrics.bestSignal > 0 ? '+' : ''}${metrics.bestSignal} pips

💎 Join VIP for:
✅ Real-time alerts
✅ Full entry/exit details
✅ Risk management
✅ 24/7 support

🚀 Limited spots!
${settings?.vipWebsiteUrl ? `🌐 Website: ${settings.vipWebsiteUrl}` : ''}
${settings?.vipTelegramContact ? `📱 Contact: ${settings.vipTelegramContact}` : ''}
${!settings?.vipWebsiteUrl && !settings?.vipTelegramContact ? '👉 Contact admin to join VIP' : ''}

⏰ ${new Date().toLocaleString('en-US', { 
  timeZone: 'UTC',
  dateStyle: 'medium',
  timeStyle: 'short'
 })} UTC`
}

// Main export functions - NOW USING MT5 TRADE HISTORY
export const generateDailyReport = async (isPublic: boolean = false, settings?: any): Promise<string> => {
  const trades = await getMT5TradesForPeriod('daily')
  const metrics = calculateMT5Metrics(trades, 'daily')
  const data: ReportData = { metrics, signals: trades }
  
  const template = isPublic ? settings?.publicReportTemplate : settings?.dailyReportTemplate
  return isPublic ? generatePublicReport(data, settings, template) : await generateVipReport(data, template)
}

export const generateWeeklyReport = async (isPublic: boolean = false, settings?: any): Promise<string> => {
  const trades = await getMT5TradesForPeriod('weekly')
  const metrics = calculateMT5Metrics(trades, 'weekly')
  const data: ReportData = { metrics, signals: trades }
  
  const template = isPublic ? settings?.publicReportTemplate : settings?.weeklyReportTemplate
  return isPublic ? generatePublicReport(data, settings, template) : await generateVipReport(data, template)
}

export const generateMonthlyReport = async (isPublic: boolean = false, settings?: any): Promise<string> => {
  const trades = await getMT5TradesForPeriod('monthly')
  const metrics = calculateMT5Metrics(trades, 'monthly')
  const data: ReportData = { metrics, signals: trades }
  
  const template = isPublic ? settings?.publicReportTemplate : settings?.monthlyReportTemplate
  return isPublic ? generatePublicReport(data, settings, template) : await generateVipReport(data, template)
}

// Helper function to get report data for logging
export const getReportData = async (period: 'daily' | 'weekly' | 'monthly'): Promise<ReportData> => {
  const trades = await getMT5TradesForPeriod(period)
  const metrics = calculateMT5Metrics(trades, period)
  return { metrics, signals: trades }
}
