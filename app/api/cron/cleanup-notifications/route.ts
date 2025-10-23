import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notificationService'

export async function GET(request: NextRequest) {
  try {
    console.log('🧹 Starting scheduled notification cleanup...')
    
    // Clean up notifications older than 30 days
    await NotificationService.cleanupOldNotifications(30)
    
    console.log('🧹 Scheduled notification cleanup completed successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notification cleanup completed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🧹 Error in scheduled notification cleanup:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const daysOld = body.daysOld || 30
    
    console.log(`🧹 Starting manual notification cleanup for notifications older than ${daysOld} days...`)
    
    await NotificationService.cleanupOldNotifications(daysOld)
    
    console.log('🧹 Manual notification cleanup completed successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: `Notification cleanup completed successfully (${daysOld} days)`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🧹 Error in manual notification cleanup:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

