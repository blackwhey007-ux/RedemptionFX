/**
 * Copy Trading Performance Service
 * Service to calculate and store performance data for calendar and reports
 */

import { db } from '@/lib/firebaseConfig'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { getTradeHistory, MT5TradeHistory } from './mt5TradeHistoryService'
import { calculatePipsFromPosition } from './pipCalculator'

const PERFORMANCE_COLLECTION = 'copyTrading/performance'

export interface DailyPerformance {
  date: string // YYYY-MM-DD
  totalAccounts: number
  activeAccounts: number
  totalProfit: number
  totalPips: number
  totalTrades: number
  winRate: number
  averageProfit: number
  followers: Array<{
    accountId: string
    userId: string
    profit: number
    trades: number
  }>
}

export interface WeeklyPerformance {
  weekId: string // YYYY-W## format
  startDate: string
  endDate: string
  totalProfit: number
  totalTrades: number
  winRate: number
  bestDay: string
  worstDay: string
  dailyBreakdown: DailyPerformance[]
}

export interface MonthlyPerformance {
  monthId: string // YYYY-MM format
  totalProfit: number
  totalTrades: number
  winRate: number
  averageDailyProfit: number
  growthRate: number
  weeklyBreakdown: WeeklyPerformance[]
}

/**
 * Calculate daily performance from master account trades
 * Uses Firestore mt5_trade_history (same as VIP results page) - ZERO API credits
 */
