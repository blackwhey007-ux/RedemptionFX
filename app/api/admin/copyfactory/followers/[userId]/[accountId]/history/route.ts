import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { getFollowerTradeHistory, getCachedTradeHistory } from '@/lib/copyTradingHistoryService'

/**
 * GET /api/admin/copyfactory/followers/[userId]/[accountId]/history
 * Get trade history for a specific follower account (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; accountId: string } }
) {
  try {
    await requireAdmin(request)

    const { userId, accountId } = params
    const { searchParams } = new URL(request.url)
    
    // Get optional query parameters
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const useCache = searchParams.get('useCache') !== 'false'
    const strategyId = searchParams.get('strategyId')

    if (!strategyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'strategyId is required'
        },
        { status: 400 }
      )
    }

    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined

    let trades

    // Try cached data first if requested
    if (useCache) {
      try {
        trades = await getCachedTradeHistory(accountId, {
          startDate,
          endDate,
          limitCount: 1000
        })
        
        // If we have cached data and it's recent, use it
        if (trades.length > 0) {
          console.log(`[TradeHistoryEndpoint] Using ${trades.length} cached trades`)
        }
      } catch (cacheError) {
        console.warn('[TradeHistoryEndpoint] Cache fetch failed, fetching from API:', cacheError)
      }
    }

    // Fetch from MetaAPI if no cache or cache is empty
    if (!trades || trades.length === 0) {
      try {
        trades = await getFollowerTradeHistory(accountId, userId, strategyId, startDate, endDate)
        console.log(`[TradeHistoryEndpoint] Fetched ${trades.length} trades from MetaAPI`)
      } catch (apiError) {
        console.error('[TradeHistoryEndpoint] MetaAPI fetch failed:', apiError)
        // Return cached data if available, even if old
        if (trades && trades.length > 0) {
          console.log('[TradeHistoryEndpoint] Returning cached data as fallback')
        } else {
          throw apiError
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        trades,
        count: trades.length,
        accountId,
        userId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      },
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('[TradeHistoryEndpoint] Error fetching trade history:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch trade history'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}




