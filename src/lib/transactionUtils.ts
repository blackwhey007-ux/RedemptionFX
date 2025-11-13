/**
 * Transaction Utilities
 * Transaction processing and management helpers
 */

export interface Transaction {
  id: string
  type: 'inflow' | 'outflow'
  amount: number
  description: string
  date: string
  category: string
  accountId?: string
  userId?: string
  status?: 'pending' | 'completed' | 'failed'
}

export interface TransactionFilter {
  type?: 'inflow' | 'outflow'
  category?: string
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
}

/**
 * Create a transaction record
 */
export function createTransaction(
  type: 'inflow' | 'outflow',
  amount: number,
  description: string,
  category: string,
  accountId?: string,
  userId?: string
): Transaction {
  return {
    id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    amount: Math.abs(amount),
    description,
    date: new Date().toISOString().split('T')[0],
    category,
    accountId,
    userId,
    status: 'completed'
  }
}

/**
 * Filter transactions
 */
export function filterTransactions(
  transactions: Transaction[],
  filter: TransactionFilter
): Transaction[] {
  return transactions.filter((txn) => {
    if (filter.type && txn.type !== filter.type) return false
    if (filter.category && txn.category !== filter.category) return false
    if (filter.startDate && txn.date < filter.startDate) return false
    if (filter.endDate && txn.date > filter.endDate) return false
    if (filter.minAmount !== undefined && txn.amount < filter.minAmount) return false
    if (filter.maxAmount !== undefined && txn.amount > filter.maxAmount) return false
    return true
  })
}

/**
 * Calculate transaction totals
 */
export function calculateTransactionTotals(transactions: Transaction[]): {
  totalInflow: number
  totalOutflow: number
  netAmount: number
  count: number
} {
  const totals = transactions.reduce(
    (acc, txn) => {
      if (txn.type === 'inflow') {
        acc.totalInflow += txn.amount
      } else {
        acc.totalOutflow += txn.amount
      }
      acc.count++
      return acc
    },
    { totalInflow: 0, totalOutflow: 0, count: 0 }
  )

  return {
    ...totals,
    netAmount: totals.totalInflow - totals.totalOutflow
  }
}

/**
 * Group transactions by category
 */
export function groupTransactionsByCategory(
  transactions: Transaction[]
): Record<string, Transaction[]> {
  return transactions.reduce((acc, txn) => {
    if (!acc[txn.category]) {
      acc[txn.category] = []
    }
    acc[txn.category].push(txn)
    return acc
  }, {} as Record<string, Transaction[]>)
}

/**
 * Group transactions by date
 */
export function groupTransactionsByDate(
  transactions: Transaction[]
): Record<string, Transaction[]> {
  return transactions.reduce((acc, txn) => {
    if (!acc[txn.date]) {
      acc[txn.date] = []
    }
    acc[txn.date].push(txn)
    return acc
  }, {} as Record<string, Transaction[]>)
}

/**
 * Sort transactions by date (newest first)
 */
export function sortTransactionsByDate(
  transactions: Transaction[],
  ascending: boolean = false
): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return ascending ? dateA - dateB : dateB - dateA
  })
}

/**
 * Calculate transaction statistics
 */
export function calculateTransactionStats(transactions: Transaction[]): {
  averageInflow: number
  averageOutflow: number
  largestInflow: number
  largestOutflow: number
  categoryBreakdown: Record<string, { count: number; total: number }>
} {
  const inflows = transactions.filter((t) => t.type === 'inflow')
  const outflows = transactions.filter((t) => t.type === 'outflow')

  const categoryBreakdown = transactions.reduce((acc, txn) => {
    if (!acc[txn.category]) {
      acc[txn.category] = { count: 0, total: 0 }
    }
    acc[txn.category].count++
    acc[txn.category].total += txn.amount
    return acc
  }, {} as Record<string, { count: number; total: number }>)

  return {
    averageInflow: inflows.length > 0 ? inflows.reduce((sum, t) => sum + t.amount, 0) / inflows.length : 0,
    averageOutflow: outflows.length > 0 ? outflows.reduce((sum, t) => sum + t.amount, 0) / outflows.length : 0,
    largestInflow: inflows.length > 0 ? Math.max(...inflows.map((t) => t.amount)) : 0,
    largestOutflow: outflows.length > 0 ? Math.max(...outflows.map((t) => t.amount)) : 0,
    categoryBreakdown
  }
}




