import { NextRequest, NextResponse } from 'next/server'
import { initializeStreaming, getStreamingStatus } from '@/lib/metaapiStreamingService'

/**
 * GET - Check streaming status
 */
export async function GET(request: NextRequest) {
  try {
    const status = await getStreamingStatus()
    
    return NextResponse.json({
      success: true,
      status: {
        isActive: status?.active || false,
        isConnected: status?.isConnected || false,
        accountId: status?.accountId || null,
        lastEvent: status?.lastEvent || null,
        error: status?.error || null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error getting streaming status:', error)
    return NextResponse.json({
      success: false,
      status: {
        isActive: false,
        isConnected: false
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST - Start streaming
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting MT5 streaming via API...')

    // Initialize the streaming service
    const result = await initializeStreaming()
    
    if (!result.success) {
      console.error('❌ Failed to start streaming:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to start streaming'
      }, { status: 500 })
    }

    console.log('✅ MT5 streaming started successfully')

    // Get updated status
    const status = await getStreamingStatus()

    return NextResponse.json({
      success: true,
      message: 'Streaming started successfully',
      status: {
        isActive: status?.active || true,
        isConnected: status?.isConnected || true,
        accountId: status?.accountId,
        lastEvent: status?.lastEvent
      }
    })

  } catch (error) {
    console.error('❌ Error starting streaming:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    let statusCode = 500
    
    // Handle subscription limit specially
    if (errorMessage.includes('TooManyRequestsError') || errorMessage.includes('subscription')) {
      statusCode = 429
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      hint: statusCode === 429 ? 'Visit https://app.metaapi.cloud/ to manage connections or call POST /api/mt5-streaming/cleanup' : undefined
    }, { status: statusCode })
  }
}

