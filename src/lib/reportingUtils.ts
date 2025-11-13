/**
 * Reporting Utilities
 * Financial report generation helpers
 */

export interface FinancialStatement {
  period: string
  startDate: string
  endDate: string
  revenue: number
  expenses: number
  netIncome: number
}

export interface BalanceSheet {
  assets: {
    current: number
    fixed: number
    total: number
  }
  liabilities: {
    current: number
    longTerm: number
    total: number
  }
  equity: number
}

export interface CashFlowStatement {
  operating: {
    inflow: number
    outflow: number
    net: number
  }
  investing: {
    inflow: number
    outflow: number
    net: number
  }
  financing: {
    inflow: number
    outflow: number
    net: number
  }
  netCashFlow: number
}

/**
 * Generate Profit & Loss Statement
 */
export function generateProfitLossStatement(
  revenue: number,
  expenses: number,
  period: string,
  startDate: string,
  endDate: string
): FinancialStatement {
  return {
    period,
    startDate,
    endDate,
    revenue,
    expenses,
    netIncome: revenue - expenses
  }
}

/**
 * Generate Balance Sheet
 */
export function generateBalanceSheet(
  totalEquity: number,
  totalMargin: number
): BalanceSheet {
  const currentAssets = totalEquity
  const fixedAssets = 0 // Can be extended
  const currentLiabilities = totalMargin
  const longTermLiabilities = 0 // Can be extended

  return {
    assets: {
      current: currentAssets,
      fixed: fixedAssets,
      total: currentAssets + fixedAssets
    },
    liabilities: {
      current: currentLiabilities,
      longTerm: longTermLiabilities,
      total: currentLiabilities + longTermLiabilities
    },
    equity: totalEquity - totalMargin
  }
}

/**
 * Generate Cash Flow Statement
 */
export function generateCashFlowStatement(
  operatingInflow: number,
  operatingOutflow: number,
  investingInflow: number = 0,
  investingOutflow: number = 0,
  financingInflow: number = 0,
  financingOutflow: number = 0
): CashFlowStatement {
  return {
    operating: {
      inflow: operatingInflow,
      outflow: operatingOutflow,
      net: operatingInflow - operatingOutflow
    },
    investing: {
      inflow: investingInflow,
      outflow: investingOutflow,
      net: investingInflow - investingOutflow
    },
    financing: {
      inflow: financingInflow,
      outflow: financingOutflow,
      net: financingInflow - financingOutflow
    },
    netCashFlow:
      (operatingInflow - operatingOutflow) +
      (investingInflow - investingOutflow) +
      (financingInflow - financingOutflow)
  }
}

/**
 * Format financial statement for export
 */
export function formatFinancialStatement(statement: FinancialStatement): string {
  return `
Profit & Loss Statement
Period: ${statement.period}
From: ${statement.startDate} To: ${statement.endDate}

Revenue: $${statement.revenue.toFixed(2)}
Expenses: $${statement.expenses.toFixed(2)}
─────────────────────────
Net Income: $${statement.netIncome.toFixed(2)}
  `.trim()
}

/**
 * Format balance sheet for export
 */
export function formatBalanceSheet(sheet: BalanceSheet): string {
  return `
Balance Sheet

ASSETS
  Current Assets: $${sheet.assets.current.toFixed(2)}
  Fixed Assets: $${sheet.assets.fixed.toFixed(2)}
  Total Assets: $${sheet.assets.total.toFixed(2)}

LIABILITIES
  Current Liabilities: $${sheet.liabilities.current.toFixed(2)}
  Long-term Liabilities: $${sheet.liabilities.longTerm.toFixed(2)}
  Total Liabilities: $${sheet.liabilities.total.toFixed(2)}

EQUITY
  Total Equity: $${sheet.equity.toFixed(2)}
  `.trim()
}