export async function calculateDailyPerformance(
  date: Date,
  masterAccountId: string,
  strategyId?: string
): Promise<DailyPerformance> {
  try {
    const dateStr = date.toISOString().split('T')[0]
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    console.log(`[PerformanceService] Calculating daily performance for ${dateStr} from master account ${masterAccountId} (using Firestore - no credits)`)

    // Fetch trades from Firestore mt5_trade_history collection (same as VIP results)
    // This uses data archived by SDK streaming - ZERO API credits consumed
    let masterAccountTrades: MT5TradeHistory[] = []
    try {
      // First, try to get trades without accountId filter to see if there are any trades at all
      const allTradesInRange = await getTradeHistory({
        startDate: startOfDay,
        endDate: endOfDay,
        limitCount: 1000
      })
      
      console.log(`[PerformanceService] Total trades in date range (all accounts): ${allTradesInRange.length}`)
      
      if (allTradesInRange.length > 0) {
        // Show what accountIds exist in this date range
        const uniqueAccountIds = [...new Set(allTradesInRange.map(t => t.accountId))]
        console.log(`[PerformanceService] AccountIds found in date range:`, uniqueAccountIds)
        console.log(`[PerformanceService] Looking for accountId: ${masterAccountId}`)
        
        // Filter by master account ID
        masterAccountTrades = allTradesInRange.filter(t => t.accountId === masterAccountId)
        console.log(`[PerformanceService] Filtered to ${masterAccountTrades.length} trades for master account ${masterAccountId}`)
      } else {
        console.log(`[PerformanceService] No trades found in date range ${dateStr} (all accounts)`)
        console.log(`[PerformanceService] This could mean:`)
        console.log(`  - No trades were executed on ${dateStr}`)
        console.log(`  - Trades haven't been archived yet by streaming SDK`)
        console.log(`  - Date range is incorrect`)
      }
      
      // Debug: Log first few trades to verify accountId matching
      if (masterAccountTrades.length > 0) {
        console.log(`[PerformanceService] Sample trade accountIds:`, masterAccountTrades.slice(0, 3).map(t => t.accountId))
      }
    } catch (tradeError) {
      console.error(`[PerformanceService] Error fetching trades from Firestore:`, tradeError)
      // Continue with empty trades array - return empty performance
    }

    // Calculate performance from master account trades
    const totalProfit = masterAccountTrades.reduce((sum: number, t: MT5TradeHistory) => sum + (t.profit || 0), 0)
    
    // Calculate total pips - check if pips field exists and is valid
    // If pips is missing or 0, recalculate from openPrice/closePrice
    let totalPips = 0
    let pipsCount = 0
    let recalculatedCount = 0
    
    masterAccountTrades.forEach((t: MT5TradeHistory) => {
      let tradePips = t.pips
      
      // Always recalculate pips if:
      // 1. Pips is missing, null, or NaN
      // 2. Pips is 0 (always recalculate to ensure accuracy, even for breakeven trades)
      const needsRecalculation = 
        tradePips === undefined || 
        tradePips === null || 
        isNaN(tradePips) ||
        tradePips === 0 // Always recalculate if pips is 0 to ensure accuracy
      
      // Log if we're recalculating
      if (needsRecalculation && t.openPrice && t.closePrice) {
        console.log(`[PerformanceService] Recalculating pips for trade ${t.positionId} (stored: ${t.pips}, profit: ${t.profit})`)
      }
      
      if (needsRecalculation) {
        if (t.openPrice && t.closePrice && t.symbol && t.type) {
          try {
            const calculatedPips = calculatePipsFromPosition({
              symbol: t.symbol,
              type: t.type,
              openPrice: t.openPrice,
              currentPrice: t.closePrice
            })
            
            // Only use recalculated value if it's valid
            if (calculatedPips !== undefined && calculatedPips !== null && !isNaN(calculatedPips)) {
              tradePips = calculatedPips
              recalculatedCount++
              console.log(`[PerformanceService] Recalculated pips for trade ${t.positionId}: ${tradePips} pips (from ${t.openPrice} to ${t.closePrice}, profit: ${t.profit})`)
            } else {
              console.warn(`[PerformanceService] Calculated pips is invalid for trade ${t.positionId}, keeping original: ${t.pips}`)
            }
          } catch (calcError) {
            console.warn(`[PerformanceService] Failed to recalculate pips for trade ${t.positionId}:`, calcError)
            // Keep original pips if recalculation fails
            if (tradePips === undefined || tradePips === null || isNaN(tradePips)) {
              tradePips = 0
            }
          }
        } else {
          // If we can't recalculate due to missing data, log warning
          if (tradePips === undefined || tradePips === null || isNaN(tradePips)) {
            console.warn(`[PerformanceService] Cannot recalculate pips for trade ${t.positionId}: missing openPrice, closePrice, symbol, or type`)
            tradePips = 0
          }
        }
      }
      
      // Add to total (including 0 pips for breakeven trades)
      if (tradePips !== undefined && tradePips !== null && !isNaN(tradePips)) {
        totalPips += tradePips
        pipsCount++
      }
    })
    
    // Log summary
    if (masterAccountTrades.length > 0) {
      console.log(`[PerformanceService] Pips calculation summary:`, {
        totalTrades: masterAccountTrades.length,
        tradesWithValidPips: pipsCount,
        tradesRecalculated: recalculatedCount,
        totalPips
      })
      
      if (pipsCount === 0) {
        console.warn(`[PerformanceService] Warning: Found ${masterAccountTrades.length} trades but 0 have valid pips data`)
        console.warn(`[PerformanceService] Sample trade data:`, masterAccountTrades.slice(0, 3).map(t => ({
          positionId: t.positionId,
          symbol: t.symbol,
          storedPips: t.pips,
          profit: t.profit,
          openPrice: t.openPrice,
          closePrice: t.closePrice,
          type: t.type
        })))
      }
    }
    
    const totalTrades = masterAccountTrades.length
    const winningTrades = masterAccountTrades.filter((t: MT5TradeHistory) => (t.profit || 0) > 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    
    console.log(`[PerformanceService] Performance calculated:`, {
      totalTrades,
      totalProfit,
      totalPips,
      pipsCount,
      tradesWithPips: pipsCount,
      tradesWithoutPips: masterAccountTrades.length - pipsCount
    })

    const performance: DailyPerformance = {
      date: dateStr,
      totalAccounts: 1, // Master account only
      activeAccounts: totalTrades > 0 ? 1 : 0,
      totalProfit,
      totalPips,
      totalTrades,
      winRate,
      averageProfit: totalProfit,
      followers: totalTrades > 0 ? [{
        accountId: masterAccountId,
        userId: 'master',
        profit: totalProfit,
        trades: totalTrades
      }] : []
    }

    // Save to Firestore (always save, even if pips is 0, to update cache)
    console.log(`[PerformanceService] Saving performance to cache: ${dateStr} - ${totalTrades} trades, ${totalPips} pips, ${totalProfit} profit`)
    await setDoc(doc(db, `${PERFORMANCE_COLLECTION}/daily/${dateStr}-${masterAccountId}-${strategyId || 'all'}`), {
      ...performance,
      masterAccountId,
      strategyId: strategyId || null,
      calculatedAt: Timestamp.now()
    })
    console.log(`[PerformanceService] Performance saved to cache successfully`)

    return performance
  } catch (error) {
    console.error('[PerformanceService] Error calculating daily performance:', error)
    throw error
  }
}

/**
 * Get daily performance from cache or calculate
 */
export async function getDailyPerformance(
  date: Date,
  masterAccountId: string,
  strategyId?: string
): Promise<DailyPerformance | null> {
  try {
    const dateStr = date.toISOString().split('T')[0]
    const cacheKey = `${dateStr}-${masterAccountId}-${strategyId || 'all'}`
    const docRef = doc(db, `${PERFORMANCE_COLLECTION}/daily/${cacheKey}`)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as DailyPerformance
      // Only return cached data if it has trades AND valid pips, otherwise recalculate
      // Check for both exactly 0 and null/undefined pips
      const hasValidPips = data.totalPips !== 0 && data.totalPips !== null && data.totalPips !== undefined && !isNaN(data.totalPips)
      
      if (data.totalTrades > 0 && hasValidPips) {
        console.log(`[PerformanceService] Using cached data for ${dateStr}: ${data.totalTrades} trades, ${data.totalPips} pips`)
        return data
      } else if (data.totalTrades > 0 && !hasValidPips) {
        // Cached data has trades but invalid/0 pips - recalculate to fix pips
        console.log(`[PerformanceService] Cached data for ${dateStr} has ${data.totalTrades} trades but invalid pips (${data.totalPips}), recalculating...`)
      } else {
        // Cached data has 0 trades - recalculate to check for new trades
        console.log(`[PerformanceService] Cached data for ${dateStr} has 0 trades, recalculating...`)
      }
    }

    // Calculate if not cached or if cached data has 0 trades
    return await calculateDailyPerformance(date, masterAccountId, strategyId)
  } catch (error) {
    console.error('[PerformanceService] Error getting daily performance:', error)
    return null
  }
}

