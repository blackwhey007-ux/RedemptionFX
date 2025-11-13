/**
 * Copy Trading Data Service
 * Service to save and retrieve performance data for marketing
 */

import { db } from '@/lib/firebaseConfig'
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore'
import { DailyPerformance, WeeklyPerformance, MonthlyPerformance } from './copyTradingPerformanceService'

const REPORTS_COLLECTION = 'copyTrading/reports'

export interface MarketingReport {
  id: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  period: string
  startDate: string
  endDate: string
  totalProfit: number
  totalTrades: number
  winRate: number
  activeAccounts: number
  totalAccounts: number
  growthRate?: number
  highlights: string[]
  generatedAt: Date | string
  generatedBy: string
}

/**
 * Save daily performance snapshot
 */
export async function saveDailySnapshot(performance: DailyPerformance): Promise<void> {
  try {
    await setDoc(doc(db, `copyTrading/performance/daily/${performance.date}`), {
      ...performance,
      savedAt: Timestamp.now()
    })
    console.log(`[DataService] Saved daily snapshot for ${performance.date}`)
  } catch (error) {
    console.error('[DataService] Error saving daily snapshot:', error)
    throw error
  }
}

/**
 * Save weekly performance report
 */
export async function saveWeeklyReport(performance: WeeklyPerformance): Promise<void> {
  try {
    await setDoc(doc(db, `copyTrading/performance/weekly/${performance.weekId}`), {
      ...performance,
      savedAt: Timestamp.now()
    })
    console.log(`[DataService] Saved weekly report for ${performance.weekId}`)
  } catch (error) {
    console.error('[DataService] Error saving weekly report:', error)
    throw error
  }
}

/**
 * Save monthly performance report
 */
export async function saveMonthlyReport(performance: MonthlyPerformance): Promise<void> {
  try {
    await setDoc(doc(db, `copyTrading/performance/monthly/${performance.monthId}`), {
      ...performance,
      savedAt: Timestamp.now()
    })
    console.log(`[DataService] Saved monthly report for ${performance.monthId}`)
  } catch (error) {
    console.error('[DataService] Error saving monthly report:', error)
    throw error
  }
}

/**
 * Generate and save marketing report
 */
export async function generateMarketingReport(
  type: 'daily' | 'weekly' | 'monthly' | 'custom',
  period: string,
  startDate: Date,
  endDate: Date,
  generatedBy: string,
  data: DailyPerformance | WeeklyPerformance | MonthlyPerformance
): Promise<MarketingReport> {
  try {
    let totalProfit = 0
    let totalTrades = 0
    let winRate = 0
    let activeAccounts = 0
    let totalAccounts = 0
    let highlights: string[] = []

    if (type === 'daily') {
      const daily = data as DailyPerformance
      totalProfit = daily.totalProfit
      totalTrades = daily.totalTrades
      winRate = daily.winRate
      activeAccounts = daily.activeAccounts
      totalAccounts = daily.totalAccounts
      highlights = [
        `Total profit: $${totalProfit.toFixed(2)}`,
        `${totalTrades} trades executed`,
        `Win rate: ${winRate.toFixed(1)}%`,
        `${activeAccounts} active accounts`
      ]
    } else if (type === 'weekly') {
      const weekly = data as WeeklyPerformance
      totalProfit = weekly.totalProfit
      totalTrades = weekly.totalTrades
      winRate = weekly.winRate
      highlights = [
        `Weekly profit: $${totalProfit.toFixed(2)}`,
        `${totalTrades} trades executed`,
        `Win rate: ${winRate.toFixed(1)}%`,
        `Best day: ${weekly.bestDay}`,
        `Worst day: ${weekly.worstDay}`
      ]
    } else if (type === 'monthly') {
      const monthly = data as MonthlyPerformance
      totalProfit = monthly.totalProfit
      totalTrades = monthly.totalTrades
      winRate = monthly.winRate
      highlights = [
        `Monthly profit: $${totalProfit.toFixed(2)}`,
        `${totalTrades} trades executed`,
        `Win rate: ${winRate.toFixed(1)}%`,
        `Average daily profit: $${monthly.averageDailyProfit.toFixed(2)}`,
        `Growth rate: ${monthly.growthRate.toFixed(1)}%`
      ]
    }

    const report: MarketingReport = {
      id: `${type}-${period}-${Date.now()}`,
      type,
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalProfit,
      totalTrades,
      winRate,
      activeAccounts,
      totalAccounts,
      highlights,
      generatedAt: new Date(),
      generatedBy
    }

    await setDoc(doc(db, `${REPORTS_COLLECTION}/${report.id}`), {
      ...report,
      generatedAt: Timestamp.now()
    })

    console.log(`[DataService] Generated marketing report: ${report.id}`)
    return report
  } catch (error) {
    console.error('[DataService] Error generating marketing report:', error)
    throw error
  }
}

/**
 * Get marketing reports
 */
export async function getMarketingReports(
  type?: 'daily' | 'weekly' | 'monthly' | 'custom',
  limitCount: number = 50
): Promise<MarketingReport[]> {
  try {
    const constraints: any[] = []
    
    if (type) {
      constraints.push(where('type', '==', type))
    }
    
    constraints.push(orderBy('generatedAt', 'desc'))
    constraints.push(limit(limitCount))

    const q = query(collection(db, REPORTS_COLLECTION), ...constraints)
    const snapshot = await getDocs(q)
    
    const reports: MarketingReport[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      reports.push({
        id: doc.id,
        type: data.type,
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate,
        totalProfit: data.totalProfit,
        totalTrades: data.totalTrades,
        winRate: data.winRate,
        activeAccounts: data.activeAccounts,
        totalAccounts: data.totalAccounts,
        growthRate: data.growthRate,
        highlights: data.highlights || [],
        generatedAt: data.generatedAt?.toDate?.() || data.generatedAt,
        generatedBy: data.generatedBy
      })
    })

    return reports
  } catch (error) {
    console.error('[DataService] Error getting marketing reports:', error)
    return []
  }
}




