/**
 * Financial Utilities
 * Banking-style financial calculations and helpers
 */

export interface CashFlowData {
  totalInflow: number
  totalOutflow: number
  netCashFlow: number
  period: string
}

export interface RevenueData {
  total: number
  commissions: number
  fees: number
  period: string
}

export interface ExpenseData {
  total: number
  apiCosts: number
  infrastructure: number
  period: string
}

export interface ProfitLossData {
  netProfit: number
  grossProfit: number
  period: string
}

/**
 * Calculate cash flow from account statistics
 */
export function calculateCashFlow(
  totalEquity: number,
  totalMargin: number,
  period: string = 'monthly'
): CashFlowData {
  return {
    totalInflow: totalEquity,
    totalOutflow: totalMargin,
    netCashFlow: totalEquity - totalMargin,
    period
  }
}

/**
 * Calculate revenue breakdown
 */
export function calculateRevenue(
  totalProfitLoss: number,
  commissionRate: number = 0.1,
  feeRate: number = 0.05,
  period: string = 'monthly'
): RevenueData {
  const total = totalProfitLoss > 0 ? totalProfitLoss : 0
  return {
    total,
    commissions: total * commissionRate,
    fees: total * feeRate,
    period
  }
}

/**
 * Calculate expenses
 */
export function calculateExpenses(
  accountCount: number,
  apiCostPerAccount: number = 10,
  infrastructureCost: number = 100,
  period: string = 'monthly'
): ExpenseData {
  return {
    total: accountCount * apiCostPerAccount + infrastructureCost,
    apiCosts: accountCount * apiCostPerAccount,
    infrastructure: infrastructureCost,
    period
  }
}

/**
 * Calculate profit and loss
 */
export function calculateProfitLoss(
  revenue: number,
  expenses: number,
  period: string = 'monthly'
): ProfitLossData {
  return {
    grossProfit: revenue,
    netProfit: revenue - expenses,
    period
  }
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(revenue: number, expenses: number): number {
  if (revenue === 0) return 0
  return ((revenue - expenses) / revenue) * 100
}

/**
 * Calculate return on investment (ROI)
 */
export function calculateROI(profit: number, investment: number): number {
  if (investment === 0) return 0
  return (profit / investment) * 100
}

/**
 * Format currency
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
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Calculate compound annual growth rate (CAGR)
 */
export function calculateCAGR(
  beginningValue: number,
  endingValue: number,
  numberOfPeriods: number
): number {
  if (beginningValue === 0 || numberOfPeriods === 0) return 0
  return (Math.pow(endingValue / beginningValue, 1 / numberOfPeriods) - 1) * 100
}




