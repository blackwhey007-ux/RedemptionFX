/**
 * Trade Alerts Service
 * Sends real-time notifications for important trades
 */

import { db } from './firebaseConfig'
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { listUserCopyTradingAccounts } from './copyTradingRepo'
import { UserNotificationService } from './userNotificationService'
import { sendDirectMessage } from './telegramService'
import type { UserCopyTradingAccount } from './copyTradingRepo'

interface Trade {
  id?: string
  accountId: string
  symbol: string
  type: 'BUY' | 'SELL'
  volume: number
  profit?: number
  pips?: number
  openPrice?: number
  closePrice?: number
  openTime?: Date
  closeTime?: Date
}

interface UserAlertPreferences {
  tradeAlertsEnabled?: boolean
  alertTypes?: string[]
  minTradeSizeForAlert?: number
  minProfitForAlert?: number
  minLossForAlert?: number
  dailySummaryTime?: string
}

/**
 * Check if automation features are enabled
 */
function isAutomationEnabled(): boolean {
  return process.env.ENABLE_AUTOMATION_FEATURES === 'true'
}

/**
 * Determine if a trade warrants an alert
 */
export function shouldSendAlert(
  trade: Trade,
  account: UserCopyTradingAccount,
  userPreferences?: UserAlertPreferences
): { shouldSend: boolean; alertType?: string; reason?: string } {
  console.log(`[TradeAlerts] shouldSendAlert called for trade:`, {
    tradeId: trade.id,
    accountId: trade.accountId,
    symbol: trade.symbol,
    type: trade.type,
    volume: trade.volume,
    profit: trade.profit,
    pips: trade.pips,
    hasCloseTime: !!trade.closeTime
  })

  if (!isAutomationEnabled()) {
    console.log(`[TradeAlerts] Automation not enabled (ENABLE_AUTOMATION_FEATURES !== 'true')`)
    return { shouldSend: false }
  }

  // Use account preferences or provided preferences
  const preferences: UserAlertPreferences = {
    tradeAlertsEnabled: account.tradeAlertsEnabled ?? userPreferences?.tradeAlertsEnabled ?? false,
    alertTypes: account.alertTypes ?? userPreferences?.alertTypes ?? [],
    minTradeSizeForAlert: account.minTradeSizeForAlert ?? userPreferences?.minTradeSizeForAlert ?? 0.1,
    minProfitForAlert: account.minProfitForAlert ?? userPreferences?.minProfitForAlert ?? 100,
    minLossForAlert: account.minLossForAlert ?? userPreferences?.minLossForAlert ?? -100
  }

  console.log(`[TradeAlerts] User preferences:`, {
    tradeAlertsEnabled: preferences.tradeAlertsEnabled,
    alertTypes: preferences.alertTypes,
    minTradeSizeForAlert: preferences.minTradeSizeForAlert,
    minProfitForAlert: preferences.minProfitForAlert,
    minLossForAlert: preferences.minLossForAlert
  })

  if (!preferences.tradeAlertsEnabled) {
    console.log(`[TradeAlerts] Trade alerts disabled for this account`)
    return { shouldSend: false }
  }

  const alertTypes = preferences.alertTypes || []

  if (alertTypes.length === 0) {
    console.log(`[TradeAlerts] No alert types configured`)
    return { shouldSend: false }
  }

  // Check for large trade
  if (alertTypes.includes('largeTrade') && trade.volume >= (preferences.minTradeSizeForAlert || 0.1)) {
    console.log(`[TradeAlerts] Large trade condition met: volume=${trade.volume} >= minTradeSize=${preferences.minTradeSizeForAlert}`)
    return {
      shouldSend: true,
      alertType: 'largeTrade',
      reason: `Large trade opened: ${trade.volume} lots on ${trade.symbol}`
    }
  } else if (alertTypes.includes('largeTrade')) {
    console.log(`[TradeAlerts] Large trade condition NOT met: volume=${trade.volume} < minTradeSize=${preferences.minTradeSizeForAlert}`)
  }

  // Check for high profit (only if trade is closed)
  if (trade.profit !== undefined && trade.closeTime) {
    if (alertTypes.includes('highProfit') && trade.profit >= (preferences.minProfitForAlert || 100)) {
      console.log(`[TradeAlerts] High profit condition met: profit=${trade.profit} >= minProfit=${preferences.minProfitForAlert}`)
      return {
        shouldSend: true,
        alertType: 'highProfit',
        reason: `High profit trade: $${trade.profit.toFixed(2)} on ${trade.symbol}`
      }
    } else if (alertTypes.includes('highProfit')) {
      console.log(`[TradeAlerts] High profit condition NOT met: profit=${trade.profit} < minProfit=${preferences.minProfitForAlert}`)
    }

    if (alertTypes.includes('highLoss') && trade.profit <= (preferences.minLossForAlert || -100)) {
      console.log(`[TradeAlerts] High loss condition met: profit=${trade.profit} <= minLoss=${preferences.minLossForAlert}`)
      return {
        shouldSend: true,
        alertType: 'highLoss',
        reason: `High loss trade: $${trade.profit.toFixed(2)} on ${trade.symbol}`
      }
    } else if (alertTypes.includes('highLoss')) {
      console.log(`[TradeAlerts] High loss condition NOT met: profit=${trade.profit} > minLoss=${preferences.minLossForAlert}`)
    }
  } else {
    console.log(`[TradeAlerts] Trade not closed yet (profit=${trade.profit}, closeTime=${trade.closeTime}), skipping profit/loss checks`)
  }

  // Check for milestone trades (100th, 500th, 1000th, etc.)
  if (alertTypes.includes('milestone')) {
    // This would require tracking total trade count per account
    // For now, we'll skip this check
    console.log(`[TradeAlerts] Milestone alert type configured but not yet implemented`)
  }

  console.log(`[TradeAlerts] No alert conditions met for this trade`)
  return { shouldSend: false }
}

