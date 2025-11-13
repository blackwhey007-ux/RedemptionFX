import { NextRequest, NextResponse } from 'next/server'
import { syncSignalsFromMT5Positions } from '@/lib/mt5SignalService'
import { getMT5Settings } from '@/lib/mt5SettingsService'

/**
 * Real-time MT5 signal monitoring cron job
 * Runs every 1-2 minutes to instantly detect new positions and create signals
 * This provides instant Telegram notifications when trades open
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('⚡ Real-time MT5 signal monitoring triggered...')
    
    // Get MT5 settings from Firestore
    const mt5Settings = await getMT5Settings()
    
    if (!mt5Settings || !mt5Settings.enabled) {
      console.log('⚠️ Real-time MT5 monitoring is disabled')
      return NextResponse.json({
        success: true,
        message: 'Real-time MT5 monitoring is disabled',
        enabled: false,
        timestamp: new Date().toISOString()
      })
    }

    if (!mt5Settings.accountId || !mt5Settings.token) {
      console.error('❌ MT5 settings incomplete for real-time monitoring')
      return NextResponse.json({
        success: false,
        error: 'MT5 settings incomplete - accountId and token required',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Use account ID from settings (or fallback to environment variable)
    const accountId = mt5Settings.accountId || process.env.MT5_ACCOUNT_ID
    
    // Determine signal category (default to 'vip')
    const category = 'vip' as const

    // Sync signals from MT5 positions (use token from settings or env)
    const token = mt5Settings.token || process.env.METAAPI_TOKEN
    const result = await syncSignalsFromMT5Positions(accountId, category, token)

    console.log(`⚡ Real-time monitoring completed: ${result.signalsCreated} new signals, ${result.signalsUpdated} updated, ${result.signalsClosed} closed`)

    // Only log significant activity to avoid spam
    if (result.signalsCreated > 0 || result.signalsClosed > 0) {
      console.log(`📢 Real-time alert: ${result.signalsCreated} new position${result.signalsCreated !== 1 ? 's' : ''} detected, ${result.signalsClosed} position${result.signalsClosed !== 1 ? 's' : ''} closed`)
    }

    return NextResponse.json({
      success: result.success,
      message: `Real-time monitoring: ${result.signalsCreated} new, ${result.signalsUpdated} updated, ${result.signalsClosed} closed`,
      signalsCreated: result.signalsCreated,
      signalsUpdated: result.signalsUpdated,
      signalsClosed: result.signalsClosed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in real-time MT5 monitoring:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
    
    if (!isCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Same logic as GET
    return GET(request)
  } catch (error) {
    console.error('❌ Error in real-time MT5 monitoring:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}


