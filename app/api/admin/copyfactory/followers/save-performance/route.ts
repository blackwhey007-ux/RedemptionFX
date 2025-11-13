import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { saveDailySnapshot, saveWeeklyReport, saveMonthlyReport } from '@/lib/copyTradingDataService'
import { calculateDailyPerformance, calculateWeeklyPerformance, calculateMonthlyPerformance } from '@/lib/copyTradingPerformanceService'

/**
 * POST /api/admin/copyfactory/followers/save-performance
 * Save performance snapshot (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()

    const { type, date, month, year, weekStart, strategyId } = body

    if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid type. Must be: daily, weekly, or monthly'
        },
        { status: 400 }
      )
    }

    if (type === 'daily') {
      if (!date) {
        return NextResponse.json(
          {
            success: false,
            error: 'Date is required for daily snapshot'
          },
          { status: 400 }
        )
      }

      const performance = await calculateDailyPerformance(new Date(date), strategyId)
      await saveDailySnapshot(performance)

      return NextResponse.json({
        success: true,
        message: `Daily snapshot saved for ${date}`
      })
    } else if (type === 'weekly') {
      if (!weekStart) {
        return NextResponse.json(
          {
            success: false,
            error: 'weekStart is required for weekly report'
          },
          { status: 400 }
        )
      }

      const performance = await calculateWeeklyPerformance(new Date(weekStart), strategyId)
      await saveWeeklyReport(performance)

      return NextResponse.json({
        success: true,
        message: `Weekly report saved for week starting ${weekStart}`
      })
    } else if (type === 'monthly') {
      if (month === undefined || year === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: 'month and year are required for monthly report'
          },
          { status: 400 }
        )
      }

      const performance = await calculateMonthlyPerformance(month, year, strategyId)
      await saveMonthlyReport(performance)

      return NextResponse.json({
        success: true,
        message: `Monthly report saved for ${year}-${String(month + 1).padStart(2, '0')}`
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid type'
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('[SavePerformanceEndpoint] Error saving performance:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to save performance'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}




