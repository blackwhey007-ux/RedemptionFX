import { NextRequest, NextResponse } from 'next/server'
import { getMT5Settings } from '@/lib/mt5SettingsService'
import { getStreamingConnection } from '@/lib/metaapiStreamingService'

/**
 * API endpoint to get current open positions from MT5
 * Uses streaming connection ONLY (no REST API to avoid rate limits)
 * Streaming connection must be active via the streaming service
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [MT5 Open Positions] Starting fetch request...')

    // Get MT5 settings
    const mt5Settings = await getMT5Settings()
    console.log('📦 [MT5 Open Positions] Settings retrieved:', {
      hasSettings: !!mt5Settings,
      hasAccountId: !!mt5Settings?.accountId,
      hasToken: !!mt5Settings?.token,
      hasRegionUrl: !!mt5Settings?.regionUrl
    })
    
    if (!mt5Settings || !mt5Settings.accountId) {
      console.error('❌ [MT5 Open Positions] MT5 settings not configured')
      return NextResponse.json({
        success: false,
        error: 'MT5 settings not configured. Please configure API settings first.',
        positions: []
      }, { status: 400 })
    }

    const accountId = mt5Settings.accountId
    const token = mt5Settings.token || process.env.METAAPI_TOKEN
    
    if (!token) {
      console.error('❌ [MT5 Open Positions] No token available')
      return NextResponse.json({
        success: false,
        error: 'METAAPI_TOKEN not configured',
        positions: []
      }, { status: 500 })
    }

    console.log(`📡 [MT5 Open Positions] Fetching positions for account: ${accountId}`)
    if (mt5Settings.regionUrl) {
      console.log(`🌍 [MT5 Open Positions] Using region: ${mt5Settings.regionUrl}`)
    }

    // Use streaming connection ONLY (no REST API to avoid rate limits)
    let positions: any[] = []
    const streamingConn = getStreamingConnection()
    
    if (streamingConn?.connection) {
      try {
        console.log('♻️ [MT5 Open Positions] Using existing streaming connection...')
        const terminalState = streamingConn.connection.terminalState
        positions = terminalState.positions || []
        console.log(`✅ [MT5 Open Positions] Found ${positions.length} open positions via streaming connection`)
      } catch (streamError) {
        console.error('❌ [MT5 Open Positions] Streaming connection error:', streamError instanceof Error ? streamError.message : streamError)
        return NextResponse.json({
          success: false,
          error: 'Streaming connection error. Please start streaming first.',
          positions: []
        }, { status: 503 })
      }
    } else {
      console.log('⚠️ [MT5 Open Positions] No streaming connection available')
      return NextResponse.json({
        success: false,
        error: 'Streaming not active. Please start streaming first.',
        positions: []
      }, { status: 503 })
    }

    console.log('✅ [MT5 Open Positions] Successfully returning positions')
    return NextResponse.json({
      success: true,
      positions,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [MT5 Open Positions] Error fetching open positions:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      positions: []
    }, { status: 500 })
  }
}

