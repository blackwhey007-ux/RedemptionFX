import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { calculateRevenue } from '@/lib/financialUtils'

/**
 * GET /api/admin/copyfactory/financial/revenue
 * Get revenue data for financial management (admin only)
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

    const performance = statsData.performance || {}
    const totalProfitLoss = performance.totalProfitLoss || 0

    // Calculate revenue
    const revenue = calculateRevenue(totalProfitLoss, 0.1, 0.05, period)

    return NextResponse.json({
      success: true,
      data: revenue,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('[RevenueEndpoint] Error fetching revenue data:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch revenue data'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}




