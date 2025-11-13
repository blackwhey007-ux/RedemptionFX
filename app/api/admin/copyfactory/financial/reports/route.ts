import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import {
  formatFinancialStatement,
  formatBalanceSheet
} from '@/lib/reportingUtils'
import {
  generateProfitLossStatement,
  generateBalanceSheet,
  generateCashFlowStatement
} from '@/lib/reportingUtils'
import { calculateRevenue, calculateExpenses } from '@/lib/financialUtils'

/**
 * GET /api/admin/copyfactory/financial/reports
 * Generate and download financial reports (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'all' // 'pl', 'balance', 'cashflow', 'all'
    const period = searchParams.get('period') || 'monthly'
    const startDate = searchParams.get('startDate') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const format = searchParams.get('format') || 'json' // 'json', 'text', 'csv'

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

    // Format based on requested format
    let reportData: any

    if (format === 'text') {
      let textReport = ''
      if (reportType === 'pl' || reportType === 'all') {
        textReport += formatFinancialStatement(profitLoss) + '\n\n'
      }
      if (reportType === 'balance' || reportType === 'all') {
        textReport += formatBalanceSheet(balanceSheet) + '\n\n'
      }
      if (reportType === 'cashflow' || reportType === 'all') {
        textReport += `Cash Flow Statement\nPeriod: ${period}\nFrom: ${startDate} To: ${endDate}\n\nOperating: $${cashFlow.operating.net.toFixed(2)}\nInvesting: $${cashFlow.investing.net.toFixed(2)}\nFinancing: $${cashFlow.financing.net.toFixed(2)}\n─────────────────────────\nNet Cash Flow: $${cashFlow.netCashFlow.toFixed(2)}\n`
      }

      return new NextResponse(textReport, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="financial-report-${period}-${Date.now()}.txt"`
        }
      })
    }

    // Default JSON response
    reportData = {
      profitLoss: reportType === 'pl' || reportType === 'all' ? profitLoss : null,
      balanceSheet: reportType === 'balance' || reportType === 'all' ? balanceSheet : null,
      cashFlow: reportType === 'cashflow' || reportType === 'all' ? cashFlow : null,
      period,
      startDate,
      endDate,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: reportData
    })
  } catch (error) {
    console.error('[ReportsEndpoint] Error generating financial reports:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to generate financial reports'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}




