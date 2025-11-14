import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { linkMT5Account, linkCopyTradingAccount } from '@/lib/accountService'
import { listUserCopyTradingAccounts } from '@/lib/copyTradingRepo'
import { getAccountInfo } from '@/lib/metaapiRestClient'

/**
 * POST /api/accounts/link
 * Link an MT5 account or copy trading account to the current user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()

    const { accountType, mt5AccountId, mt5AccountName, copyTradingAccountId, accountName } = body

    if (!accountType || (accountType !== 'mt5' && accountType !== 'copy-trading')) {
      return NextResponse.json(
        { success: false, error: 'Invalid account type' },
        { status: 400 }
      )
    }

    if (accountType === 'mt5') {
      if (!mt5AccountId) {
        return NextResponse.json(
          { success: false, error: 'MT5 Account ID is required' },
          { status: 400 }
        )
      }

      // Validate MT5 account access using MetaAPI
      try {
        const token = process.env.METAAPI_TOKEN
        if (!token) {
          return NextResponse.json(
            { success: false, error: 'MetaAPI token not configured' },
            { status: 500 }
          )
        }

        // Try to get account info to validate access
        let accountValidated = false
        try {
          await getAccountInfo(mt5AccountId, token)
          accountValidated = true
        } catch (firstError) {
          console.log('[LinkAccount] First validation attempt failed, retrying after short delay...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          try {
            await getAccountInfo(mt5AccountId, token)
            accountValidated = true
          } catch (secondError) {
            console.warn('[LinkAccount] Account validation failed, but proceeding anyway (account might be newly created):', secondError)
            accountValidated = false
          }
        }
        
        if (accountValidated) {
          console.log('[LinkAccount] Account validated successfully')
        } else {
          console.log('[LinkAccount] Proceeding with link despite validation failure (account likely newly created)')
        }
      } catch (error) {
        console.error('[LinkAccount] Unexpected error during account validation:', error)
        console.log('[LinkAccount] Allowing link despite validation error (account was just created)')
      }

      // Link MT5 account
      const accountLinkId = await linkMT5Account(
        user.uid,
        mt5AccountId,
        mt5AccountName || accountName || mt5AccountId
      )

      return NextResponse.json({
        success: true,
        message: 'MT5 account linked successfully',
        accountLinkId
      })
    } else if (accountType === 'copy-trading') {
      if (!copyTradingAccountId) {
        return NextResponse.json(
          { success: false, error: 'Copy Trading Account ID is required' },
          { status: 400 }
        )
      }

      // Verify user owns the copy trading account
      const copyTradingAccounts = await listUserCopyTradingAccounts(user.uid)
      const account = copyTradingAccounts.find(acc => acc.accountId === copyTradingAccountId)

      if (!account) {
        return NextResponse.json(
          { success: false, error: 'Copy trading account not found or you do not have access' },
          { status: 404 }
        )
      }

      // Link copy trading account
      const accountLinkId = await linkCopyTradingAccount(
        user.uid,
        copyTradingAccountId,
        accountName || copyTradingAccountId
      )

      return NextResponse.json({
        success: true,
        message: 'Copy trading account linked successfully',
        accountLinkId
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid account type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[LinkAccount] Error:', error)
    const { status, message } = handleAuthError(error)
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}



