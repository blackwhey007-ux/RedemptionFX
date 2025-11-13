import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import {
  shouldPauseCopying,
  pauseCopying,
  shouldResumeCopying,
  resumeCopying,
  getRiskStatus,
  checkDrawdownThreshold
} from '@/lib/copyTradingRiskManagementService'
import { listUserCopyTradingAccounts } from '@/lib/copyTradingRepo'
import {
  getFollowerAccountInfoREST,
  getFollowerPositionsREST
} from '@/lib/copyfactoryClient'

/**
 * POST /api/copyfactory/accounts/[accountId]/risk-management
 * Manually pause/resume copying
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { accountId } = await params
    const body = await request.json()
    const { action } = body // 'pause' or 'resume'

    if (!action || !['pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "pause" or "resume"' },
        { status: 400 }
      )
    }

    // Get account details
    const accounts = await listUserCopyTradingAccounts(user.uid)
    const account = accounts.find((acc) => acc.accountId === accountId)

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    if (action === 'pause') {
      if (!account.autoPauseEnabled) {
        return NextResponse.json(
          { success: false, error: 'Auto-pause is not enabled for this account' },
          { status: 400 }
        )
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
        console.error('[RiskManagementAPI] Error fetching account stats:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch account statistics' },
          { status: 500 }
        )
      }

      const pauseCheck = shouldPauseCopying(account, accountStats)
      if (!pauseCheck.shouldPause) {
        return NextResponse.json({
          success: false,
          message: 'Pause not needed',
          reason: pauseCheck.reason
        })
      }

      await pauseCopying(user.uid, accountId, pauseCheck.reason || 'Manual pause triggered')

      return NextResponse.json({
        success: true,
        message: 'Copying paused successfully',
        reason: pauseCheck.reason
      })
    } else {
      // Resume
      if (!account.autoResumeEnabled) {
        return NextResponse.json(
          { success: false, error: 'Auto-resume is not enabled for this account' },
          { status: 400 }
        )
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
        console.error('[RiskManagementAPI] Error fetching account stats:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch account statistics' },
          { status: 500 }
        )
      }

      const resumeCheck = shouldResumeCopying(account, accountStats)
      if (!resumeCheck.shouldResume) {
        return NextResponse.json({
          success: false,
          message: 'Resume not safe',
          reason: resumeCheck.reason
        })
      }

      await resumeCopying(user.uid, accountId)

      return NextResponse.json({
        success: true,
        message: 'Copying resumed successfully',
        reason: resumeCheck.reason
      })
    }
  } catch (error) {
    console.error('[RiskManagementAPI] Error:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return handleAuthError()
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage risk'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/copyfactory/accounts/[accountId]/risk-management
 * Get current risk status and drawdown metrics
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
      console.error('[RiskManagementAPI] Error fetching account stats:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch account statistics' },
        { status: 500 }
      )
    }

    // Get risk status
    const riskStatus = await getRiskStatus(user.uid, accountId, accountStats)

    // Calculate drawdown details
    const { drawdown, exceedsThreshold } = checkDrawdownThreshold(
      accountStats,
      account.maxDrawdownPercent
    )

    return NextResponse.json({
      success: true,
      riskStatus,
      drawdown: {
        current: drawdown,
        threshold: account.maxDrawdownPercent || 20,
        exceedsThreshold,
        resumeThreshold: account.resumeDrawdownPercent || 15
      },
      account: {
        autoPauseEnabled: account.autoPauseEnabled,
        autoResumeEnabled: account.autoResumeEnabled,
        maxDrawdownPercent: account.maxDrawdownPercent,
        resumeDrawdownPercent: account.resumeDrawdownPercent,
        autoPausedAt: account.autoPausedAt,
        autoPauseReason: account.autoPauseReason
      }
    })
  } catch (error) {
    console.error('[RiskManagementAPI] Error:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return handleAuthError()
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get risk status'
      },
      { status: 500 }
    )
  }
}