/**
 * Format trade alert message for Telegram (Markdown)
 */
function formatTradeAlertForTelegram(
  alertType: string,
  reason: string,
  accountLabel: string,
  trade: Trade
): string {
  const profitEmoji = trade.profit !== undefined && trade.profit > 0 ? '✅' : trade.profit !== undefined && trade.profit < 0 ? '⚠️' : '📊'
  const alertEmoji = alertType === 'highProfit' ? '🎉' : alertType === 'highLoss' ? '⚠️' : '📊'
  
  let message = `${alertEmoji} *Trade Alert: ${alertType}*\n\n`
  message += `Account: ${accountLabel}\n`
  message += `Symbol: *${trade.symbol}*\n`
  message += `Type: ${trade.type}\n`
  message += `Volume: ${trade.volume} lots`

  if (trade.profit !== undefined) {
    const profitSign = trade.profit >= 0 ? '+' : ''
    message += `\n${profitEmoji} Profit: $${profitSign}${trade.profit.toFixed(2)}`
  }

  if (trade.pips !== undefined) {
    const pipsSign = trade.pips >= 0 ? '+' : ''
    message += `\n📈 Pips: ${pipsSign}${trade.pips.toFixed(1)} pips`
  }

  return message
}

/**
 * Get user's Telegram chat ID from Firestore
 */
async function getUserTelegramChatId(userId: string): Promise<number | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) {
      return null
    }

    const userData = userDoc.data()
    const telegramUserId = userData?.profileSettings?.telegramUserId

    if (typeof telegramUserId === 'number') {
      return telegramUserId
    }

    return null
  } catch (error) {
    console.error('[TradeAlerts] Error fetching user Telegram ID:', error)
    return null
  }
}

/**
 * Send trade alert notification
 */
