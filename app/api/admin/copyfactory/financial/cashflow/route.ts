import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { calculateCashFlow } from '@/lib/financialUtils'

/**
 * GET /api/admin/copyfactory/financial/cashflow
 * Get cash flow data for financial management (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly'

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
    const totalEquity = totals.totalEquity || 0
    const totalMargin = totals.totalMargin || 0

    // Calculate cash flow
    const cashFlow = calculateCashFlow(totalEquity, totalMargin, period)

    return NextResponse.json({
      success: true,
      data: cashFlow,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('[CashFlowEndpoint] Error fetching cash flow data:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch cash flow data'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}




