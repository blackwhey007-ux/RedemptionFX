import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import {
  shouldRebalance,
  updateRiskMultiplier,
  getRebalancingHistory,
  calculateOptimalRiskMultiplier
} from '@/lib/copyTradingAutoRebalancingService'
import { listUserCopyTradingAccounts } from '@/lib/copyTradingRepo'
import {
  getFollowerAccountInfoREST,
  getFollowerPositionsREST
} from '@/lib/copyfactoryClient'

/**
 * POST /api/copyfactory/accounts/[accountId]/rebalance
 * Manually trigger rebalancing for an account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { accountId } = await params

    // Get account details
    const accounts = await listUserCopyTradingAccounts(user.uid)
    const account = accounts.find((acc) => acc.accountId === accountId)

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    if (!account.autoRebalancingEnabled) {
      return NextResponse.json(
        { success: false, error: 'Auto-rebalancing is not enabled for this account' },
        { status: 400 }
      )
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
        accountAge: account.createdAt
          ? Math.floor((Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0
      }
    } catch (error) {
      console.error('[RebalanceAPI] Error fetching account stats:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch account statistics' },
        { status: 500 }
      )
    }

    // Check if rebalancing is needed
    const rebalanceCheck = shouldRebalance(account, accountStats)
    if (!rebalanceCheck.shouldRebalance) {
      return NextResponse.json({
        success: false,
        message: 'Rebalancing not needed',
        reason: rebalanceCheck.reason
      })
    }

    // Calculate optimal multiplier
    const originalMultiplier = account.originalRiskMultiplier || account.riskMultiplier
    const rules = account.rebalancingRules || {
      minMultiplier: 0.1,
      maxMultiplier: 10,
      adjustmentStep: 0.1
    }

    const optimalMultiplier = calculateOptimalRiskMultiplier(
      accountStats,
      originalMultiplier,
      rules
    )

    // Update risk multiplier
    await updateRiskMultiplier(
      user.uid,
      accountId,
      optimalMultiplier,
      rebalanceCheck.reason || 'Manual rebalancing triggered'
    )

    return NextResponse.json({
      success: true,
      message: 'Account rebalanced successfully',
      oldMultiplier: account.riskMultiplier,
      newMultiplier: optimalMultiplier,
      reason: rebalanceCheck.reason
    })
  } catch (error) {
    console.error('[RebalanceAPI] Error:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return handleAuthError()
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rebalance account'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/copyfactory/accounts/[accountId]/rebalance
 * Get rebalancing history and recommendations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { accountId } = await params

    // Get account details
    const accounts = await listUserCopyTradingAccounts(user.uid)
    const account = accounts.find((acc) => acc.accountId === accountId)

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get rebalancing history
    const history = await getRebalancingHistory(user.uid, accountId, 20)

    // Get current account stats for recommendation
    let recommendation = null
    try {
      const accountInfo = await getFollowerAccountInfoREST(accountId)
      const positions = await getFollowerPositionsREST(accountId)

      const accountStats = {
        balance: accountInfo?.balance || 0,
        equity: accountInfo?.equity || 0,
        profitLoss: accountInfo?.equity && accountInfo?.balance
          ? accountInfo.equity - accountInfo.balance
          : 0,
        marginLevel: accountInfo?.marginLevel || 0,
        accountAge: account.createdAt
          ? Math.floor((Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0
      }

      if (account.autoRebalancingEnabled && account.originalRiskMultiplier && account.rebalancingRules) {
        const optimalMultiplier = calculateOptimalRiskMultiplier(
          accountStats,
          account.originalRiskMultiplier,
          account.rebalancingRules
        )

        const rebalanceCheck = shouldRebalance(account, accountStats)

        recommendation = {
          currentMultiplier: account.riskMultiplier,
          recommendedMultiplier: optimalMultiplier,
          shouldRebalance: rebalanceCheck.shouldRebalance,
          reason: rebalanceCheck.reason
        }
      }
    } catch (error) {
      console.error('[RebalanceAPI] Error fetching recommendation:', error)
      // Continue without recommendation
    }

    return NextResponse.json({
      success: true,
      history,
      recommendation,
      account: {
        autoRebalancingEnabled: account.autoRebalancingEnabled,
        originalRiskMultiplier: account.originalRiskMultiplier,
        currentRiskMultiplier: account.riskMultiplier,
        rebalancingRules: account.rebalancingRules,
        lastRebalancedAt: account.lastRebalancedAt
      }
    })
  } catch (error) {
    console.error('[RebalanceAPI] Error:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return handleAuthError()
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get rebalancing data'
      },
      { status: 500 }
    )
  }
}