export async function sendTradeAlert(
  userId: string,
  trade: Trade,
  alertType: string,
  reason: string
): Promise<void> {
  console.log(`[TradeAlerts] sendTradeAlert called:`, {
    userId,
    tradeId: trade.id,
    accountId: trade.accountId,
    alertType,
    reason
  })

  if (!isAutomationEnabled()) {
    console.log(`[TradeAlerts] Automation not enabled, skipping alert`)
    return
  }

  try {
    // Get account details for context
    const accounts = await listUserCopyTradingAccounts(userId)
    const account = accounts.find((acc) => acc.accountId === trade.accountId)

    const accountLabel = account?.label || account?.accountId || 'Unknown Account'
    console.log(`[TradeAlerts] Account label: ${accountLabel}`)

    // Format alert message
    let message = `📊 Trade Alert: ${reason}\n`
    message += `Account: ${accountLabel}\n`
    message += `Symbol: ${trade.symbol}\n`
    message += `Type: ${trade.type}\n`
    message += `Volume: ${trade.volume} lots`

    if (trade.profit !== undefined) {
      message += `\nProfit: $${trade.profit.toFixed(2)}`
    }

    if (trade.pips !== undefined) {
      message += `\nPips: ${trade.pips.toFixed(1)}`
    }

    console.log(`[TradeAlerts] Sending in-app notification to user ${userId}`)
    // Send in-app notification (using 'system' type as it's a system-generated alert)
    await UserNotificationService.createNotification({
      userId,
      type: 'system',
      title: `Trade Alert: ${alertType}`,
      message,
      data: {
        tradeId: trade.id,
        accountId: trade.accountId,
        alertType,
        symbol: trade.symbol,
        actionUrl: '/dashboard/copy-trading',
        soundType: trade.profit && trade.profit > 0 ? 'success' : 'warning'
      }
    })
    console.log(`[TradeAlerts] In-app notification sent successfully`)

    // Send Telegram message if user has Telegram linked
    try {
      console.log(`[TradeAlerts] Attempting to retrieve Telegram chat ID for user ${userId}`)
      const telegramChatId = await getUserTelegramChatId(userId)
      console.log(`[TradeAlerts] Telegram chat ID retrieved: ${telegramChatId ? telegramChatId : 'null (not linked)'}`)
      
      if (telegramChatId) {
        const telegramMessage = formatTradeAlertForTelegram(alertType, reason, accountLabel, trade)
        console.log(`[TradeAlerts] Sending Telegram message to chatId ${telegramChatId}`)
        const telegramMessageId = await sendDirectMessage(telegramChatId, telegramMessage)
        
        if (telegramMessageId) {
          console.log(`[TradeAlerts] ✅ Successfully sent Telegram alert to user ${userId} (chatId: ${telegramChatId}, messageId: ${telegramMessageId}) for trade ${trade.id}`)
        } else {
          console.warn(`[TradeAlerts] ❌ Failed to send Telegram alert to user ${userId} (chatId: ${telegramChatId}) - sendDirectMessage returned null`)
        }
      } else {
        console.log(`[TradeAlerts] User ${userId} does not have Telegram linked, skipping Telegram notification`)
      }
    } catch (telegramError) {
      // Don't fail the entire alert if Telegram fails
      console.warn('[TradeAlerts] Error sending Telegram alert (non-critical):', telegramError)
    }

    // Log to automation logs
    await addDoc(collection(db, 'copyTradingAutomationLogs'), {
      userId,
      accountId: trade.accountId,
      actionType: 'trade-alert',
      details: {
        alertType,
        reason,
        tradeId: trade.id,
        symbol: trade.symbol
      },
      timestamp: Timestamp.now()
    })

    console.log(`[TradeAlerts] Sent ${alertType} alert to user ${userId} for trade ${trade.id}`)
  } catch (error) {
    console.error('[TradeAlerts] Error sending trade alert:', error)
    // Don't throw - alerts are non-critical
  }
}

/**
 * Generate and send daily summary for a user
 */
