import { NextResponse } from 'next/server'
import { getVipStats } from '@/lib/csvImportService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    
    const stats = await getVipStats(profileId || undefined)

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error getting VIP stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get VIP statistics'
    }, { status: 500 })
  }
}

