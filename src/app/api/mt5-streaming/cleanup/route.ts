import { NextResponse } from 'next/server'

/**
 * Manual cleanup endpoint
 * Call this to forcefully close all MetaAPI connections and free subscriptions
 */
export async function POST() {
  try {
    console.log('🧹 Manual cleanup requested via API')
    
    const { stopStreaming } = await import('@/lib/metaapiStreamingService')
    const result = await stopStreaming()
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false,
        error: result.error || 'Failed to cleanup connections'
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'All MetaAPI connections cleaned up successfully. Subscriptions freed. Wait 2 minutes before restarting streaming.'
    })
  } catch (error) {
    console.error('❌ Error during manual cleanup:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}



