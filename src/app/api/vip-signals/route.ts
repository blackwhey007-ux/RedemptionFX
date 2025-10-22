import { NextResponse } from 'next/server'
import { getSignalsByCategory } from '@/lib/signalService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : 100

    console.log('Fetching VIP signals with limit:', limit)
    const signals = await getSignalsByCategory('vip', limit)
    
    console.log(`Found ${signals.length} VIP signals`)
    
    return NextResponse.json({
      success: true,
      signals
    })
  } catch (error) {
    console.error('Error getting VIP signals:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get VIP signals'
    }, { status: 500 })
  }
}