/**
 * Calculate weekly performance
 * NOTE: This function requires masterAccountId but signature is kept for backward compatibility.
 * It's not used by the calendar feature. If needed, update to accept masterAccountId parameter.
 */
export async function calculateWeeklyPerformance(
  weekStart: Date,
  strategyId?: string
): Promise<WeeklyPerformance> {
  // This function is deprecated - it requires masterAccountId which is not in the signature
  // Use getCalendarData() instead for calendar features
  throw new Error('calculateWeeklyPerformance requires masterAccountId. Use getCalendarData() instead.')
}

/**
 * Calculate monthly performance
 * NOTE: This function requires masterAccountId but signature is kept for backward compatibility.
 * It's not used by the calendar feature. If needed, update to accept masterAccountId parameter.
 */
export async function calculateMonthlyPerformance(
  month: number,
  year: number,
  strategyId?: string
): Promise<MonthlyPerformance> {
  // This function is deprecated - it requires masterAccountId which is not in the signature
  // Use getCalendarData() instead for calendar features
  throw new Error('calculateMonthlyPerformance requires masterAccountId. Use getCalendarData() instead.')
}

/**
 * Get monthly performance from cache
 */
export async function getMonthlyPerformance(
  month: number,
  year: number,
  strategyId?: string
): Promise<MonthlyPerformance | null> {
  try {
    const monthId = `${year}-${String(month + 1).padStart(2, '0')}`
    const docRef = doc(db, `${PERFORMANCE_COLLECTION}/monthly/${monthId}`)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data() as MonthlyPerformance
    }

    return null
  } catch (error) {
    console.error('[PerformanceService] Error getting monthly performance:', error)
    return null
  }
}

/**
 * Get calendar data for a month
 * Optimized to use cached data and only calculate missing days
 */
