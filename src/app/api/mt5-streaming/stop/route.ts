import { NextRequest, NextResponse } from 'next/server'
import { stopStreaming, getStreamingStatus } from '@/lib/metaapiStreamingService'

/**
 * POST - Stop streaming
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🛑 Stopping MT5 streaming via API...')

    // Get status before stopping
    const statusBefore = await getStreamingStatus()

    // Stop streaming
    const result = await stopStreaming()
    
    if (!result.success) {
      console.error('❌ Failed to stop streaming:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to stop streaming'
      }, { status: 500 })
    }

    console.log('✅ MT5 streaming stopped successfully')

    return NextResponse.json({
      success: true,
      message: 'Streaming stopped and connection cleaned up successfully',
      previousStatus: {
        accountId: statusBefore?.accountId,
        wasActive: statusBefore?.active || false
      }
    })

  } catch (error) {
    console.error('❌ Error stopping streaming:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

