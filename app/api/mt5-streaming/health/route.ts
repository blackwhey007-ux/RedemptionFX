import { NextResponse } from 'next/server'
import { getStreamingStatus } from '@/lib/metaapiStreamingService'

/**
 * Health check endpoint for MT5 streaming connection
 * Returns detailed health status including last event time
 */
export async function GET() {
  try {
    const status = await getStreamingStatus()
    
    // Consider connection healthy if:
    // 1. Connected
    // 2. Last event within last 2 minutes (active connection)
    const isHealthy = status.isConnected && 
                     status.lastEvent && 
                     (new Date().getTime() - new Date(status.lastEvent).getTime()) < 120000 // 2 min

    return NextResponse.json({
      success: true,
      healthy: isHealthy,
      status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}


