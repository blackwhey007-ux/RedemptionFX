import { NextRequest, NextResponse } from 'next/server'
import { addStreamingLog, getStreamingLogs } from '@/lib/streamingLogService'

/**
 * Test endpoint to verify logging works
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[TEST_LOG] Starting log test...')
    
    // Try to write a test log
    console.log('[TEST_LOG] Attempting to write test log...')
    await addStreamingLog({
      type: 'streaming_started',
      message: 'Test log entry',
      success: true,
      details: { test: true, timestamp: new Date().toISOString() }
    })
    console.log('[TEST_LOG] Test log write completed')
    
    // Try to read logs
    console.log('[TEST_LOG] Attempting to read logs...')
    const logs = await getStreamingLogs(10)
    console.log('[TEST_LOG] Found logs:', logs.length)
    
    return NextResponse.json({
      success: true,
      message: 'Log test completed',
      logsCount: logs.length,
      latestLogs: logs.slice(0, 3),
      serverTime: new Date().toISOString()
    })
  } catch (error) {
    console.error('[TEST_LOG] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any)?.code,
        errorStack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}


