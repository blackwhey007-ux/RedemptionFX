import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseConfig'
import { collectionGroup, getDocs } from 'firebase/firestore'
import {
  shouldPauseCopying,
  pauseCopying,
  shouldResumeCopying,
  resumeCopying
} from '@/lib/copyTradingRiskManagementService'
import {
  getFollowerAccountInfoREST,
  getFollowerPositionsREST
} from '@/lib/copyfactoryClient'

/**
 * GET /api/cron/risk-management-check
 * Cron job to check and manage risk (pause/resume) every 30 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Risk management check cron triggered...')

    // Check if automation is enabled
    if (process.env.ENABLE_AUTOMATION_FEATURES !== 'true') {
      console.log('⚠️ Automation features are disabled')
      return NextResponse.json({
        success: true,
        message: 'Automation features are disabled',
        timestamp: new Date().toISOString()
      })
    }

    // Get all copy trading accounts
    const copyTradingQuery = collectionGroup(db, 'copyTradingAccounts')
    const snapshot = await getDocs(copyTradingQuery)

    const results = {
      checked: 0,
      paused: 0,
      resumed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each account
    for (const docSnapshot of snapshot.docs) {
      try {
        const data = docSnapshot.data()

        // Skip if auto-pause is not enabled
        if (!data.autoPauseEnabled && !data.autoResumeEnabled) {
          results.skipped++
          continue
        }

        results.checked++

        const accountId = data.accountId || docSnapshot.id
        const userId = docSnapshot.ref.parent.parent?.id

        if (!userId) {
          continue
        }

        // Get current account stats
        let accountStats
        try {
          const accountInfo = await getFollowerAccountInfoREST(accountId)
          accountStats = {
            balance: accountInfo?.balance || 0,
            equity: accountInfo?.equity || 0,
            profitLoss: accountInfo?.equity && accountInfo?.balance
              ? accountInfo.equity - accountInfo.balance
              : 0
          }
        } catch (error) {
          console.error(`[RiskManagement] Error fetching stats for account ${accountId}:`, error)
          results.errors.push(`Failed to fetch stats for ${accountId}`)
          continue
        }

        const account = {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          autoPausedAt: data.autoPausedAt?.toDate ? data.autoPausedAt.toDate() : undefined
        }

        // Check if should pause
        if (data.autoPauseEnabled && data.status === 'active' && !account.autoPausedAt) {
          const pauseCheck = shouldPauseCopying(account as any, accountStats)
          if (pauseCheck.shouldPause) {
            await pauseCopying(userId, accountId, pauseCheck.reason || 'Automatic pause triggered')
            results.paused++
            console.log(`⏸️ Paused account ${accountId}: ${pauseCheck.reason}`)
            continue
          }
        }

        // Check if should resume
        if (data.autoResumeEnabled && account.autoPausedAt && data.status !== 'active') {
          const resumeCheck = shouldResumeCopying(account as any, accountStats)
          if (resumeCheck.shouldResume) {
            await resumeCopying(userId, accountId)
            results.resumed++
            console.log(`▶️ Resumed account ${accountId}: ${resumeCheck.reason}`)
          }
        }
      } catch (error) {
        const accountId = docSnapshot.data().accountId || docSnapshot.id
        const errorMsg = `Error processing account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`[RiskManagement] ${errorMsg}`)
        results.errors.push(errorMsg)
      }
    }

    console.log(
      `✅ Risk management check completed: ${results.paused} paused, ${results.resumed} resumed, ${results.checked} checked, ${results.skipped} skipped`
    )

    return NextResponse.json({
      success: true,
      message: 'Risk management check completed',
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in risk management check cron:', error)
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




