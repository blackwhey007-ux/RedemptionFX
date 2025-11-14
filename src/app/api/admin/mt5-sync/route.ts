import { NextRequest, NextResponse } from 'next/server'
import { syncVipTrades, getVipSyncLogs } from '@/lib/mt5VipService'
import { getCurrentUser, isAdmin } from '@/lib/firebaseAuth'

// Force dynamic rendering for serverless functions
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for sync operations

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const user = getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userIsAdmin = await isAdmin(user.uid)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate } = body

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    console.log(`Admin MT5 sync requested: ${start.toISOString()} to ${end.toISOString()}`)

    const result = await syncVipTrades(start, end)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'VIP trades synced successfully',
        summary: result.summary
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Admin MT5 sync error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const user = getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userIsAdmin = await isAdmin(user.uid)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const syncLogs = await getVipSyncLogs(10)

    return NextResponse.json({
      success: true,
      syncLogs
    })
  } catch (error) {
    console.error('Error getting sync logs:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync logs'
    }, { status: 500 })
  }
}


