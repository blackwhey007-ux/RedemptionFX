import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { listUserCopyTradingAccounts, migrateLegacyCopyTradingAccount } from '@/lib/copyTradingRepo'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Attempt to migrate legacy account on first access
    await migrateLegacyCopyTradingAccount(user.uid).catch((error) => {
      console.warn('[UserAccountsEndpoint] Legacy migration failed:', error)
    })

    const accounts = await listUserCopyTradingAccounts(user.uid)

    return NextResponse.json({
      success: true,
      accounts
    })
  } catch (error) {
    console.error('[UserAccountsEndpoint] Error listing accounts:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to load accounts'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}





