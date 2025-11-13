import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { getProfileClosedTrades } from '@/lib/profileClosedTradesService'
import { getTradesByProfile } from '@/lib/tradeService'

/**
 * GET /api/analytics/calendar
 * Get calendar data for analytics (daily profit/loss and trade count)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get closed trades from mt5_trade_history
    const closedTrades = await getProfileClosedTrades(
      user.uid,
      profileId || undefined,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      }
    )

    // Get trades from profile's trades collection
    let profileTrades: any[] = []
    if (profileId) {
      profileTrades = await getTradesByProfile(profileId, 1000)
    } else {
      // Get all user profiles and their trades
      const { getProfilesByUser } = await import('@/lib/profileService')
      const profiles = await getProfilesByUser(user.uid)
      for (const profile of profiles) {
        const trades = await getTradesByProfile(profile.id, 1000)
        profileTrades.push(...trades)
      }
    }

    // Group by date
    const calendarData = new Map<string, { profit: number; trades: number }>()

    // Process closed trades from mt5_trade_history
    for (const trade of closedTrades) {
      const date = trade.closeTime.toISOString().split('T')[0]
      const existing = calendarData.get(date) || { profit: 0, trades: 0 }
      calendarData.set(date, {
        profit: existing.profit + trade.profit,
        trades: existing.trades + 1
      })
    }

    // Process profile trades (deduplicate using mt5TicketId if available)
    const processedTicketIds = new Set(closedTrades.map(t => t.positionId))
    for (const trade of profileTrades) {
      // Skip if already processed from closed trades
      if (trade.mt5TicketId && processedTicketIds.has(trade.mt5TicketId)) {
        continue
      }

      // Only count closed trades
      if (!['CLOSED', 'LOSS', 'BREAKEVEN'].includes(trade.status)) {
        continue
      }

      const date = trade.date || (trade.closeTime ? new Date(trade.closeTime).toISOString().split('T')[0] : null)
      if (!date) continue

      const existing = calendarData.get(date) || { profit: 0, trades: 0 }
      calendarData.set(date, {
        profit: existing.profit + (trade.profit || 0),
        trades: existing.trades + 1
      })
    }

    // Convert to array format
    const result = Array.from(calendarData.entries()).map(([date, data]) => ({
      date,
      profit: data.profit,
      trades: data.trades
    }))

    // Sort by date
    result.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('[CalendarAPI] Error:', error)
    const { status, message } = handleAuthError(error)
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}



