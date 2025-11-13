import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper admin authentication check here
    // For now, allow manual triggers (should be protected by admin middleware)

    console.log('🔄 Manual MT5 signals sync triggered...')
    console.log('Step 1: Starting sync process...')
    
    // Step 1: Try to import modules
    console.log('Step 2: Importing modules...')
    let syncSignalsFromMT5Positions
    let getMT5Settings
    
    try {
      console.log('Step 2a: Importing mt5SignalService...')
      const mt5SignalModule = await import('@/lib/mt5SignalService')
      syncSignalsFromMT5Positions = mt5SignalModule.syncSignalsFromMT5Positions
      console.log('Step 2a: Success - mt5SignalService imported')
      
      console.log('Step 2b: Importing mt5SettingsService...')
      const mt5SettingsModule = await import('@/lib/mt5SettingsService')
      getMT5Settings = mt5SettingsModule.getMT5Settings
      console.log('Step 2b: Success - mt5SettingsService imported')
    } catch (importError) {
      console.error('❌ Error importing modules:', importError)
      if (importError instanceof Error) {
        console.error('Import error details:', {
          message: importError.message,
          stack: importError.stack,
          name: importError.name
        })
      }
      return NextResponse.json({
        success: false,
        error: `Failed to load required modules: ${importError instanceof Error ? importError.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    // Step 3: Get MT5 settings from Firestore
    console.log('Step 3: Getting MT5 settings from Firestore...')
    let mt5Settings
    try {
      mt5Settings = await getMT5Settings()
      console.log('Step 3: Success - MT5 settings loaded:', { 
        hasSettings: !!mt5Settings, 
        enabled: mt5Settings?.enabled,
        hasAccountId: !!mt5Settings?.accountId,
        hasToken: !!mt5Settings?.token
      })
    } catch (settingsError) {
      console.error('❌ Step 3: Error loading MT5 settings:', settingsError)
      if (settingsError instanceof Error) {
        console.error('Settings error details:', {
          message: settingsError.message,
          stack: settingsError.stack,
          name: settingsError.name
        })
      }
      return NextResponse.json({
        success: false,
        error: `Failed to load MT5 settings: ${settingsError instanceof Error ? settingsError.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    if (!mt5Settings) {
      return NextResponse.json({
        success: false,
        error: 'MT5 settings not configured. Please configure in VIP Sync Management.',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Allow manual sync even if "enabled" toggle is off (for testing)
    // The "enabled" flag is mainly for cron jobs to know if they should run
    // Manual sync should always work if credentials are present
    // Note: We skip the enabled check here to allow manual testing

    // Step 4: Validate settings
    console.log('Step 4: Validating settings...')
    if (!mt5Settings.accountId || !mt5Settings.token) {
      console.error('Step 4: MT5 settings incomplete')
      return NextResponse.json({
        success: false,
        error: 'MT5 settings incomplete - accountId and token required',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    console.log('Step 4: Success - Settings validated (manual sync allows disabled toggle)')

    // Step 5: Sync signals from MT5 positions
    console.log('Step 5: Starting signal sync...')
    const accountId = mt5Settings.accountId
    const category = 'vip' as const // Could be made configurable later

    let result
    try {
      // Pass region URL if configured
      result = await syncSignalsFromMT5Positions(accountId, category, mt5Settings.token)
      console.log('Step 5: Success - Signal sync completed')
    } catch (syncError) {
      console.error('❌ Step 5: Error during signal sync:', syncError)
      if (syncError instanceof Error) {
        console.error('Sync error details:', {
          message: syncError.message,
          stack: syncError.stack,
          name: syncError.name
        })
      }
      return NextResponse.json({
        success: false,
        error: `Signal sync failed: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    console.log(`✅ Manual MT5 signals sync completed: ${result.signalsCreated} created, ${result.signalsUpdated} already existed, ${result.signalsClosed} closed`)

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

    // Format response message based on result
    let message: string
    if (result.success) {
      const totalSignals = result.signalsCreated + result.signalsUpdated
      if (totalSignals === 0 && result.signalsClosed === 0) {
        message = 'Sync completed successfully, but no signals were found. This may mean:\n1. You have no open positions in MT5\n2. All positions already have corresponding signals\n3. No positions matched the signal creation criteria'
      } else {
        const parts: string[] = []
        if (result.signalsCreated > 0) parts.push(`${result.signalsCreated} created`)
        if (result.signalsUpdated > 0) parts.push(`${result.signalsUpdated} updated`)
        if (result.signalsClosed > 0) parts.push(`${result.signalsClosed} closed`)
        message = `Synced ${totalSignals + result.signalsClosed} signals successfully (${parts.join(', ')})`
      }
    } else {
      // Show actual error messages instead of "Synced 0 signals"
      const errorDetails = result.errors && result.errors.length > 0 
        ? result.errors.join('; ') 
        : 'Unknown error occurred during sync'
      message = `Sync failed: ${errorDetails}`
    }

    return NextResponse.json({
      success: result.success,
      message: message,
      signalsCreated: result.signalsCreated,
      signalsUpdated: result.signalsUpdated,
      signalsClosed: result.signalsClosed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in manual MT5 signals sync:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    })
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'Method not allowed. Use POST for manual sync.',
    timestamp: new Date().toISOString()
  }, { status: 405 })
}

