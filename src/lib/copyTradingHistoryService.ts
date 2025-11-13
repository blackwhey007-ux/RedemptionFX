/**
 * Copy Trading History Service
 * Service to fetch and store follower trade history
 */

import { db } from '@/lib/firebaseConfig'
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, Timestamp, QueryConstraint } from 'firebase/firestore'
import { getDeals } from './metaapiRestClient'
import { getMasterStrategy } from './copyTradingRepo'
import { decrypt } from './crypto'

const TRADE_HISTORY_COLLECTION = 'copyTrading/tradeHistory'

export interface FollowerTrade {
  id: string
  accountId: string
  userId: string
  ticket: string
  positionId?: string
  symbol: string
  type: string
  volume: number
  openPrice: number
  closePrice: number
  profit: number
  commission: number
  swap: number
  openTime: Date | string
  closeTime: Date | string
  comment?: string
  // Metadata
  cachedAt: Date | string
  source: 'metaapi' | 'cached'
}

export interface TradeHistoryFilters {
  startDate?: Date
  endDate?: Date
  symbol?: string
  type?: string
  minProfit?: number
  maxProfit?: number
  limitCount?: number
}

/**
 * Get trade history for a follower account
 * Uses MetaAPI REST API and caches results in Firestore
 */
export async function getFollowerTradeHistory(
  accountId: string,
  userId: string,
  strategyId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FollowerTrade[]> {
  try {
    console.log(`[CopyTradingHistory] Fetching trade history for account ${accountId}`)

    // Get master strategy token
    const masterStrategy = await getMasterStrategy(strategyId)
    if (!masterStrategy?.tokenEnc) {
      throw new Error('Master strategy token not found')
    }

    const masterToken = await decrypt(masterStrategy.tokenEnc)
    if (!masterToken || typeof masterToken !== 'string') {
      throw new Error('Failed to decrypt master token')
    }

    // Check cache first (1 hour TTL)
    const cacheKey = `history:${accountId}:${startDate?.toISOString() || 'all'}:${endDate?.toISOString() || 'all'}`
    const cachedDoc = await getDoc(doc(db, `${TRADE_HISTORY_COLLECTION}/cache/${cacheKey}`))
    
    if (cachedDoc.exists()) {
      const cachedData = cachedDoc.data()
      const cacheAge = Date.now() - (cachedData.cachedAt?.toMillis?.() || cachedData.cachedAt || 0)
      const oneHour = 60 * 60 * 1000

      if (cacheAge < oneHour) {
        console.log(`[CopyTradingHistory] Using cached data (age: ${Math.round(cacheAge / 1000)}s)`)
        return cachedData.trades || []
      }
    }

    // Fetch from MetaAPI
    const deals = await getDeals(accountId, masterToken, undefined, startDate, endDate)

    // Transform to FollowerTrade format
    const trades: FollowerTrade[] = deals.map((deal: any, index: number) => ({
      id: `trade-${accountId}-${deal.id || deal.ticket || index}`,
      accountId,
      userId,
      ticket: deal.id || deal.ticket || deal.dealId || String(index),
      positionId: deal.positionId,
      symbol: deal.symbol || '',
      type: deal.type || deal.action || '',
      volume: deal.volume || deal.lots || 0,
      openPrice: deal.openPrice || 0,
      closePrice: deal.closePrice || deal.price || 0,
      profit: deal.profit || deal.realizedProfit || 0,
      commission: deal.commission || 0,
      swap: deal.swap || 0,
      openTime: deal.openTime ? new Date(deal.openTime) : new Date(),
      closeTime: deal.closeTime ? new Date(deal.closeTime) : new Date(),
      comment: deal.comment || deal.description,
      cachedAt: new Date(),
      source: 'metaapi'
    }))

    // Cache the results
    try {
      await setDoc(doc(db, `${TRADE_HISTORY_COLLECTION}/cache/${cacheKey}`), {
        trades,
        cachedAt: Timestamp.now(),
        accountId,
        userId
      })
    } catch (cacheError) {
      console.warn('[CopyTradingHistory] Failed to cache results:', cacheError)
    }

    // Save individual trades to Firestore for marketing
    for (const trade of trades) {
      try {
        const tradeDocRef = doc(db, `${TRADE_HISTORY_COLLECTION}/accounts/${accountId}/trades/${trade.id}`)
        await setDoc(tradeDocRef, {
          ...trade,
          openTime: Timestamp.fromDate(trade.openTime instanceof Date ? trade.openTime : new Date(trade.openTime)),
          closeTime: Timestamp.fromDate(trade.closeTime instanceof Date ? trade.closeTime : new Date(trade.closeTime)),
          cachedAt: Timestamp.now()
        }, { merge: true })
      } catch (saveError) {
        console.warn(`[CopyTradingHistory] Failed to save trade ${trade.id}:`, saveError)
      }
    }

    console.log(`[CopyTradingHistory] Fetched ${trades.length} trades for account ${accountId}`)
    return trades
  } catch (error) {
    console.error(`[CopyTradingHistory] Error fetching trade history for ${accountId}:`, error)
    throw error
  }
}

/**
 * Get cached trade history from Firestore
 */
export async function getCachedTradeHistory(
  accountId: string,
  filters: TradeHistoryFilters = {}
): Promise<FollowerTrade[]> {
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters.startDate) {
      constraints.push(where('closeTime', '>=', Timestamp.fromDate(filters.startDate)))
    }
    if (filters.endDate) {
      constraints.push(where('closeTime', '<=', Timestamp.fromDate(filters.endDate)))
    }
    if (filters.symbol) {
      constraints.push(where('symbol', '==', filters.symbol))
    }
    if (filters.type) {
      constraints.push(where('type', '==', filters.type))
    }

    constraints.push(orderBy('closeTime', 'desc'))
    constraints.push(limit(filters.limitCount || 100))

    const q = query(
      collection(db, `${TRADE_HISTORY_COLLECTION}/accounts/${accountId}/trades`),
      ...constraints
    )

    const snapshot = await getDocs(q)
    const trades: FollowerTrade[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      trades.push({
        id: doc.id,
        accountId: data.accountId,
        userId: data.userId,
        ticket: data.ticket,
        positionId: data.positionId,
        symbol: data.symbol,
        type: data.type,
        volume: data.volume,
        openPrice: data.openPrice,
        closePrice: data.closePrice,
        profit: data.profit,
        commission: data.commission,
        swap: data.swap,
        openTime: data.openTime?.toDate?.() || data.openTime,
        closeTime: data.closeTime?.toDate?.() || data.closeTime,
        comment: data.comment,
        cachedAt: data.cachedAt?.toDate?.() || data.cachedAt,
        source: 'cached'
      })
    })

    return trades
  } catch (error) {
    console.error('[CopyTradingHistory] Error getting cached trade history:', error)
    return []
  }
}