export async function getCalendarData(
  month: number,
  year: number,
  masterAccountId: string,
  strategyId?: string
): Promise<DailyPerformance[]> {
  try {
    console.log(`[PerformanceService] getCalendarData called: month=${month}, year=${year}, masterAccountId=${masterAccountId}, strategyId=${strategyId}`)
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    const days: DailyPerformance[] = []

    console.log(`[PerformanceService] Month range: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`)

    // Try to get cached data first for all days
    const cachedDays: DailyPerformance[] = []
    const daysToCalculate: Date[] = []

    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const cacheKey = `${dateStr}-${masterAccountId}-${strategyId || 'all'}`
      
      // Check cache first
      try {
        const docRef = doc(db, `${PERFORMANCE_COLLECTION}/daily/${cacheKey}`)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data() as DailyPerformance
          // Only use cached data if it has trades AND valid pips, otherwise recalculate
          // Check for both exactly 0 and null/undefined pips
          const hasValidPips = data.totalPips !== 0 && data.totalPips !== null && data.totalPips !== undefined && !isNaN(data.totalPips)
          
          if (data.totalTrades > 0 && hasValidPips) {
            console.log(`[PerformanceService] Using cached data for ${dateStr}: ${data.totalTrades} trades, ${data.totalPips} pips`)
            cachedDays.push(data)
            continue
          } else if (data.totalTrades > 0 && !hasValidPips) {
            // Cached data has trades but invalid/0 pips - recalculate to fix pips
            console.log(`[PerformanceService] Cached data for ${dateStr} has ${data.totalTrades} trades but invalid pips (${data.totalPips}), recalculating...`)
            daysToCalculate.push(date)
            continue
          } else {
            // Cached data has 0 trades - might be stale, recalculate
            console.log(`[PerformanceService] Cached data for ${dateStr} has 0 trades, recalculating...`)
          }
        }
      } catch (cacheError) {
        // If cache check fails, calculate it
      }
      
      // Calculate for recent days (last 30 days) to ensure fresh data
      const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff <= 30) {
        daysToCalculate.push(date)
      } else {
        // For older days, return empty data if not cached
        days.push({
          date: dateStr,
          totalAccounts: 0,
          activeAccounts: 0,
          totalProfit: 0,
          totalPips: 0,
          totalTrades: 0,
          winRate: 0,
          averageProfit: 0,
          followers: []
        })
      }
    }

    // Add cached days
    days.push(...cachedDays)
    console.log(`[PerformanceService] Found ${cachedDays.length} cached days, ${daysToCalculate.length} days to calculate`)

    // Calculate only missing recent days (limit to avoid timeout)
    const daysToCalc = daysToCalculate.slice(0, 30) // Calculate up to 30 days for current month
    console.log(`[PerformanceService] Calculating ${daysToCalc.length} days`)
    for (const date of daysToCalc) {
      try {
        const performance = await getDailyPerformance(date, masterAccountId, strategyId)
        if (performance) {
          days.push(performance)
        } else {
          // Add empty day if calculation returns null
          const dateStr = date.toISOString().split('T')[0]
          days.push({
            date: dateStr,
            totalAccounts: 0,
            activeAccounts: 0,
            totalProfit: 0,
            totalPips: 0,
            totalTrades: 0,
            winRate: 0,
            averageProfit: 0,
            followers: []
          })
        }
      } catch (error) {
        console.warn(`[PerformanceService] Failed to calculate performance for ${date.toISOString().split('T')[0]}:`, error)
        // Add empty day on error
        const dateStr = date.toISOString().split('T')[0]
        days.push({
          date: dateStr,
          totalAccounts: 0,
          activeAccounts: 0,
          totalProfit: 0,
          totalPips: 0,
          totalTrades: 0,
          winRate: 0,
          averageProfit: 0,
          followers: []
        })
      }
    }

    // Sort by date
    days.sort((a, b) => a.date.localeCompare(b.date))

    return days
  } catch (error) {
    console.error('[PerformanceService] Error getting calendar data:', error)
    return []
  }
}

/**
 * Helper: Get week ID in YYYY-W## format
 */
function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

