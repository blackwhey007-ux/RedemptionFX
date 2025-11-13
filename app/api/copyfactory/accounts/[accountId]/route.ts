import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { deleteUserCopyTradingAccount, listUserCopyTradingAccounts, updateUserCopyTradingAccountStatus } from '@/lib/copyTradingRepo'
import { removeSubscriber, deleteSubscriberAccount } from '@/lib/copyfactoryClient'
import type { UserCopyTradingAccount } from '@/lib/copyTradingRepo'

/**
 * PATCH /api/copyfactory/accounts/[accountId]
 * Update automation settings for an account
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { accountId } = await params
    const body = await request.json()

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account ID is required'
        },
        { status: 400 }
      )
    }

    // Get account to verify ownership
    const accounts = await listUserCopyTradingAccounts(user.uid)
    const account = accounts.find((acc) => acc.accountId === accountId)

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not found'
        },
        { status: 404 }
      )
    }

    // Update only automation-related fields
    const updates: Partial<UserCopyTradingAccount> = {}

    if (typeof body.autoRebalancingEnabled === 'boolean') {
      updates.autoRebalancingEnabled = body.autoRebalancingEnabled
    }
    if (typeof body.originalRiskMultiplier === 'number') {
      updates.originalRiskMultiplier = body.originalRiskMultiplier
    }
    if (body.rebalancingRules) {
      updates.rebalancingRules = body.rebalancingRules
    }
    if (typeof body.autoPauseEnabled === 'boolean') {
      updates.autoPauseEnabled = body.autoPauseEnabled
    }
    if (typeof body.maxDrawdownPercent === 'number') {
      updates.maxDrawdownPercent = body.maxDrawdownPercent
    }
    if (typeof body.autoResumeEnabled === 'boolean') {
      updates.autoResumeEnabled = body.autoResumeEnabled
    }
    if (typeof body.resumeDrawdownPercent === 'number') {
      updates.resumeDrawdownPercent = body.resumeDrawdownPercent
    }
    if (typeof body.autoDisconnectEnabled === 'boolean') {
      updates.autoDisconnectEnabled = body.autoDisconnectEnabled
    }
    if (typeof body.maxConsecutiveErrors === 'number') {
      updates.maxConsecutiveErrors = body.maxConsecutiveErrors
    }
    if (typeof body.errorWindowMinutes === 'number') {
      updates.errorWindowMinutes = body.errorWindowMinutes
    }
    if (typeof body.tradeAlertsEnabled === 'boolean') {
      updates.tradeAlertsEnabled = body.tradeAlertsEnabled
    }
    if (Array.isArray(body.alertTypes)) {
      updates.alertTypes = body.alertTypes
    }
    if (typeof body.minTradeSizeForAlert === 'number') {
      updates.minTradeSizeForAlert = body.minTradeSizeForAlert
    }
    if (typeof body.minProfitForAlert === 'number') {
      updates.minProfitForAlert = body.minProfitForAlert
    }
    if (typeof body.minLossForAlert === 'number') {
      updates.minLossForAlert = body.minLossForAlert
    }
    if (typeof body.dailySummaryTime === 'string') {
      updates.dailySummaryTime = body.dailySummaryTime
    }

    // Update account in Firestore
    await updateUserCopyTradingAccountStatus(
      user.uid,
      accountId,
      account.status,
      account.lastError,
      updates
    )

    return NextResponse.json({
      success: true,
      message: 'Automation settings updated successfully'
    })
  } catch (error) {
    console.error('[UserAccountUpdateEndpoint] Error updating account:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to update automation settings'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { accountId } = await params

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account ID is required'
        },
        { status: 400 }
      )
    }

    try {
      await removeSubscriber(accountId)
    } catch (error) {
      console.warn('[UserAccountDeleteEndpoint] Failed to remove subscriber config:', error)
    }

    try {
      await deleteSubscriberAccount(accountId)
    } catch (error) {
      console.warn('[UserAccountDeleteEndpoint] Failed to delete MetaApi account:', error)
    }

    await deleteUserCopyTradingAccount(user.uid, accountId)

    return NextResponse.json({
      success: true,
      accountId
    })
  } catch (error) {
    console.error('[UserAccountDeleteEndpoint] Error deleting account:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to delete copy trading account'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

