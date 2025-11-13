import { NextRequest, NextResponse } from 'next/server'
import { initializeStreaming, getStreamingStatus } from '@/lib/metaapiStreamingService'

/**
 * API endpoint to start MetaAPI real-time streaming
 * This creates a persistent WebSocket connection for instant trade detection
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Implement proper server-side authentication
    // For now, allow requests from admin panel (authentication handled by Firebase on client-side)
    console.log('🚀 Starting MetaAPI real-time streaming...')

    // Initialize streaming
    const result = await initializeStreaming()

    if (!result.success) {
      console.error('❌ Streaming initialization failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Get current status
    const status = await getStreamingStatus()

    console.log('✅ Streaming initialized successfully')

    return NextResponse.json({
      success: true,
      message: 'Real-time streaming started',
      status,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error starting streaming:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Implement proper server-side authentication
    const status = await getStreamingStatus()

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error getting streaming status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

