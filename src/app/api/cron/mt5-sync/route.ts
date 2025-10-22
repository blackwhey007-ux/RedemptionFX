import { NextRequest, NextResponse } from 'next/server'
import { syncVipTrades } from '@/lib/mt5VipService'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (you can add additional verification)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sync last 24 hours of trades
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

    console.log(`Cron MT5 sync: ${startDate.toISOString()} to ${endDate.toISOString()}`)

    const result = await syncVipTrades(startDate, endDate)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'VIP trades synced successfully',
        summary: result.summary,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Cron MT5 sync error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}


