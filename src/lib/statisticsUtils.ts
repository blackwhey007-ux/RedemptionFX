/**
 * Statistics Utility Functions
 * Helper functions for calculating statistics and metrics
 */

export interface PerformanceMetrics {
  totalProfitLoss: number
  winRate: number
  averageProfit: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  largestWin: number
  largestLoss: number
  averageWin: number
  averageLoss: number
  profitFactor: number
}

export interface RiskMetrics {
  totalExposure: number
  maxDrawdown: number
  currentDrawdown: number
  riskPerAccount: number
  accountsAtRisk: number
}

export interface TradingActivity {
  openPositions: number
  totalVolume: number
  averageTradeSize: number
  activeAccounts: number
  inactiveAccounts: number
}

/**
 * Calculate performance metrics from account data
 */
export function calculatePerformanceMetrics(
  accounts: Array<{
    balance: number
    equity: number
    status: 'success' | 'error'
  }>
): PerformanceMetrics {
  const successfulAccounts = accounts.filter((a) => a.status === 'success')
  
  if (successfulAccounts.length === 0) {
    return {
      totalProfitLoss: 0,
      winRate: 0,
      averageProfit: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      largestWin: 0,
      largestLoss: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0
    }
  }

  // Calculate P/L as equity - balance (simplified, assumes balance was starting balance)
  const profitLosses = successfulAccounts.map((acc) => acc.equity - acc.balance)
  const totalProfitLoss = profitLosses.reduce((sum, pl) => sum + pl, 0)
  const averageProfit = totalProfitLoss / successfulAccounts.length

  const winningTrades = profitLosses.filter((pl) => pl > 0).length
  const losingTrades = profitLosses.filter((pl) => pl < 0).length
  const totalTrades = winningTrades + losingTrades
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  const wins = profitLosses.filter((pl) => pl > 0)
  const losses = profitLosses.filter((pl) => pl < 0)
  const largestWin = wins.length > 0 ? Math.max(...wins) : 0
  const largestLoss = losses.length > 0 ? Math.min(...losses) : 0
  const averageWin = wins.length > 0 ? wins.reduce((sum, w) => sum + w, 0) / wins.length : 0
  const averageLoss = losses.length > 0 ? losses.reduce((sum, l) => sum + l, 0) / losses.length : 0

  const totalWins = wins.reduce((sum, w) => sum + w, 0)
  const totalLosses = Math.abs(losses.reduce((sum, l) => sum + l, 0))
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0

  return {
    totalProfitLoss,
    winRate,
    averageProfit,
    totalTrades,
    winningTrades,
    losingTrades,
    largestWin,
    largestLoss,
    averageWin,
    averageLoss,
    profitFactor
  }
}

/**
 * Calculate risk metrics from account data
 */
export function calculateRiskMetrics(
  accounts: Array<{
    equity: number
    margin: number
    marginLevel: number
    balance: number
    status: 'success' | 'error'
  }>,
  safeMarginLevel: number = 200
): RiskMetrics {
  const successfulAccounts = accounts.filter((a) => a.status === 'success')
  
  if (successfulAccounts.length === 0) {
    return {
      totalExposure: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      riskPerAccount: 0,
      accountsAtRisk: 0
    }
  }

  const totalExposure = successfulAccounts.reduce((sum, acc) => sum + acc.margin, 0)
  const riskPerAccount = totalExposure / successfulAccounts.length

  // Calculate drawdown (equity vs balance)
  const drawdowns = successfulAccounts.map((acc) => {
    if (acc.balance === 0) return 0
    return ((acc.balance - acc.equity) / acc.balance) * 100
  })
  const currentDrawdown = drawdowns.length > 0 ? Math.max(...drawdowns) : 0
  const maxDrawdown = currentDrawdown // Simplified, would need historical data for true max

  const accountsAtRisk = successfulAccounts.filter(
    (acc) => acc.marginLevel > 0 && acc.marginLevel < safeMarginLevel
  ).length

  return {
    totalExposure,
    maxDrawdown,
    currentDrawdown,
    riskPerAccount,
    accountsAtRisk
  }
}

/**
 * Calculate trading activity metrics
 */
export function calculateTradingActivity(
  accounts: Array<{
    status: 'success' | 'error'
  }>,
  positionsCount: number = 0,
  totalVolume: number = 0
): TradingActivity {
  const successfulAccounts = accounts.filter((a) => a.status === 'success')
  const activeAccounts = successfulAccounts.length
  const inactiveAccounts = accounts.length - activeAccounts

  return {
    openPositions: positionsCount,
    totalVolume,
    averageTradeSize: positionsCount > 0 ? totalVolume / positionsCount : 0,
    activeAccounts,
    inactiveAccounts
  }
}

/**
 * Format currency with proper locale
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Get account age in days
 */
export function getAccountAge(createdAt: Date | string): number {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - created.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}




