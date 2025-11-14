/**
 * Risk Management Service
 * Auto-pause and auto-resume copying based on drawdown thresholds
 */

import { db } from './firebaseConfig'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { listUserCopyTradingAccounts, updateUserCopyTradingAccountStatus } from './copyTradingRepo'
import { subscribeToStrategy, unsubscribeFromStrategy } from './copyfactoryClient'
import { getMasterStrategy } from './copyTradingRepo'
import { decrypt } from './crypto'
import type { UserCopyTradingAccount } from './copyTradingRepo'

interface AccountStats {
  balance: number
  equity: number
  profitLoss?: number
}

interface RiskStatus {
  isPaused: boolean
  currentDrawdown: number
  maxDrawdown: number
  pauseReason?: string
  canResume: boolean
}

/**
 * Check if automation features are enabled
 */
function isAutomationEnabled(): boolean {
  return process.env.ENABLE_AUTOMATION_FEATURES === 'true'
}

/**
 * Calculate current drawdown percentage
 */
export function checkDrawdownThreshold(
  accountStats: AccountStats,
  threshold?: number
): { drawdown: number; exceedsThreshold: boolean } {
  const { balance, equity } = accountStats

  if (balance <= 0) {
    return { drawdown: 0, exceedsThreshold: false }
  }

  const drawdown = ((balance - equity) / balance) * 100

  if (threshold === undefined) {
    return { drawdown, exceedsThreshold: false }
  }

  return {
    drawdown,
    exceedsThreshold: drawdown >= threshold
  }
}

/**
 * Determine if copying should be paused
 */
export function shouldPauseCopying(
  account: UserCopyTradingAccount,
  currentStats: AccountStats
): { shouldPause: boolean; reason?: string } {
  if (!isAutomationEnabled()) {
    return { shouldPause: false }
  }

  if (!account.autoPauseEnabled) {
    return { shouldPause: false }
  }

  if (account.status !== 'active') {
    return { shouldPause: false, reason: 'Account is not active' }
  }

  if (account.autoPausedAt) {
    // Already paused
    return { shouldPause: false, reason: 'Already paused' }
  }

  const maxDrawdown = account.maxDrawdownPercent || 20
  const { drawdown, exceedsThreshold } = checkDrawdownThreshold(currentStats, maxDrawdown)

  if (exceedsThreshold) {
    return {
      shouldPause: true,
      reason: `Drawdown ${drawdown.toFixed(2)}% exceeds threshold of ${maxDrawdown}%`
    }
  }

  return { shouldPause: false }
}

/**
 * Pause copying for an account
 */
export async function pauseCopying(
  userId: string,
  accountId: string,
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

    // Unsubscribe from strategy (pause copying)
    await unsubscribeFromStrategy(accountId, account.strategyId, { token })

    // Update Firestore
    await updateUserCopyTradingAccountStatus(
      userId,
      accountId,
      'inactive',
      account.lastError,
      {
        autoPausedAt: new Date(),
        autoPauseReason: reason
      }
    )

    // Log to automation logs
    await addDoc(collection(db, 'copyTradingAutomationLogs'), {
      userId,
      accountId,
      actionType: 'auto-pause',
      details: {
        reason,
        drawdown: account.maxDrawdownPercent
      },
      timestamp: Timestamp.now()
    })

    console.log(`[RiskManagement] Paused copying for account ${accountId}: ${reason}`)
  } catch (error) {
    console.error('[RiskManagement] Error pausing copying:', error)
    throw error
  }
}

/**
 * Determine if copying should be resumed
 */
export function shouldResumeCopying(
  account: UserCopyTradingAccount,
  currentStats: AccountStats
): { shouldResume: boolean; reason?: string } {
  if (!isAutomationEnabled()) {
    return { shouldResume: false }
  }

  if (!account.autoResumeEnabled) {
    return { shouldResume: false }
  }

  if (!account.autoPausedAt) {
    // Not paused
    return { shouldResume: false, reason: 'Account is not paused' }
  }

  if (account.status === 'active') {
    // Already active
    return { shouldResume: false, reason: 'Account is already active' }
  }

  const resumeDrawdown = account.resumeDrawdownPercent || 15
  const { drawdown, exceedsThreshold } = checkDrawdownThreshold(currentStats, resumeDrawdown)

  if (!exceedsThreshold) {
    return {
      shouldResume: true,
      reason: `Drawdown ${drawdown.toFixed(2)}% is below resume threshold of ${resumeDrawdown}%`
    }
  }

  return { shouldResume: false }
}

/**
 * Resume copying for an account
 */
export async function resumeCopying(userId: string, accountId: string): Promise<void> {
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

    // Re-subscribe to strategy (resume copying)
    await subscribeToStrategy(
      {
        subscriberAccountId: accountId,
        providerAccountId: masterStrategy.accountId,
        strategyId: account.strategyId,
        riskMultiplier: account.riskMultiplier,
        reverseTrading: account.reverseTrading || false,
        symbolMapping: account.symbolMapping,
        maxTradeRisk: account.maxRiskPercent
      },
      { token }
    )

    // Update Firestore
    await updateUserCopyTradingAccountStatus(
      userId,
      accountId,
      'active',
      account.lastError,
      {
        autoPausedAt: undefined,
        autoPauseReason: undefined
      }
    )

    // Log to automation logs
    await addDoc(collection(db, 'copyTradingAutomationLogs'), {
      userId,
      accountId,
      actionType: 'auto-resume',
      details: {
        reason: 'Drawdown improved below threshold'
      },
      timestamp: Timestamp.now()
    })

    console.log(`[RiskManagement] Resumed copying for account ${accountId}`)
  } catch (error) {
    console.error('[RiskManagement] Error resuming copying:', error)
    throw error
  }
}

/**
 * Get current risk status for an account
 */
export async function getRiskStatus(
  userId: string,
  accountId: string,
  currentStats: AccountStats
): Promise<RiskStatus> {
  try {
    const accounts = await listUserCopyTradingAccounts(userId)
    const account = accounts.find((acc) => acc.accountId === accountId)
    if (!account) {
      throw new Error('Account not found')
    }

    const { drawdown } = checkDrawdownThreshold(currentStats)
    const maxDrawdown = account.maxDrawdownPercent || 20
    const resumeDrawdown = account.resumeDrawdownPercent || 15

    const isPaused = !!account.autoPausedAt
    const canResume = isPaused && !checkDrawdownThreshold(currentStats, resumeDrawdown).exceedsThreshold

    return {
      isPaused,
      currentDrawdown: drawdown,
      maxDrawdown,
      pauseReason: account.autoPauseReason,
      canResume
    }
  } catch (error) {
    console.error('[RiskManagement] Error getting risk status:', error)
    throw error
  }
}




