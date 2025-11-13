import { NextRequest, NextResponse } from 'next/server'
import { stopStreaming } from '@/lib/metaapiStreamingService'

/**
 * API endpoint to stop MetaAPI real-time streaming
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Implement proper server-side authentication
    console.log('🛑 Stopping MetaAPI real-time streaming...')

    await stopStreaming()

    console.log('✅ Streaming stopped')

    return NextResponse.json({
      success: true,
      message: 'Real-time streaming stopped',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error stopping streaming:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

