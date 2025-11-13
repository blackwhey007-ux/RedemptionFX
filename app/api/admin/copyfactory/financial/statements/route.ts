import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import {
  generateProfitLossStatement,
  generateBalanceSheet,
  generateCashFlowStatement
} from '@/lib/reportingUtils'
import { calculateRevenue, calculateExpenses } from '@/lib/financialUtils'

/**
 * GET /api/admin/copyfactory/financial/statements
 * Get financial statements (P&L, Balance Sheet, Cash Flow) (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly'
    const startDate = searchParams.get('startDate') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Fetch statistics data (read-only)
    const statsResponse = await fetch(`${request.nextUrl.origin}/api/admin/copyfactory/followers/statistics`)
    if (!statsResponse.ok) {
      throw new Error('Failed to fetch statistics data')
    }
    const statsData = await statsResponse.json()

    if (!statsData.success) {
      throw new Error(statsData.error || 'Failed to load statistics')
    }

    const totals = statsData.totals || {}
    const performance = statsData.performance || {}
    const followers = statsData.followers || []

    // Calculate financial metrics
    const totalProfitLoss = performance.totalProfitLoss || 0
    const revenue = calculateRevenue(totalProfitLoss, 0.1, 0.05, period)
    const expenses = calculateExpenses(followers.length, 10, 100, period)

    // Generate statements
    const profitLoss = generateProfitLossStatement(
      revenue.total,
      expenses.total,
      period,
      startDate,
      endDate
    )

    const balanceSheet = generateBalanceSheet(
      totals.totalEquity || 0,
      totals.totalMargin || 0
    )

    const cashFlow = generateCashFlowStatement(
      totals.totalEquity || 0,
      totals.totalMargin || 0
    )

    return NextResponse.json({
      success: true,
      data: {
        profitLoss,
        balanceSheet,
        cashFlow,
        period,
        startDate,
        endDate
      },
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('[StatementsEndpoint] Error fetching financial statements:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch financial statements'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}




