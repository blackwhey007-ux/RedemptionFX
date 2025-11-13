import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { getAccountByLinkId } from '@/lib/accountService'
import { syncAccountTrades } from '@/lib/accountMt5SyncService'

/**
 * POST /api/accounts/[accountLinkId]/sync
 * Manually trigger sync for an account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountLinkId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { accountLinkId } = await params
    const body = await request.json().catch(() => ({}))
    
    const { startDate, endDate, mode } = body

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

    // Determine sync mode: 'incremental' (default) or 'full'
    const syncMode = mode === 'full' ? 'full' : 'incremental'
    
    // Parse dates based on sync mode
    let start: Date | undefined = undefined
    let end: Date | undefined = undefined
    
    if (syncMode === 'incremental') {
      // Incremental sync: don't pass startDate, let syncAccountTrades use lastSyncAt
      // Only use provided dates if explicitly given
      if (startDate === 'all' || (startDate === null && !endDate)) {
        // "All time" sync - will be handled by syncAccountTrades with undefined dates
        start = undefined
        end = undefined
        console.log(`[AccountSync API] Incremental sync: all time`)
      } else if (startDate || endDate) {
        // User provided specific dates, use them
        start = startDate ? new Date(startDate) : undefined
        end = endDate ? new Date(endDate) : new Date()
        console.log(`[AccountSync API] Incremental sync with custom dates: ${start?.toISOString()} to ${end?.toISOString()}`)
      } else {
        // No dates provided - let syncAccountTrades handle incremental logic
        start = undefined
        end = undefined
        console.log(`[AccountSync API] Incremental sync: using lastSyncAt (if available) or last 7 days`)
      }
    } else {
      // Full sync mode: use provided dates or default to 1 year
      if (startDate === 'all' || (startDate === null && !endDate)) {
        // "All time" sync
        start = undefined
        end = undefined
        console.log(`[AccountSync API] Full sync: all time`)
      } else {
        const defaultStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year default
        start = startDate ? new Date(startDate) : defaultStart
        end = endDate ? new Date(endDate) : new Date()
        console.log(`[AccountSync API] Full sync: ${start.toISOString()} to ${end.toISOString()}`)
      }
    }

    // Determine which account ID to use
    const mt5AccountId = account.mt5AccountId || account.copyTradingAccountId
    if (!mt5AccountId) {
      return NextResponse.json(
        { success: false, error: 'No MT5 account ID found for this account link' },
        { status: 400 }
      )
    }

    // Sync trades
    const result = await syncAccountTrades(
      user.uid,
      accountLinkId,
      mt5AccountId,
      account.accountType === 'COPY_TRADING' ? 'copy-trading' : 'mt5',
      start,
      end
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Sync failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      summary: result.summary
    })
  } catch (error) {
    console.error('[AccountSync] Error:', error)
    const { status, message } = handleAuthError(error)
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}

/**
 * GET /api/accounts/[accountLinkId]/sync
 * Get sync status for an account
 */
export async function GET(
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

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        accountName: account.accountName,
        accountType: account.accountType,
        mt5AccountId: account.mt5AccountId,
        copyTradingAccountId: account.copyTradingAccountId,
        isActive: account.isActive,
        lastSyncAt: account.lastSyncAt ? (account.lastSyncAt instanceof Date ? account.lastSyncAt.toISOString() : account.lastSyncAt) : null
      }
    })
  } catch (error) {
    console.error('[AccountSync] Error:', error)
    const { status, message } = handleAuthError(error)
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}

