/**
 * MT5 Trade History Service
 * Archives closed trades for historical analysis and performance tracking
 */

import { db } from './firebaseConfig'
import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, QueryConstraint, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Signal } from '@/types/signal'
import { calculatePipsFromPosition } from './pipCalculator'

const HISTORY_COLLECTION = 'mt5_trade_history'

/**
 * Calculate Risk/Reward ratio
 * R:R = Reward / Risk
 * - For BUY: Reward = (TP - Entry), Risk = (Entry - SL)
 * - For SELL: Reward = (Entry - TP), Risk = (SL - Entry)
 */
export function calculateRiskReward(
  type: 'BUY' | 'SELL',
  entryPrice: number,
  stopLoss?: number,
  takeProfit?: number
): number | null {
  if (!stopLoss || !takeProfit || !entryPrice) {
    return null // Can't calculate without SL/TP
  }
  
  let reward: number
  let risk: number
  
  if (type === 'BUY') {
    reward = takeProfit - entryPrice
    risk = entryPrice - stopLoss
  } else {
    reward = entryPrice - takeProfit
    risk = stopLoss - entryPrice
  }
  
  if (risk <= 0) {
    return null // Invalid risk (SL on wrong side)
  }
  
  const rr = reward / risk
  return Math.round(rr * 10) / 10 // Round to 1 decimal
}

export interface MT5TradeHistory {
  id?: string
  positionId: string
  ticket: string
  symbol: string
  type: 'BUY' | 'SELL'
  volume: number
  openPrice: number
  closePrice: number
  stopLoss?: number
  takeProfit?: number
  openTime: Date
  closeTime: Date
  profit: number
  pips: number
  swap: number
  commission: number
  duration: number // seconds
  closedBy: 'TP' | 'SL' | 'MANUAL' | 'UNKNOWN'
  accountId: string
  userId?: string // Owner of the trade (for data isolation)
  profileId?: string // [DEPRECATED] Links to profile - use userId instead
  archivedAt: Date
  riskReward?: number | null
}

export interface TradeHistoryFilters {
  startDate?: Date
  endDate?: Date
  symbol?: string
  type?: 'BUY' | 'SELL'
  profitLoss?: 'profit' | 'loss' | 'all'
  closedBy?: 'TP' | 'SL' | 'MANUAL' | 'all'
  limitCount?: number
  accountId?: string
  userId?: string // Filter by userId (primary filter for data isolation)
  profileId?: string // [DEPRECATED] Filter by profileId (client-side) - use userId instead
}

export interface TradeHistoryStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalPips: number
  totalProfit: number
  averageProfit: number
  averageDuration: number // seconds
  bestTrade: number
  worstTrade: number
  profitFactor: number
  averageRR: number
}

/**
 * Archive a closed trade to history
 */
