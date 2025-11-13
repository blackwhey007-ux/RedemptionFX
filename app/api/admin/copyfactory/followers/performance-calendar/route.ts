import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { getCalendarData } from '@/lib/copyTradingPerformanceService'

/**
 * GET /api/admin/copyfactory/followers/performance-calendar
 * Get calendar data for a specific month/year (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const masterAccountId = searchParams.get('masterAccountId')
    const strategyId = searchParams.get('strategyId') || undefined

    if (!masterAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'masterAccountId is required'
        },
        { status: 400 }
      )
    }

    if (isNaN(month) || month < 0 || month > 11) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid month (0-11)'
        },
        { status: 400 }
      )
    }

    if (isNaN(year) || year < 2020 || year > 2100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid year'
        },
        { status: 400 }
      )
    }

    console.log(`[PerformanceCalendarEndpoint] Fetching calendar data for month=${month}, year=${year}, masterAccountId=${masterAccountId}, strategyId=${strategyId}`)
    
    const calendarData = await getCalendarData(month, year, masterAccountId, strategyId)
    
    console.log(`[PerformanceCalendarEndpoint] Received ${calendarData.length} days of data`)
    if (calendarData.length > 0) {
      console.log(`[PerformanceCalendarEndpoint] Sample day:`, calendarData[0])
    }

    // Transform to calendar day format
    const today = new Date().toISOString().split('T')[0]
    const calendarDays = calendarData.map((day) => ({
      date: day.date,
      profit: typeof day.totalProfit === 'number' ? day.totalProfit : 0,
      pips: typeof day.totalPips === 'number' ? day.totalPips : 0,
      trades: typeof day.totalTrades === 'number' ? day.totalTrades : 0,
      isToday: day.date === today,
      hasData: (typeof day.totalTrades === 'number' ? day.totalTrades : 0) > 0
    }))
    
    console.log(`[PerformanceCalendarEndpoint] Transformed to ${calendarDays.length} calendar days`)
    console.log(`[PerformanceCalendarEndpoint] Days with data: ${calendarDays.filter(d => d.hasData).length}`)

    return NextResponse.json({
      success: true,
      data: {
        month,
        year,
        calendarDays,
        summary: {
          totalProfit: calendarDays.reduce((sum, day) => sum + day.profit, 0),
          totalTrades: calendarDays.reduce((sum, day) => sum + day.trades, 0),
          tradingDays: calendarDays.filter((day) => day.hasData).length
        }
      }
    })
  } catch (error) {
    console.error('[PerformanceCalendarEndpoint] Error fetching calendar data:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch calendar data'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

