import { NextRequest, NextResponse } from 'next/server'
import { syncSignalsFromMT5Positions } from '@/lib/mt5SignalService'
import { getMT5Settings } from '@/lib/mt5SettingsService'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting MT5 signals sync...')
    
    // Get MT5 settings from Firestore
    const mt5Settings = await getMT5Settings()
    
    if (!mt5Settings || !mt5Settings.enabled) {
      console.log('⚠️ MT5 signals sync is disabled')
      return NextResponse.json({
        success: true,
        message: 'MT5 signals sync is disabled',
        enabled: false,
        timestamp: new Date().toISOString()
      })
    }

    if (!mt5Settings.accountId || !mt5Settings.token) {
      console.error('❌ MT5 settings incomplete')
      return NextResponse.json({
        success: false,
        error: 'MT5 settings incomplete - accountId and token required',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Use account ID from settings (or fallback to environment variable)
    const accountId = mt5Settings.accountId || process.env.MT5_ACCOUNT_ID
    
    // Determine signal category (default to 'vip')
    const category = 'vip' as const // Could be made configurable later

    // Sync signals from MT5 positions (use token from settings or env)
    const token = mt5Settings.token || process.env.METAAPI_TOKEN
    const result = await syncSignalsFromMT5Positions(accountId, category, token)

    console.log(`✅ MT5 signals sync completed: ${result.signalsCreated} created, ${result.signalsUpdated} already existed, ${result.signalsClosed} closed`)

    // Update last sync time in settings
    if (result.success) {
      const { saveMT5Settings } = await import('@/lib/mt5SettingsService')
      await saveMT5Settings({
        ...mt5Settings,
        enabled: mt5Settings.enabled,
        accountId: mt5Settings.accountId,
        token: mt5Settings.token,
        lastSync: new Date(),
        status: 'connected'
      })
    }

    return NextResponse.json({
      success: result.success,
      message: `Synced ${result.signalsCreated + result.signalsUpdated + result.signalsClosed} signals (${result.signalsCreated} created, ${result.signalsUpdated} updated, ${result.signalsClosed} closed)`,
      signalsCreated: result.signalsCreated,
      signalsUpdated: result.signalsUpdated,
      signalsClosed: result.signalsClosed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in MT5 signals sync:', error)
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
    console.error('❌ Error in manual MT5 signals sync:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

