import { NextResponse } from 'next/server'
import { getVipTrades } from '@/lib/mt5VipService'

export async function GET() {
  try {
    const trades = await getVipTrades(100) // Get last 100 trades

    return NextResponse.json({
      success: true,
      trades
    })
  } catch (error) {
    console.error('Error getting VIP trades:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get VIP trades'
    }, { status: 500 })
  }
}


