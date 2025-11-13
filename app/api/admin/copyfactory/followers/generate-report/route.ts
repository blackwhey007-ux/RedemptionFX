import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { generateMarketingReport } from '@/lib/copyTradingDataService'
import { getDailyPerformance, getMonthlyPerformance, calculateWeeklyPerformance } from '@/lib/copyTradingPerformanceService'

/**
 * POST /api/admin/copyfactory/followers/generate-report
 * Generate a marketing report (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request)
    const body = await request.json()

    const { type, period, startDate, endDate, strategyId } = body

    if (!type || !['daily', 'weekly', 'monthly', 'custom'].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid report type. Must be: daily, weekly, monthly, or custom'
        },
        { status: 400 }
      )
    }

    if (!period) {
      return NextResponse.json(
        {
          success: false,
          error: 'Period is required'
        },
        { status: 400 }
      )
    }

    let reportData: any
    let start: Date
    let end: Date

    if (type === 'daily') {
      const date = new Date(period)
      start = new Date(date)
      start.setHours(0, 0, 0, 0)
      end = new Date(date)
      end.setHours(23, 59, 59, 999)
      
      reportData = await getDailyPerformance(date, strategyId)
      if (!reportData) {
        throw new Error('No data available for this date')
      }
    } else if (type === 'weekly') {
      const weekStart = new Date(period)
      start = new Date(weekStart)
      start.setHours(0, 0, 0, 0)
      end = new Date(weekStart)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      
      reportData = await calculateWeeklyPerformance(weekStart, strategyId)
    } else if (type === 'monthly') {
      const [year, month] = period.split('-').map(Number)
      start = new Date(year, month - 1, 1)
      end = new Date(year, month, 0)
      end.setHours(23, 59, 59, 999)
      
      reportData = await getMonthlyPerformance(month - 1, year, strategyId)
      if (!reportData) {
        throw new Error('No data available for this month')
      }
    } else {
      // Custom date range
      start = new Date(startDate)
      end = new Date(endDate)
      
      // For custom, we'd need to aggregate data
      // For now, return error suggesting to use daily/weekly/monthly
      return NextResponse.json(
        {
          success: false,
          error: 'Custom date range reports not yet implemented. Use daily, weekly, or monthly.'
        },
        { status: 400 }
      )
    }

    const report = await generateMarketingReport(
      type,
      period,
      start,
      end,
      user.uid,
      reportData
    )

    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('[GenerateReportEndpoint] Error generating report:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to generate report'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}




