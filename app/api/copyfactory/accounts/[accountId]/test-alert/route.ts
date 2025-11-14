import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { listUserCopyTradingAccounts } from '@/lib/copyTradingRepo'
import { sendTradeAlert } from '@/lib/copyTradingTradeAlertsService'

/**
 * POST /api/copyfactory/accounts/[accountId]/test-alert
 * Send a test trade alert to the user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { accountId } = await params

    // Get the user's copy trading account
    const accounts = await listUserCopyTradingAccounts(user.uid)
    const account = accounts.find((acc) => acc.accountId === accountId)

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if trade alerts are enabled
    if (!account.tradeAlertsEnabled) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Trade alerts are not enabled for this account. Please enable them in Automation Settings first.' 
        },
        { status: 400 }
      )
    }

    // Check if alert types are configured
    const alertTypes = account.alertTypes || []
    if (alertTypes.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No alert types configured. Please select at least one alert type in Automation Settings.' 
        },
        { status: 400 }
      )
    }

    // Create a mock trade that will trigger an alert
    const mockTrade = {
      id: `test-${Date.now()}`,
      accountId: account.accountId,
      symbol: 'EURUSD',
      type: 'BUY' as const,
      volume: account.minTradeSizeForAlert || 0.1,
      profit: account.minProfitForAlert || 100, // Use minProfitForAlert to ensure it triggers
      pips: 50,
      openPrice: 1.1000,
      closePrice: 1.1050,
      openTime: new Date(Date.now() - 3600000), // 1 hour ago
      closeTime: new Date()
    }

    // Determine which alert type to use
    let alertType = 'highProfit'
    let reason = `Test alert: High profit trade: $${mockTrade.profit.toFixed(2)} on ${mockTrade.symbol}`

    if (alertTypes.includes('highProfit')) {
      alertType = 'highProfit'
      reason = `Test alert: High profit trade: $${mockTrade.profit.toFixed(2)} on ${mockTrade.symbol}`
    } else if (alertTypes.includes('highLoss')) {
      alertType = 'highLoss'
      mockTrade.profit = account.minLossForAlert || -100
      reason = `Test alert: High loss trade: $${mockTrade.profit.toFixed(2)} on ${mockTrade.symbol}`
    } else if (alertTypes.includes('largeTrade')) {
      alertType = 'largeTrade'
      reason = `Test alert: Large trade opened: ${mockTrade.volume} lots on ${mockTrade.symbol}`
    } else {
      // Use first available alert type
      alertType = alertTypes[0]
      reason = `Test alert for ${alertType}`
    }

    console.log(`[TestAlert] Sending test alert to user ${user.uid} for account ${accountId}`)
    console.log(`[TestAlert] Mock trade:`, mockTrade)
    console.log(`[TestAlert] Alert type: ${alertType}, reason: ${reason}`)

    // Send the test alert
    await sendTradeAlert(user.uid, mockTrade, alertType, reason)

    return NextResponse.json({
      success: true,
      message: 'Test alert sent successfully',
      details: {
        alertType,
        reason,
        mockTrade,
        accountSettings: {
          tradeAlertsEnabled: account.tradeAlertsEnabled,
          alertTypes: account.alertTypes,
          minTradeSizeForAlert: account.minTradeSizeForAlert,
          minProfitForAlert: account.minProfitForAlert,
          minLossForAlert: account.minLossForAlert
        }
      }
    })
  } catch (error) {
    const authError = handleAuthError(error)
    console.error('[TestAlert] Error sending test alert:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test alert'
      },
      { status: authError.status }
    )
  }
}

