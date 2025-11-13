import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { deleteUserCopyTradingAccount } from '@/lib/copyTradingRepo'
import {
  removeSubscriber,
  deleteSubscriberAccount,
  unsubscribeFromStrategy
} from '@/lib/copyfactoryClient'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; accountId: string } }
) {
  try {
    await requireAdmin(request)

    const { userId, accountId } = params

    if (!userId || !accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId and accountId are required'
        },
        { status: 400 }
      )
    }

    // Attempt to unsubscribe and remove subscriber configuration
    try {
      // We don't know which strategy they were subscribed to; removing whole subscriber is enough
      await removeSubscriber(accountId)
    } catch (error) {
      console.warn('[AdminFollowersDelete] Failed to remove subscriber config:', error)
    }

    try {
      await deleteSubscriberAccount(accountId)
    } catch (error) {
      console.warn('[AdminFollowersDelete] Failed to delete MetaApi account:', error)
    }

    await deleteUserCopyTradingAccount(userId, accountId)

    return NextResponse.json({
      success: true,
      accountId
    })
  } catch (error) {
    console.error('[AdminFollowersDelete] Error deleting follower:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to delete follower'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

