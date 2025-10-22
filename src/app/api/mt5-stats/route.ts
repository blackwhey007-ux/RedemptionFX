import { NextResponse } from 'next/server'
import { getVipAccountInfo, getVipTradeStats } from '@/lib/mt5VipService'

export async function GET() {
  try {
    // Get account info and trade stats in parallel
    const [accountInfo, tradeStats] = await Promise.all([
      getVipAccountInfo(),
      getVipTradeStats()
    ])

    return NextResponse.json({
      success: true,
      data: {
        account: accountInfo,
        stats: tradeStats,
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error getting MT5 stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get MT5 statistics'
    }, { status: 500 })
  }
}


