import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseConfig'
import { collectionGroup, getDocs } from 'firebase/firestore'
import { shouldDisconnect, disconnectAccount, resetErrorCount } from '@/lib/copyTradingAutoDisconnectService'
import {
  getFollowerAccountInfoREST,
  getFollowerPositionsREST
} from '@/lib/copyfactoryClient'

/**
 * GET /api/cron/auto-disconnect-check
 * Cron job to check and disconnect accounts with persistent errors every 15 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Auto-disconnect check cron triggered...')

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
      disconnected: 0,
      reset: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each account
    for (const docSnapshot of snapshot.docs) {
      try {
        const data = docSnapshot.data()

        // Skip if auto-disconnect is not enabled
        if (!data.autoDisconnectEnabled) {
          results.skipped++
          continue
        }

        // Skip if already disconnected
        if (data.autoDisconnectedAt) {
          results.skipped++
          continue
        }

        results.checked++

        const accountId = data.accountId || docSnapshot.id
        const userId = docSnapshot.ref.parent.parent?.id

        if (!userId) {
          continue
        }

        const account = {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          lastErrorAt: data.lastErrorAt?.toDate ? data.lastErrorAt.toDate() : undefined,
          autoDisconnectedAt: data.autoDisconnectedAt?.toDate ? data.autoDisconnectedAt.toDate() : undefined
        }

        // Check if should disconnect
        if (shouldDisconnect(account as any)) {
          await disconnectAccount(
            userId,
            accountId,
            `Exceeded error threshold: ${account.consecutiveErrorCount || 0} consecutive errors`
          )
          results.disconnected++
          console.log(`🔌 Disconnected account ${accountId} due to persistent errors`)
          continue
        }

        // Check if account recovered (no recent errors and account is working)
        if ((account.consecutiveErrorCount || 0) > 0) {
          try {
            // Try to fetch account info to see if it's working
            await getFollowerAccountInfoREST(accountId)
            // If successful, reset error count
            await resetErrorCount(userId, accountId)
            results.reset++
            console.log(`✅ Reset error count for account ${accountId} (account recovered)`)
          } catch (error) {
            // Account still has errors, don't reset
          }
        }
      } catch (error) {
        const accountId = docSnapshot.data().accountId || docSnapshot.id
        const errorMsg = `Error processing account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`[AutoDisconnect] ${errorMsg}`)
        results.errors.push(errorMsg)
      }
    }

    console.log(
      `✅ Auto-disconnect check completed: ${results.disconnected} disconnected, ${results.reset} reset, ${results.checked} checked, ${results.skipped} skipped`
    )

    return NextResponse.json({
      success: true,
      message: 'Auto-disconnect check completed',
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in auto-disconnect check cron:', error)
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




