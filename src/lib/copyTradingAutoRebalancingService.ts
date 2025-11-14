/**
 * Auto-Rebalancing Service
 * Automatically adjusts risk multipliers based on account performance
 */

import { db } from './firebaseConfig'
import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { listUserCopyTradingAccounts, updateUserCopyTradingAccountStatus } from './copyTradingRepo'
import { subscribeToStrategy } from './copyfactoryClient'
import { getMasterStrategy } from './copyTradingRepo'
import { decrypt } from './crypto'
import type { UserCopyTradingAccount } from './copyTradingRepo'

interface AccountStats {
  balance: number
  equity: number
  profitLoss?: number
  marginLevel?: number
  accountAge?: number
}

interface RebalancingRules {
  minMultiplier: number
  maxMultiplier: number
  adjustmentStep: number
}

interface RebalancingHistoryEntry {
  date: Date
  oldMultiplier: number
  newMultiplier: number
  reason: string
}

/**
 * Check if automation features are enabled
 */
function isAutomationEnabled(): boolean {
  return process.env.ENABLE_AUTOMATION_FEATURES === 'true'
}

/**
 * Calculate optimal risk multiplier based on account performance
 */
export function calculateOptimalRiskMultiplier(
  accountStats: AccountStats,
  originalMultiplier: number,
  rules: RebalancingRules
): number {
  if (!isAutomationEnabled()) {
    return originalMultiplier
  }

  const { balance, equity, profitLoss, marginLevel, accountAge } = accountStats
  const { minMultiplier, maxMultiplier, adjustmentStep } = rules

  // Calculate performance metrics
  const equityRatio = balance > 0 ? equity / balance : 1
  const drawdown = balance > 0 ? (balance - equity) / balance : 0
  const profitRatio = profitLoss !== undefined && balance > 0 ? profitLoss / balance : 0

  // Base adjustment factor (1.0 = no change)
  let adjustmentFactor = 1.0

  // Performance-based adjustments
  if (equityRatio < 0.9) {
    // Account is down, reduce risk
    adjustmentFactor = 0.9 - (0.9 - equityRatio) * 0.5
  } else if (equityRatio > 1.1) {
    // Account is up, can increase risk slightly
    adjustmentFactor = 1.0 + (equityRatio - 1.1) * 0.3
  }

  // Drawdown-based adjustments
  if (drawdown > 0.15) {
    // High drawdown, reduce risk significantly
    adjustmentFactor *= 0.8
  } else if (drawdown < 0.05 && equityRatio > 1.0) {
    // Low drawdown and profitable, can increase risk slightly
    adjustmentFactor *= 1.1
  }

  // Margin level adjustments
  if (marginLevel !== undefined) {
    if (marginLevel < 200) {
      // Low margin, reduce risk
      adjustmentFactor *= 0.85
    } else if (marginLevel > 500 && equityRatio > 1.0) {
      // High margin and profitable, can increase risk
      adjustmentFactor *= 1.05
    }
  }

  // Account age factor (newer accounts are more conservative)
  if (accountAge !== undefined && accountAge < 7) {
    adjustmentFactor *= 0.95
  }

  // Calculate new multiplier
  let newMultiplier = originalMultiplier * adjustmentFactor

  // Apply adjustment step (round to nearest step)
  newMultiplier = Math.round(newMultiplier / adjustmentStep) * adjustmentStep

  // Clamp to min/max bounds
  newMultiplier = Math.max(minMultiplier, Math.min(maxMultiplier, newMultiplier))

  // Only adjust if change is significant (at least 5% or 0.1 multiplier)
  const minChange = Math.max(0.1, originalMultiplier * 0.05)
  if (Math.abs(newMultiplier - originalMultiplier) < minChange) {
    return originalMultiplier
  }

  return newMultiplier
}

/**
 * Determine if rebalancing is needed
 */
