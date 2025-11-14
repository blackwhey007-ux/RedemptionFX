/**
 * Auto-Disconnect Service
 * Automatically disconnects accounts with persistent errors
 */

import { db } from './firebaseConfig'
import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { listUserCopyTradingAccounts, updateUserCopyTradingAccountStatus, deleteUserCopyTradingAccount } from './copyTradingRepo'
import { deleteSubscriberAccount } from './copyfactoryClient'
import { UserNotificationService } from './userNotificationService'
import type { UserCopyTradingAccount } from './copyTradingRepo'

interface ErrorHistoryEntry {
  error: string
  timestamp: Date
  resolved?: boolean
}

/**
 * Check if automation features are enabled
 */
function isAutomationEnabled(): boolean {
  return process.env.ENABLE_AUTOMATION_FEATURES === 'true'
}

/**
 * Track an error for an account
 */
export async function trackError(
  userId: string,
  accountId: string,
  error: string
): Promise<void> {
  if (!isAutomationEnabled()) {
    return
  }

  try {
    // Get account details
    const accounts = await listUserCopyTradingAccounts(userId)
    const account = accounts.find((acc) => acc.accountId === accountId)
    if (!account) {
      return
    }

    if (!account.autoDisconnectEnabled) {
      return
    }

    const now = new Date()
    const errorWindowMinutes = account.errorWindowMinutes || 60
    const maxConsecutiveErrors = account.maxConsecutiveErrors || 5

    // Get existing error count and last error time
    let consecutiveErrorCount = account.consecutiveErrorCount || 0
    const lastErrorAt = account.lastErrorAt

    // Check if error is within the time window
    if (lastErrorAt) {
      const minutesSinceLastError = (now.getTime() - lastErrorAt.getTime()) / (1000 * 60)
      if (minutesSinceLastError > errorWindowMinutes) {
        // Reset count if outside time window
        consecutiveErrorCount = 0
      }
    }

    // Increment error count
    consecutiveErrorCount++

    // Log error to Firestore
    await addDoc(collection(db, 'copyTradingErrorHistory'), {
      userId,
      accountId,
      error,
      timestamp: Timestamp.now(),
      resolved: false
    })

    // Update account with new error count
    await updateUserCopyTradingAccountStatus(
      userId,
      accountId,
      account.status,
      error,
      {
        consecutiveErrorCount,
        lastErrorAt: now
      }
    )

    console.log(
      `[AutoDisconnect] Tracked error for account ${accountId}: ${consecutiveErrorCount}/${maxConsecutiveErrors} errors`
    )

    // Check if should disconnect
    if (consecutiveErrorCount >= maxConsecutiveErrors) {
      await disconnectAccount(
        userId,
        accountId,
        `Exceeded error threshold: ${consecutiveErrorCount} consecutive errors within ${errorWindowMinutes} minutes`
      )
    }
  } catch (error) {
    console.error('[AutoDisconnect] Error tracking error:', error)
    // Don't throw - error tracking is non-critical
  }
}

/**
 * Check if account should be disconnected
 */
export function shouldDisconnect(account: UserCopyTradingAccount): boolean {
  if (!isAutomationEnabled()) {
    return false
  }

  if (!account.autoDisconnectEnabled) {
    return false
  }

  const maxConsecutiveErrors = account.maxConsecutiveErrors || 5
  const consecutiveErrorCount = account.consecutiveErrorCount || 0

  return consecutiveErrorCount >= maxConsecutiveErrors
}

/**
 * Disconnect an account due to persistent errors
 */
export async function disconnectAccount(
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

    // Check if already disconnected
    if (account.autoDisconnectedAt) {
      console.log(`[AutoDisconnect] Account ${accountId} already disconnected`)
      return
    }

    // Unsubscribe from CopyFactory and delete account
    try {
      await deleteSubscriberAccount(accountId)
    } catch (error) {
      console.error(`[AutoDisconnect] Error deleting subscriber account ${accountId}:`, error)
      // Continue with Firestore update even if CopyFactory deletion fails
    }

    // Update Firestore
    await updateUserCopyTradingAccountStatus(
      userId,
      accountId,
      'error',
      reason,
      {
        autoDisconnectedAt: new Date(),
        autoDisconnectReason: reason
      }
    )

    // Mark errors as resolved
    const errorHistoryQuery = query(
      collection(db, 'copyTradingErrorHistory'),
      where('userId', '==', userId),
      where('accountId', '==', accountId),
      where('resolved', '==', false),
      orderBy('timestamp', 'desc')
    )
    const errorHistorySnapshot = await getDocs(errorHistoryQuery)
    
    // Note: Firestore doesn't support batch updates in queries, so we'll mark them in the log
    // The errors will be considered resolved by the disconnect action

    // Log to automation logs
    await addDoc(collection(db, 'copyTradingAutomationLogs'), {
      userId,
      accountId,
      actionType: 'auto-disconnect',
      details: {
        reason,
        consecutiveErrors: account.consecutiveErrorCount || 0
      },
      timestamp: Timestamp.now()
    })

    // Send notification to user
    await UserNotificationService.createNotification({
      userId,
      type: 'system',
      title: 'Account Auto-Disconnected',
      message: `Your copy trading account has been automatically disconnected due to persistent errors: ${reason}. Please check your account settings and reconnect if needed.`,
      data: {
        actionUrl: '/dashboard/copy-trading'
      }
    })

    console.log(`[AutoDisconnect] Disconnected account ${accountId}: ${reason}`)
  } catch (error) {
    console.error('[AutoDisconnect] Error disconnecting account:', error)
    throw error
  }
}

/**
 * Reset error count when account recovers
 */
export async function resetErrorCount(userId: string, accountId: string): Promise<void> {
  if (!isAutomationEnabled()) {
    return
  }

  try {
    // Get account details
    const accounts = await listUserCopyTradingAccounts(userId)
    const account = accounts.find((acc) => acc.accountId === accountId)
    if (!account) {
      return
    }

    // Only reset if there were errors
    if ((account.consecutiveErrorCount || 0) === 0) {
      return
    }

    // Update account to reset error count
    await updateUserCopyTradingAccountStatus(
      userId,
      accountId,
      account.status,
      account.lastError,
      {
        consecutiveErrorCount: 0,
        lastErrorAt: undefined
      }
    )

    console.log(`[AutoDisconnect] Reset error count for account ${accountId}`)
  } catch (error) {
    console.error('[AutoDisconnect] Error resetting error count:', error)
    // Don't throw - reset is non-critical
  }
}

/**
 * Get error history for an account
 */
export async function getErrorHistory(
  userId: string,
  accountId: string,
  limitCount: number = 20
): Promise<ErrorHistoryEntry[]> {
  try {
    const errorHistoryQuery = query(
      collection(db, 'copyTradingErrorHistory'),
      where('userId', '==', userId),
      where('accountId', '==', accountId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )

    const snapshot = await getDocs(errorHistoryQuery)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        error: data.error,
        timestamp: data.timestamp?.toDate() || new Date(),
        resolved: data.resolved || false
      }
    })
  } catch (error) {
    console.error('[AutoDisconnect] Error getting error history:', error)
    return []
  }
}