export async function sendDailySummary(userId: string, accountId: string, date: Date): Promise<void> {
  if (!isAutomationEnabled()) {
    return
  }

  try {
    // Get account details
    const accounts = await listUserCopyTradingAccounts(userId)
    const account = accounts.find((acc) => acc.accountId === accountId)

    if (!account || !account.tradeAlertsEnabled) {
      return
    }

    const alertTypes = account.alertTypes || []
    if (!alertTypes.includes('dailySummary')) {
      return
    }

    // Fetch trades for the day from Firestore
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const tradesQuery = query(
      collection(db, 'mt5_trade_history'),
      where('accountId', '==', accountId),
      where('closeTime', '>=', Timestamp.fromDate(startOfDay)),
      where('closeTime', '<=', Timestamp.fromDate(endOfDay))
    )

    const tradesSnapshot = await getDocs(tradesQuery)
    const trades = tradesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))

    // Calculate summary statistics
    const totalTrades = trades.length
    const winningTrades = trades.filter((t: any) => (t.profit || 0) > 0).length
    const losingTrades = trades.filter((t: any) => (t.profit || 0) < 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0)
    const totalPips = trades.reduce((sum: number, t: any) => sum + (t.pips || 0), 0)

    const bestTrade = trades.reduce(
      (best: any, t: any) => ((t.profit || 0) > (best?.profit || 0) ? t : best),
      null
    )
    const worstTrade = trades.reduce(
      (worst: any, t: any) => ((t.profit || 0) < (worst?.profit || 0) ? t : worst),
      null
    )

    // Format summary message
    const accountLabel = account.label || account.accountId || 'Unknown Account'
    let message = `📈 Daily Trading Summary - ${date.toLocaleDateString()}\n\n`
    message += `Account: ${accountLabel}\n`
    message += `Total Trades: ${totalTrades}\n`
    message += `Win Rate: ${winRate.toFixed(1)}% (${winningTrades}W / ${losingTrades}L)\n`
    message += `Total Profit: $${totalProfit.toFixed(2)}\n`
    message += `Total Pips: ${totalPips.toFixed(1)}\n`

    if (bestTrade) {
      message += `\nBest Trade: ${bestTrade.symbol} - $${(bestTrade.profit || 0).toFixed(2)}`
    }
    if (worstTrade) {
      message += `\nWorst Trade: ${worstTrade.symbol} - $${(worstTrade.profit || 0).toFixed(2)}`
    }

    // Send in-app notification (using 'system' type as it's a system-generated summary)
    await UserNotificationService.createNotification({
      userId,
      type: 'system',
      title: 'Daily Trading Summary',
      message,
      data: {
        accountId,
        date: date.toISOString(),
        totalTrades,
        winRate,
        totalProfit,
        totalPips,
        actionUrl: '/dashboard/copy-trading',
        soundType: totalProfit > 0 ? 'success' : totalProfit < 0 ? 'warning' : 'info'
      }
    })

    // Send Telegram message if user has Telegram linked
    try {
      const telegramChatId = await getUserTelegramChatId(userId)
      if (telegramChatId) {
        const profitEmoji = totalProfit > 0 ? '✅' : totalProfit < 0 ? '⚠️' : '📊'
        let telegramMessage = `📈 *Daily Trading Summary*\n`
        telegramMessage += `*${date.toLocaleDateString()}*\n\n`
        telegramMessage += `Account: ${accountLabel}\n`
        telegramMessage += `Total Trades: *${totalTrades}*\n`
        telegramMessage += `Win Rate: *${winRate.toFixed(1)}%* (${winningTrades}W / ${losingTrades}L)\n`
        telegramMessage += `${profitEmoji} Total Profit: *$${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}*\n`
        telegramMessage += `📈 Total Pips: *${totalPips >= 0 ? '+' : ''}${totalPips.toFixed(1)}* pips\n`

        if (bestTrade) {
          telegramMessage += `\n🏆 Best Trade: *${bestTrade.symbol}* - $${(bestTrade.profit || 0).toFixed(2)}`
        }
        if (worstTrade) {
          telegramMessage += `\n⚠️ Worst Trade: *${worstTrade.symbol}* - $${(worstTrade.profit || 0).toFixed(2)}`
        }

        const telegramMessageId = await sendDirectMessage(telegramChatId, telegramMessage)
        
        if (telegramMessageId) {
          console.log(`[TradeAlerts] Sent Telegram daily summary to user ${userId} (chatId: ${telegramChatId}) for account ${accountId}`)
        } else {
          console.warn(`[TradeAlerts] Failed to send Telegram daily summary to user ${userId} (chatId: ${telegramChatId})`)
        }
      }
    } catch (telegramError) {
      // Don't fail the entire summary if Telegram fails
      console.warn('[TradeAlerts] Error sending Telegram daily summary (non-critical):', telegramError)
    }

    // Log to automation logs
    await addDoc(collection(db, 'copyTradingAutomationLogs'), {
      userId,
      accountId,
      actionType: 'daily-summary',
      details: {
        date: date.toISOString(),
        totalTrades,
        winRate,
        totalProfit,
        totalPips
      },
      timestamp: Timestamp.now()
    })

    console.log(`[TradeAlerts] Sent daily summary to user ${userId} for account ${accountId}`)
  } catch (error) {
    console.error('[TradeAlerts] Error sending daily summary:', error)
    // Don't throw - summaries are non-critical
  }
}