export function shouldRebalance(
  account: UserCopyTradingAccount,
  currentStats: AccountStats
): { shouldRebalance: boolean; reason?: string } {
  if (!isAutomationEnabled()) {
    return { shouldRebalance: false }
  }

  if (!account.autoRebalancingEnabled) {
    return { shouldRebalance: false }
  }

  if (!account.originalRiskMultiplier || !account.rebalancingRules) {
    return { shouldRebalance: false, reason: 'Rebalancing not configured' }
  }

  // Check if enough time has passed since last rebalancing (minimum 6 hours)
  const lastRebalanced = account.lastRebalancedAt
  if (lastRebalanced) {
    const hoursSinceRebalance = (Date.now() - lastRebalanced.getTime()) / (1000 * 60 * 60)
    if (hoursSinceRebalance < 6) {
      return { shouldRebalance: false, reason: 'Too soon since last rebalancing' }
    }
  }

  // Calculate optimal multiplier
  const optimalMultiplier = calculateOptimalRiskMultiplier(
    currentStats,
    account.originalRiskMultiplier,
    account.rebalancingRules
  )

  // Check if adjustment is needed
  const currentMultiplier = account.riskMultiplier
  const minChange = Math.max(0.1, account.originalRiskMultiplier * 0.05)

  if (Math.abs(optimalMultiplier - currentMultiplier) >= minChange) {
    const equityRatio = currentStats.balance > 0 ? currentStats.equity / currentStats.balance : 1
    const drawdown = currentStats.balance > 0 
      ? (currentStats.balance - currentStats.equity) / currentStats.balance 
      : 0

    let reason = `Performance adjustment: equity ratio ${(equityRatio * 100).toFixed(1)}%, drawdown ${(drawdown * 100).toFixed(1)}%`
    
    if (optimalMultiplier < currentMultiplier) {
      reason += ' - Reducing risk due to drawdown'
    } else {
      reason += ' - Increasing risk due to good performance'
    }

    return { shouldRebalance: true, reason }
  }

  return { shouldRebalance: false }
}

/**
 * Update risk multiplier for an account
 */
export async function updateRiskMultiplier(
  userId: string,
  accountId: string,
  newMultiplier: number,
  reason: string
): Promise<void> {
  if (!isAutomationEnabled()) {
    throw new Error('Automation features are disabled')
  }

  try {
    // Get account details
    const accounts = await listUserCopyTradingAccounts(userId)
    const account = accounts.find((acc) => acc.accountId === accountId)
    if (!account) {
      throw new Error('Account not found')
    }

    const oldMultiplier = account.riskMultiplier

    // Get master strategy for token
    const masterStrategy = await getMasterStrategy(account.strategyId)
    if (!masterStrategy) {
      throw new Error('Master strategy not found')
    }

    // Decrypt token if needed
    let token: string | undefined
    if (masterStrategy.tokenEnc) {
      token = await decrypt(masterStrategy.tokenEnc)
    }

    // Update subscription in CopyFactory
    await subscribeToStrategy(
      {
        subscriberAccountId: accountId,
        providerAccountId: masterStrategy.accountId,
        strategyId: account.strategyId,
        riskMultiplier: newMultiplier,
        reverseTrading: account.reverseTrading || false,
        symbolMapping: account.symbolMapping,
        maxTradeRisk: account.maxRiskPercent
      },
      { token }
    )

    // Update Firestore
    const existingHistory = account.rebalancingHistory || []
    const updatedHistory: RebalancingHistoryEntry[] = [
      ...existingHistory.map((entry) => ({
        ...entry,
        date: entry.date instanceof Date ? entry.date : new Date(entry.date)
      })),
      {
        date: new Date(),
        oldMultiplier,
        newMultiplier,
        reason
      }
    ]

    // Keep only last 50 entries
    const trimmedHistory = updatedHistory.slice(-50)

    await updateUserCopyTradingAccountStatus(
      userId,
      accountId,
      account.status,
      account.lastError,
      {
        riskMultiplier: newMultiplier,
        lastRebalancedAt: new Date(),
        rebalancingHistory: trimmedHistory
      }
    )

    // Log to automation logs
    await addDoc(collection(db, 'copyTradingAutomationLogs'), {
      userId,
      accountId,
      actionType: 'rebalance',
      details: {
        oldMultiplier,
        newMultiplier,
        reason
      },
      timestamp: Timestamp.now()
    })

    console.log(
      `[AutoRebalancing] Updated risk multiplier for account ${accountId}: ${oldMultiplier} -> ${newMultiplier} (${reason})`
    )
  } catch (error) {
    console.error('[AutoRebalancing] Error updating risk multiplier:', error)
    throw error
  }
}

/**
 * Get rebalancing history for an account
 */
export async function getRebalancingHistory(
  userId: string,
  accountId: string,
  limitCount: number = 20
): Promise<RebalancingHistoryEntry[]> {
  try {
    const accounts = await listUserCopyTradingAccounts(userId)
    const account = accounts.find((acc) => acc.accountId === accountId)
    if (!account || !account.rebalancingHistory) {
      return []
    }

    // Return most recent entries
    return account.rebalancingHistory
      .slice(-limitCount)
      .map((entry) => ({
        ...entry,
        date: entry.date instanceof Date ? entry.date : new Date(entry.date)
      }))
  } catch (error) {
    console.error('[AutoRebalancing] Error getting rebalancing history:', error)
    return []
  }
}

