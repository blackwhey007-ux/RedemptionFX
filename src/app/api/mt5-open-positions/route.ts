import { NextRequest, NextResponse } from 'next/server'
import { getMT5Settings } from '@/lib/mt5SettingsService'
import { getPositions } from '@/lib/metaapiRestClient'
import { getStreamingStatus } from '@/lib/metaapiStreamingServiceV2'

// Force dynamic rendering for serverless functions
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Allow up to 30 seconds for MetaAPI calls

/**
 * API endpoint to get current open positions from MT5
 * Uses existing MetaAPI infrastructure
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching open positions from MT5...')

    // Check if streaming is active using the service directly (not via fetch)
    const streamingStatus = await getStreamingStatus()
    
    if (!streamingStatus?.active) {
      console.log('⚠️ Streaming not active')
      return NextResponse.json({
        success: false,
        error: 'Streaming not active. Please start streaming first.',
        positions: [],
        positionsCount: 0
      }, { status: 503 })
    }

    // Get MT5 settings
    const mt5Settings = await getMT5Settings()
    
    if (!mt5Settings || !mt5Settings.accountId) {
      return NextResponse.json({
        success: false,
        error: 'MT5 settings not configured. Please configure API settings in Telegram Settings first.',
        positions: [],
        positionsCount: 0
      }, { status: 400 })
    }

    const accountId = mt5Settings.accountId
    const token = mt5Settings.token || process.env.METAAPI_TOKEN
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'METAAPI_TOKEN not configured. Please add it to your environment variables.',
        positions: [],
        positionsCount: 0
      }, { status: 500 })
    }

    console.log(`📡 Fetching positions for account: ${accountId}`)

    // Fetch positions using existing REST client
    const positions = await getPositions(accountId, token, mt5Settings.regionUrl)
    
    console.log(`✅ Found ${positions.length} open positions`)

    return NextResponse.json({
      success: true,
      positions,
      positionsCount: positions.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error fetching open positions:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      positions: [],
      positionsCount: 0
    }, { status: 500 })
  }
}