export async function archiveClosedTrade(params: {
  positionId: string
  signal: Signal
  finalProfit: number
  finalPrice: number
  accountId: string
  realPositionData?: {
    type?: string
    openTime?: Date
    volume?: number
    symbol?: string
    openPrice?: number
    stopLoss?: number
    takeProfit?: number
    commission?: number
    swap?: number
  }
}): Promise<string> {
  try {
    const { positionId, signal, finalProfit, finalPrice, accountId, realPositionData } = params

    console.log(`📦 [ARCHIVE SERVICE] Starting archiveClosedTrade for position: ${positionId}`)
    
    // Use real position data if available, fallback to signal data
    const actualType = realPositionData?.type || signal.type
    const actualOpenTime = realPositionData?.openTime || new Date(signal.postedAt)
    const actualVolume = realPositionData?.volume || 0.1
    const actualSymbol = realPositionData?.symbol || signal.pair
    const actualOpenPrice = realPositionData?.openPrice ?? signal.entryPrice
    const actualStopLoss = realPositionData?.stopLoss ?? signal.stopLoss
    const actualTakeProfit = realPositionData?.takeProfit ?? signal.takeProfit1
    const actualCommission = realPositionData?.commission ?? 0
    const actualSwap = realPositionData?.swap ?? 0
    
    // Normalize type (MT5 sends POSITION_TYPE_BUY/SELL, we need BUY/SELL)
    let normalizedType: 'BUY' | 'SELL' = 'BUY'
    if (actualType.toUpperCase().includes('SELL')) {
      normalizedType = 'SELL'
    } else if (actualType.toUpperCase().includes('BUY')) {
      normalizedType = 'BUY'
    }
    
    console.log(`📋 [ARCHIVE SERVICE] Using REAL position data:`, {
      positionId,
      actualType,
      normalizedType,
      actualOpenTime,
      actualOpenPrice,
      actualVolume,
      actualSymbol,
      actualStopLoss,
      actualTakeProfit,
      actualCommission,
      actualSwap,
      signalType: signal.type,
      signalPair: signal.pair,
      signalEntry: signal.entryPrice,
      signalStopLoss: signal.stopLoss,
      signalTakeProfit: signal.takeProfit1
    })

    // Calculate pips with REAL position type and REAL open price (NOT signal entry!)
    console.log(`🔢 [ARCHIVE SERVICE] Calculating pips with params:`, {
      symbol: actualSymbol,
      type: normalizedType,
      openPrice: actualOpenPrice,
      closePrice: finalPrice,
      finalProfit,
      usingRealOpenPrice: realPositionData?.openPrice !== undefined
    })
    
    let pips = calculatePipsFromPosition({
      symbol: actualSymbol,
      type: normalizedType,
      openPrice: actualOpenPrice,  // ← NOW USING REAL OPEN PRICE
      currentPrice: finalPrice
    })
    
    console.log(`✅ [ARCHIVE SERVICE] Pips calculated: ${pips}`, {
      calculation: `${signal.entryPrice} → ${finalPrice}`,
      type: normalizedType,
      symbol: actualSymbol,
      finalProfit
    })
    
    // CRITICAL: Verify and correct pips sign to match profit sign
    if ((pips > 0 && finalProfit < 0) || (pips < 0 && finalProfit > 0)) {
      console.error(`🚨 [ARCHIVE SERVICE] PIPS/PROFIT MISMATCH DETECTED! Correcting...`, {
        originalPips: pips,
        finalProfit,
        openPrice: actualOpenPrice,
        closePrice: finalPrice,
        type: normalizedType
      })
      // Fix: Flip the sign of pips to match profit sign
      pips = -pips
      console.log(`✅ [ARCHIVE SERVICE] Corrected pips: ${pips}`)
    }

    // Calculate duration with REAL open time
    const closeTime = new Date()
    const duration = Math.floor((closeTime.getTime() - actualOpenTime.getTime()) / 1000) // seconds
    console.log(`⏱️ [ARCHIVE SERVICE] Duration: ${duration} seconds (${Math.floor(duration/60)} minutes)`)

    // Determine how trade was closed
    let closedBy: 'TP' | 'SL' | 'MANUAL' | 'UNKNOWN' = 'UNKNOWN'
    
    if (signal.takeProfit1 && Math.abs(finalPrice - signal.takeProfit1) < 0.0001) {
      closedBy = 'TP'
    } else if (signal.stopLoss && Math.abs(finalPrice - signal.stopLoss) < 0.0001) {
      closedBy = 'SL'
    } else {
      closedBy = 'MANUAL'
    }
    console.log(`🎯 [ARCHIVE SERVICE] Trade closed by: ${closedBy}`)

    const tradeHistory: Omit<MT5TradeHistory, 'id'> = {
      positionId,
      ticket: positionId, // Same as positionId for MT5
      symbol: actualSymbol,           // Use REAL symbol
      type: normalizedType,           // Use REAL type
      volume: actualVolume,           // Use REAL volume
      openPrice: actualOpenPrice,     // Use REAL open price from MT5
      closePrice: finalPrice,
      stopLoss: actualStopLoss,       // Use REAL SL
      takeProfit: actualTakeProfit,   // Use REAL TP
      openTime: actualOpenTime,       // Use REAL open time
      closeTime,
      profit: finalProfit,
      pips,
      swap: actualSwap,
      commission: actualCommission,
      duration,
      closedBy,
      accountId,
      archivedAt: new Date()
    }

    console.log(`💾 [ARCHIVE SERVICE] Writing to Firestore with REAL data`)
    console.log(`📄 [ARCHIVE SERVICE] Document data:`, tradeHistory)

    const docRef = await addDoc(collection(db, HISTORY_COLLECTION), {
      ...tradeHistory,
      openTime: Timestamp.fromDate(actualOpenTime),
      closeTime: Timestamp.fromDate(closeTime),
      archivedAt: Timestamp.now()
    })

    console.log(`✅ [ARCHIVE SERVICE] Trade archived with Firestore ID: ${docRef.id}`)
    console.log(`   ${actualSymbol} ${normalizedType} | Profit: $${finalProfit.toFixed(2)} | Pips: ${pips} | Closed by: ${closedBy}`)
    console.log(`🎉 [ARCHIVE SERVICE] SUCCESS! Go to Trade History page to see this trade!`)
    console.log(`   REAL MT5 DATA: Type=${normalizedType}, OpenTime=${actualOpenTime.toISOString()}, Volume=${actualVolume}`)

    return docRef.id
  } catch (error) {
    console.error('❌ [ARCHIVE SERVICE] CRITICAL ERROR archiving trade:', error)
    console.error('   [ARCHIVE SERVICE] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('   [ARCHIVE SERVICE] Error message:', error instanceof Error ? error.message : String(error))
    console.error('   [ARCHIVE SERVICE] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

/**
 * Update an archived trade
 */
export async function updateTradeHistory(
  tradeId: string,
  updates: Partial<Omit<MT5TradeHistory, 'id' | 'positionId' | 'ticket' | 'accountId' | 'archivedAt'>>
): Promise<void> {
  try {
    const tradeRef = doc(db, HISTORY_COLLECTION, tradeId)
    
    // Convert Date objects to Timestamps
    const firestoreUpdates: any = { ...updates }
    if (updates.openTime) {
      firestoreUpdates.openTime = Timestamp.fromDate(updates.openTime)
    }
    if (updates.closeTime) {
      firestoreUpdates.closeTime = Timestamp.fromDate(updates.closeTime)
    }
    
    await updateDoc(tradeRef, firestoreUpdates)
    console.log(`✅ Trade ${tradeId} updated successfully`)
  } catch (error) {
    console.error('Error updating trade:', error)
    throw error
  }
}

/**
 * Delete an archived trade
 */
export async function deleteTradeHistory(tradeId: string): Promise<void> {
  try {
    const tradeRef = doc(db, HISTORY_COLLECTION, tradeId)
    await deleteDoc(tradeRef)
    console.log(`✅ Trade ${tradeId} deleted successfully`)
  } catch (error) {
    console.error('Error deleting trade:', error)
    throw error
  }
}

/**
 * Get trade history with filters
 */
export async function getTradeHistory(filters: TradeHistoryFilters = {}): Promise<MT5TradeHistory[]> {
  try {
    console.log(`🔍 [GET HISTORY] Fetching trade history with filters:`, filters)
    
    const constraints: QueryConstraint[] = []

    // Add filters
    // Note: If accountId is provided with date filters, we need a composite index
    // If index doesn't exist, we'll fallback to client-side filtering
    const hasDateFilters = !!(filters.startDate || filters.endDate)
    let accountIdToFilter: string | undefined = filters.accountId
    
    // Add userId filter FIRST (primary filter for data isolation)
    // This ensures users only see their own trades
    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId))
    }
    
    if (filters.startDate) {
      constraints.push(where('closeTime', '>=', Timestamp.fromDate(filters.startDate)))
    }
    if (filters.endDate) {
      constraints.push(where('closeTime', '<=', Timestamp.fromDate(filters.endDate)))
    }
    
    // Add accountId filter if provided (may require composite index with date filters)
    // BUT: If profileId is also provided, don't filter by accountId in query
    // (profileId is primary filter, accountId is only fallback for old trades without profileId)
    // We'll catch the error at query time and fallback to client-side filtering
    if (filters.accountId && !(filters as any).profileId) {
      // Only filter by accountId if profileId is NOT provided
      // When profileId is provided, we want all trades and filter by profileId client-side
      constraints.push(where('accountId', '==', filters.accountId))
      accountIdToFilter = undefined // Will be set back if index error occurs
    } else if (filters.accountId) {
      // profileId is provided, so don't filter by accountId in query
      // But keep accountIdToFilter for client-side fallback matching
      accountIdToFilter = filters.accountId
    }
    
    // Note: profileId filtering will be done client-side to avoid index issues
    // We'll filter after fetching
    
    if (filters.symbol) {
      constraints.push(where('symbol', '==', filters.symbol))
    }
    if (filters.type) {
      constraints.push(where('type', '==', filters.type))
    }
    if (filters.closedBy && filters.closedBy !== 'all') {
      constraints.push(where('closedBy', '==', filters.closedBy.toUpperCase()))
    }

    // Default ordering and limit
    constraints.push(orderBy('closeTime', 'desc'))
    // Increase limit significantly to support large datasets
    // Default to 5000 for account-specific queries, 1000 for general queries
    const queryLimit = accountIdToFilter ? (filters.limitCount || 5000) : (filters.limitCount || 1000)
    constraints.push(limit(queryLimit))

    console.log(`📊 [GET HISTORY] Querying collection: ${HISTORY_COLLECTION}`)
    let snapshot
    try {
      const q = query(collection(db, HISTORY_COLLECTION), ...constraints)
      snapshot = await getDocs(q)
      
      // Debug: If no results and we're filtering by accountId, check what accountIds exist
      if (snapshot.empty && filters.accountId) {
        console.log(`🔍 [GET HISTORY] No results for accountId ${filters.accountId}. Checking what accountIds exist in collection...`)
        const allTradesQuery = query(collection(db, HISTORY_COLLECTION), limit(100))
        const allTradesSnapshot = await getDocs(allTradesQuery)
        if (!allTradesSnapshot.empty) {
          const uniqueAccountIds = [...new Set(allTradesSnapshot.docs.map(doc => doc.data().accountId).filter(Boolean))]
          console.log(`📋 [GET HISTORY] Sample accountIds in collection:`, uniqueAccountIds.slice(0, 10))
          console.log(`📋 [GET HISTORY] Total documents in collection: ${allTradesSnapshot.size}`)
        } else {
          console.log(`📋 [GET HISTORY] Collection is completely empty - no trades archived yet`)
        }
      }
    } catch (indexError: any) {
      // If index error and we have accountId filter, retry without accountId in query (client-side filtering)
      if (indexError?.code === 'failed-precondition' && filters.accountId) {
        console.log(`⚠️ [GET HISTORY] Composite index missing. Falling back to client-side filtering`)
        const indexUrl = indexError.message?.match(/https:\/\/[^\s]+/)?.[0]
        if (indexUrl) {
          console.log(`   [GET HISTORY] To create the index, visit: ${indexUrl}`)
        }
        
        // Rebuild constraints without accountId - start with minimal constraints
        let fallbackConstraints: QueryConstraint[] = []
        
        // Try with date filters first
        try {
          if (filters.startDate) {
            fallbackConstraints.push(where('closeTime', '>=', Timestamp.fromDate(filters.startDate)))
          }
          if (filters.endDate) {
            fallbackConstraints.push(where('closeTime', '<=', Timestamp.fromDate(filters.endDate)))
          }
          if (filters.symbol) {
            fallbackConstraints.push(where('symbol', '==', filters.symbol))
          }
          if (filters.type) {
            fallbackConstraints.push(where('type', '==', filters.type))
          }
          if (filters.closedBy && filters.closedBy !== 'all') {
            fallbackConstraints.push(where('closedBy', '==', filters.closedBy.toUpperCase()))
          }
          fallbackConstraints.push(orderBy('closeTime', 'desc'))
          fallbackConstraints.push(limit(filters.limitCount || 1000)) // Higher limit for client-side filtering
          
          const fallbackQ = query(collection(db, HISTORY_COLLECTION), ...fallbackConstraints)
          snapshot = await getDocs(fallbackQ)
          accountIdToFilter = filters.accountId // Will filter client-side
        } catch (fallbackError: any) {
          // If fallback also fails, try even simpler query - just order by closeTime
          console.log(`⚠️ [GET HISTORY] Fallback query also failed. Using minimal query with client-side filtering`)
          try {
            const minimalConstraints: QueryConstraint[] = [
              orderBy('closeTime', 'desc'),
              limit(filters.limitCount || 5000)
            ]
            const minimalQ = query(collection(db, HISTORY_COLLECTION), ...minimalConstraints)
            snapshot = await getDocs(minimalQ)
            accountIdToFilter = filters.accountId // Will filter client-side
            // Note: All other filters (symbol, type, closedBy, dates) will be applied client-side
          } catch (minimalError: any) {
            console.error(`❌ [GET HISTORY] Even minimal query failed:`, minimalError)
            // Return empty snapshot - we'll return empty array
            snapshot = { empty: true, size: 0, docs: [], forEach: () => {} } as any
            accountIdToFilter = filters.accountId
          }
        }
      } else {
        // Not an index error or no accountId filter - rethrow
        throw indexError
      }
    }

    console.log(`📦 [GET HISTORY] Found ${snapshot.size} documents in Firestore`)

    // Debug: Check what accountIds are actually in the fetched documents
    if (snapshot.size > 0 && accountIdToFilter) {
      const sampleDocs = snapshot.docs.slice(0, 10)
      const accountIdsInDocs = [...new Set(sampleDocs.map(d => d.data().accountId).filter(Boolean))]
      console.log(`🔍 [GET HISTORY] Sample accountIds in fetched documents:`, accountIdsInDocs)
      console.log(`🔍 [GET HISTORY] Looking for accountId: ${accountIdToFilter}`)
      console.log(`🔍 [GET HISTORY] Match found: ${accountIdsInDocs.includes(accountIdToFilter)}`)
      
      // Also check profileId if provided
      const profileIdFilter = (filters as any).profileId
      if (profileIdFilter) {
        const profileIdsInDocs = [...new Set(sampleDocs.map(d => d.data().profileId).filter(Boolean))]
        console.log(`🔍 [GET HISTORY] Sample profileIds in fetched documents:`, profileIdsInDocs)
        console.log(`🔍 [GET HISTORY] Looking for profileId: ${profileIdFilter}`)
        console.log(`🔍 [GET HISTORY] Match found: ${profileIdsInDocs.includes(profileIdFilter)}`)
      }
    }

    // Debug: If no documents found, check if collection has any data at all
    if (snapshot.size === 0 && filters.accountId) {
      console.log(`⚠️ [GET HISTORY] No documents found for date range. Checking if collection has any data...`)
      try {
        // Quick check: get first 5 documents to see what accountIds exist
        const sampleQuery = query(
          collection(db, HISTORY_COLLECTION),
          orderBy('closeTime', 'desc'),
          limit(5)
        )
        const sampleSnapshot = await getDocs(sampleQuery)
        if (sampleSnapshot.size > 0) {
          console.log(`📊 [GET HISTORY] Sample accountIds in collection:`, 
            sampleSnapshot.docs.map(d => ({
              accountId: d.data().accountId,
              closeTime: d.data().closeTime?.toDate?.()?.toISOString(),
              symbol: d.data().symbol
            }))
          )
          console.log(`🔍 [GET HISTORY] Looking for accountId: ${filters.accountId}`)
          console.log(`📅 [GET HISTORY] Date range: ${filters.startDate?.toISOString()} to ${filters.endDate?.toISOString()}`)
        } else {
          console.log(`⚠️ [GET HISTORY] Collection is empty - no trades archived yet`)
        }
      } catch (debugError) {
        console.error(`❌ [GET HISTORY] Error checking collection:`, debugError)
      }
    }

    const trades: MT5TradeHistory[] = []
    
    // Track if we're using minimal fallback (need to apply all filters client-side)
    const usingMinimalFallback = accountIdToFilter && !filters.startDate && !filters.endDate && !filters.symbol && !filters.type && !filters.closedBy

    snapshot.forEach((doc) => {
      const data = doc.data()
      
      // Client-side filter by accountId if needed (when index doesn't exist)
      if (accountIdToFilter) {
        // Debug: Log first few mismatches to understand the issue
        if (data.accountId !== accountIdToFilter) {
          // Only log first 3 mismatches to avoid spam
          if (trades.length < 3) {
            console.log(`🔍 [GET HISTORY] Skipping document - accountId mismatch:`, {
              docId: doc.id,
              storedAccountId: data.accountId,
              expectedAccountId: accountIdToFilter,
              match: data.accountId === accountIdToFilter,
              type: typeof data.accountId,
              expectedType: typeof accountIdToFilter
            })
          }
          return // Skip this trade
        }
      }
      
      // Client-side filter by userId (primary filter for data isolation)
      // This ensures users only see their own trades
      const userIdFilter = filters.userId
      if (userIdFilter) {
        // If userId is set in document, it must match
        // If userId is NOT set in document (old trades), include them if accountId matches (fallback)
        if (data.userId) {
          // Document has userId - must match exactly
          if (data.userId !== userIdFilter) {
            return // Skip this trade
          }
        } else {
          // Document doesn't have userId (old trades) - use accountId as fallback
          // Only include if accountId matches (when accountId is provided in filters)
          const accountIdFromFilters = filters.accountId
          if (accountIdFromFilters) {
            // We have accountId in filters - use it as fallback for old trades
            if (data.accountId !== accountIdFromFilters) {
              return // Skip - accountId doesn't match
            }
          } else {
            // If no accountId in filters, skip old trades without userId (can't match them)
            // This prevents showing trades from other users' accounts
            return
          }
        }
      }
      
      // Legacy: Client-side filter by profileId if provided (for backward compatibility)
      const profileIdFilter = (filters as any).profileId
      if (profileIdFilter) {
        // If profileId is set in document, it must match
        // If profileId is NOT set in document (old trades), include them if accountId matches (fallback)
        if (data.profileId) {
          // Document has profileId - must match exactly
          if (data.profileId !== profileIdFilter) {
            return // Skip this trade
          }
        } else {
          // Document doesn't have profileId (old trades) - use accountId as fallback
          // Only include if accountId matches (when accountId is provided in filters)
          const accountIdFromFilters = (filters as any).accountId
          if (accountIdFromFilters) {
            // We have accountId in filters - use it as fallback for old trades
            if (data.accountId !== accountIdFromFilters) {
              return // Skip - accountId doesn't match
            }
          }
          // If no accountId in filters, skip old trades without profileId (can't match them)
          // This prevents showing trades from other users' accounts
        }
      }
      
      // Apply client-side filters if using minimal fallback or if filters weren't in query
      const closeTime = data.closeTime?.toDate?.() || new Date()
      if (filters.startDate && closeTime < filters.startDate) {
        return // Skip - before start date
      }
      if (filters.endDate && closeTime > filters.endDate) {
        return // Skip - after end date
      }
      if (filters.symbol && data.symbol !== filters.symbol) {
        return // Skip - symbol doesn't match
      }
      if (filters.type && data.type !== filters.type) {
        return // Skip - type doesn't match
      }
      if (filters.closedBy && filters.closedBy !== 'all' && data.closedBy !== filters.closedBy.toUpperCase()) {
        return // Skip - closedBy doesn't match
      }
      
      console.log(`📄 [GET HISTORY] Processing document ${doc.id}:`, {
        symbol: data.symbol,
        type: data.type,
        profit: data.profit,
        accountId: data.accountId,
        closeTime: closeTime
      })
      
      // Log what we're reading from Firestore for each document
      const firestoreStopLoss = data.stopLoss
      const firestoreTakeProfit = data.takeProfit
      
      // Log ALL documents to detect duplicates and SL/TP presence
      console.log(`[GET HISTORY] 📄 Document ${doc.id}:`, {
        positionId: data.positionId,
        symbol: data.symbol,
        userId: data.userId || 'NO_USER_ID',
        profileId: data.profileId || 'NO_PROFILE_ID',
        stopLoss: firestoreStopLoss,
        takeProfit: firestoreTakeProfit,
        hasRealSLTP: (firestoreStopLoss && firestoreStopLoss !== 0) || (firestoreTakeProfit && firestoreTakeProfit !== 0),
        closeTime: data.closeTime?.toDate()?.toISOString() || 'NO_TIME'
      })
      
      trades.push({
        id: doc.id,
        positionId: data.positionId,
        ticket: data.ticket,
        symbol: data.symbol,
        type: data.type,
        volume: data.volume,
        openPrice: data.openPrice,
        closePrice: data.closePrice,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        openTime: data.openTime?.toDate() || new Date(),
        closeTime: data.closeTime?.toDate() || new Date(),
        profit: data.profit,
        pips: data.pips,
        swap: data.swap || 0,
        commission: data.commission || 0,
        duration: data.duration,
        closedBy: data.closedBy,
        accountId: data.accountId,
        archivedAt: data.archivedAt?.toDate() || new Date(),
        riskReward: calculateRiskReward(
          data.type,
          data.openPrice,
          data.stopLoss,
          data.takeProfit
        )
      })
    })
    
    if (accountIdToFilter) {
      console.log(`✅ [GET HISTORY] Filtered ${trades.length} trades for accountId ${accountIdToFilter} (client-side)`)
    }

    // Apply profit/loss filter (client-side since Firestore doesn't support OR on different fields)
    let filteredTrades = trades
    if (filters.profitLoss === 'profit') {
      filteredTrades = trades.filter(t => t.profit > 0)
    } else if (filters.profitLoss === 'loss') {
      filteredTrades = trades.filter(t => t.profit < 0)
    }

    // Log final trades array with SL/TP values before returning
    const tradesWithSLTP = filteredTrades.filter(t => t.stopLoss !== undefined || t.takeProfit !== undefined)
    const tradesWithoutSLTP = filteredTrades.filter(t => t.stopLoss === undefined && t.takeProfit === undefined)
    
    console.log(`✅ [GET HISTORY] Returning ${filteredTrades.length} trades after filtering:`, {
      totalTrades: filteredTrades.length,
      tradesWithSLTP: tradesWithSLTP.length,
      tradesWithoutSLTP: tradesWithoutSLTP.length,
      sampleWithSLTP: tradesWithSLTP.slice(0, 3).map(t => ({
        positionId: t.positionId,
        symbol: t.symbol,
        stopLoss: t.stopLoss,
        takeProfit: t.takeProfit
      })),
      sampleWithoutSLTP: tradesWithoutSLTP.slice(0, 3).map(t => ({
        positionId: t.positionId,
        symbol: t.symbol,
        stopLoss: t.stopLoss,
        takeProfit: t.takeProfit
      }))
    })
    console.log(`📋 [GET HISTORY] Position IDs:`, filteredTrades.map(t => t.positionId))
    console.log(`🆔 [GET HISTORY] Firestore Doc IDs:`, filteredTrades.map(t => t.id))

    return filteredTrades
  } catch (error) {
    console.error('❌ [GET HISTORY] Error getting trade history:', error)
    console.error('   [GET HISTORY] Error details:', error instanceof Error ? error.message : String(error))
    throw error
  }
}

/**
 * Calculate statistics from trade history
 */
export async function getTradeHistoryStats(filters: TradeHistoryFilters = {}): Promise<TradeHistoryStats> {
  try {
    const trades = await getTradeHistory({ ...filters, limitCount: 1000 })

    const totalTrades = trades.length
    const winningTrades = trades.filter(t => t.profit > 0).length
    const losingTrades = trades.filter(t => t.profit < 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    const totalPips = trades.reduce((sum, t) => sum + t.pips, 0)
    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0)
    const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0
    const averageDuration = totalTrades > 0 
      ? trades.reduce((sum, t) => sum + t.duration, 0) / totalTrades 
      : 0

    const bestTrade = trades.length > 0 
      ? Math.max(...trades.map(t => t.profit)) 
      : 0
    const worstTrade = trades.length > 0 
      ? Math.min(...trades.map(t => t.profit)) 
      : 0

    // Calculate profit factor
    const totalWins = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0)
    const totalLosses = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0))
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? 999 : 0)

    // Calculate average R:R (only from trades with valid R:R)
    const tradesWithRR = trades.filter(t => t.riskReward !== null && t.riskReward !== undefined)
    const averageRR = tradesWithRR.length > 0
      ? tradesWithRR.reduce((sum, t) => sum + (t.riskReward || 0), 0) / tradesWithRR.length
      : 0

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: Math.round(winRate * 100) / 100,
      totalPips: Math.round(totalPips * 10) / 10,
      totalProfit: Math.round(totalProfit * 100) / 100,
      averageProfit: Math.round(averageProfit * 100) / 100,
      averageDuration: Math.round(averageDuration),
      bestTrade: Math.round(bestTrade * 100) / 100,
      worstTrade: Math.round(worstTrade * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      averageRR: Math.round(averageRR * 10) / 10
    }
  } catch (error) {
    console.error('Error calculating trade history stats:', error)
    throw error
  }
}

/**
 * Get unique symbols from trade history
 */
export async function getTradeHistorySymbols(filters: TradeHistoryFilters = {}): Promise<string[]> {
  try {
    // Use filters but increase limit to get all symbols
    const trades = await getTradeHistory({ ...filters, limitCount: 1000 })
    const symbols = new Set(trades.map(t => t.symbol))
    return Array.from(symbols).sort()
  } catch (error) {
    console.error('Error getting trade history symbols:', error)
    return []
  }
}

