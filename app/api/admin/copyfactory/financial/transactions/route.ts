import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { createTransaction, filterTransactions, sortTransactionsByDate } from '@/lib/transactionUtils'

/**
 * GET /api/admin/copyfactory/financial/transactions
 * Get transaction history (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'inflow' | 'outflow' | null
    const category = searchParams.get('category') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    // Fetch statistics data (read-only)
    const statsResponse = await fetch(`${request.nextUrl.origin}/api/admin/copyfactory/followers/statistics`)
    if (!statsResponse.ok) {
      throw new Error('Failed to fetch statistics data')
    }
    const statsData = await statsResponse.json()

    if (!statsData.success) {
      throw new Error(statsData.error || 'Failed to load statistics')
    }

    const followers = statsData.followers || []

    // Generate transactions from follower data
    const transactions = followers
      .filter((f: any) => f.status === 'success')
      .map((f: any, index: number) => {
        const profitLoss = (f.equity || 0) - (f.balance || 0)
        return createTransaction(
          profitLoss >= 0 ? 'inflow' : 'outflow',
          Math.abs(profitLoss),
          `Account ${f.login || f.accountId.substring(0, 8)} - ${profitLoss >= 0 ? 'Profit' : 'Loss'}`,
          'Trading',
          f.accountId,
          f.userId
        )
      })

    // Apply filters
    const filter = {
      type: type || undefined,
      category,
      startDate,
      endDate
    }

    let filteredTransactions = filterTransactions(transactions, filter)
    filteredTransactions = sortTransactionsByDate(filteredTransactions, false) // Newest first

    return NextResponse.json({
      success: true,
      data: {
        transactions: filteredTransactions,
        total: filteredTransactions.length,
        filter
      },
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('[TransactionsEndpoint] Error fetching transactions:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}




