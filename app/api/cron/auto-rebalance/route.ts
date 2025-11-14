import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseConfig'
import { collectionGroup, getDocs } from 'firebase/firestore'
import {
  shouldRebalance,
  updateRiskMultiplier
} from '@/lib/copyTradingAutoRebalancingService'
import {
  getFollowerAccountInfoREST,
  getFollowerPositionsREST
} from '@/lib/copyfactoryClient'

/**
 * GET /api/cron/auto-rebalance
 * Cron job to automatically rebalance accounts every 6 hours
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Auto-rebalance cron triggered...')

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
      rebalanced: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each account
    for (const docSnapshot of snapshot.docs) {
      try {
        const data = docSnapshot.data()

        // Skip if auto-rebalancing is not enabled
        if (!data.autoRebalancingEnabled) {
          results.skipped++
          continue
        }

        // Skip if account is not active
        if (data.status !== 'active') {
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
          const positions = await getFollowerPositionsREST(accountId)

          accountStats = {
            balance: accountInfo?.balance || 0,
            equity: accountInfo?.equity || 0,
            profitLoss: accountInfo?.equity && accountInfo?.balance
              ? accountInfo.equity - accountInfo.balance
              : 0,
            marginLevel: accountInfo?.marginLevel || 0,
            accountAge: data.createdAt?.toDate
              ? Math.floor((Date.now() - data.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24))
              : 0
          }
        } catch (error) {
          console.error(`[AutoRebalance] Error fetching stats for account ${accountId}:`, error)
          results.errors.push(`Failed to fetch stats for ${accountId}`)
          continue
        }

        // Check if rebalancing is needed
        const account = {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          lastRebalancedAt: data.lastRebalancedAt?.toDate ? data.lastRebalancedAt.toDate() : undefined,
          rebalancingHistory: data.rebalancingHistory || [],
          originalRiskMultiplier: data.originalRiskMultiplier || data.riskMultiplier || 1,
          riskMultiplier: data.riskMultiplier || 1,
          rebalancingRules: data.rebalancingRules || undefined
        }

        const rebalanceCheck = shouldRebalance(account as any, accountStats)

        if (rebalanceCheck.shouldRebalance) {
          // Calculate optimal multiplier
          const originalMultiplier = account.originalRiskMultiplier || account.riskMultiplier
          const rules = account.rebalancingRules || {
            minMultiplier: 0.1,
            maxMultiplier: 10,
            adjustmentStep: 0.1
          }

          const optimalMultiplier = require('@/lib/copyTradingAutoRebalancingService').calculateOptimalRiskMultiplier(
            accountStats,
            originalMultiplier,
            rules
          )

          // Update risk multiplier
          await updateRiskMultiplier(
            userId,
            accountId,
            optimalMultiplier,
            rebalanceCheck.reason || 'Automatic rebalancing'
          )

          results.rebalanced++
          console.log(`✅ Rebalanced account ${accountId}: ${account.riskMultiplier} -> ${optimalMultiplier}`)
        }
      } catch (error) {
        const accountId = docSnapshot.data().accountId || docSnapshot.id
        const errorMsg = `Error processing account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`[AutoRebalance] ${errorMsg}`)
        results.errors.push(errorMsg)
      }
    }

    console.log(`✅ Auto-rebalance cron completed: ${results.rebalanced} rebalanced, ${results.checked} checked, ${results.skipped} skipped`)

    return NextResponse.json({
      success: true,
      message: 'Auto-rebalance cron completed',
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in auto-rebalance cron:', error)
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




