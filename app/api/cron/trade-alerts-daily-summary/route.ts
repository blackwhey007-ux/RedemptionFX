import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseConfig'
import { collectionGroup, getDocs } from 'firebase/firestore'
import { sendDailySummary } from '@/lib/copyTradingTradeAlertsService'

/**
 * GET /api/cron/trade-alerts-daily-summary
 * Cron job to send daily trade summaries every day at 18:00 UTC
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Daily summary cron triggered...')

    // Check if automation is enabled
    if (process.env.ENABLE_AUTOMATION_FEATURES !== 'true') {
      console.log('⚠️ Automation features are disabled')
      return NextResponse.json({
        success: true,
        message: 'Automation features are disabled',
        timestamp: new Date().toISOString()
      })
    }

    // Get yesterday's date (summaries are for the previous day)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    // Get all copy trading accounts
    const copyTradingQuery = collectionGroup(db, 'copyTradingAccounts')
    const snapshot = await getDocs(copyTradingQuery)

    const results = {
      checked: 0,
      sent: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each account
    for (const docSnapshot of snapshot.docs) {
      try {
        const data = docSnapshot.data()

        // Skip if trade alerts are not enabled
        if (!data.tradeAlertsEnabled) {
          results.skipped++
          continue
        }

        // Check if daily summary is enabled in alert types
        const alertTypes = data.alertTypes || []
        if (!alertTypes.includes('dailySummary')) {
          results.skipped++
          continue
        }

        results.checked++

        const accountId = data.accountId || docSnapshot.id
        const userId = docSnapshot.ref.parent.parent?.id

        if (!userId) {
          continue
        }

        // Send daily summary
        await sendDailySummary(userId, accountId, yesterday)
        results.sent++
        console.log(`✅ Sent daily summary to user ${userId} for account ${accountId}`)
      } catch (error) {
        const accountId = docSnapshot.data().accountId || docSnapshot.id
        const errorMsg = `Error sending summary for account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`[DailySummary] ${errorMsg}`)
        results.errors.push(errorMsg)
      }
    }

    console.log(
      `✅ Daily summary cron completed: ${results.sent} sent, ${results.checked} checked, ${results.skipped} skipped`
    )

    return NextResponse.json({
      success: true,
      message: 'Daily summary cron completed',
      results,
      date: yesterday.toISOString(),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in daily summary cron:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}




