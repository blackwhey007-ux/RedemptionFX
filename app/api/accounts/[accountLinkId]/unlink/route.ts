import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { unlinkAccount, getAccountByLinkId } from '@/lib/accountService'

/**
 * DELETE /api/accounts/[accountLinkId]/unlink
 * Unlink an account from the current user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountLinkId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { accountLinkId } = await params

    if (!accountLinkId) {
      return NextResponse.json(
        { success: false, error: 'Account Link ID is required' },
        { status: 400 }
      )
    }

    // Verify the account belongs to the user
    const account = await getAccountByLinkId(user.uid, accountLinkId)
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found or you do not have access' },
        { status: 404 }
      )
    }

    // Unlink the account
    await unlinkAccount(user.uid, accountLinkId)

    return NextResponse.json({
      success: true,
      message: 'Account unlinked successfully'
    })
  } catch (error) {
    console.error('[UnlinkAccount] Error:', error)
    const { status, message } = handleAuthError(error)
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}



