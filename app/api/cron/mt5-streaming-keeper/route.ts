import { NextRequest, NextResponse } from 'next/server'
import { initializeStreaming, getStreamingStatus, isStreaming } from '@/lib/metaapiStreamingService'

/**
 * Background cron job to ensure MetaAPI streaming stays active
 * Runs every 5 minutes to restart streaming if disconnected
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Streaming keeper cron triggered...')

    // Check if streaming is active
    const currentStatus = await getStreamingStatus()
    const isCurrentlyStreaming = isStreaming

    if (currentStatus?.isConnected && isCurrentlyStreaming) {
      console.log('✅ Streaming is active, no action needed')
      return NextResponse.json({
        success: true,
        message: 'Streaming is active',
        status: currentStatus,
        timestamp: new Date().toISOString()
      })
    }

    // Stream is down or never started, restart it
    console.log('⚠️ Streaming not active, reinitializing...')

    const result = await initializeStreaming()

    if (!result.success) {
      console.error('❌ Failed to reinitialize streaming:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    console.log('✅ Streaming reinitialized successfully')

    const newStatus = await getStreamingStatus()

    return NextResponse.json({
      success: true,
      message: 'Streaming reinitialized',
      wasDown: !currentStatus?.isConnected,
      status: newStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in streaming keeper:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Support POST as well
  return GET(request)
}


