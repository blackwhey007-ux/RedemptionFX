/**
 * Telegram Trade Message Formatter
 * Formats MT5 trade positions for Telegram notifications
 * Supports customizable templates from Telegram settings
 */

import { calculatePipsFromPosition, getPipSize } from './pipCalculator'
import { getTelegramSettings } from './telegramService'

// SL Change Classification Types
export type SLChangeType = 'breakeven' | 'trailing' | 'tightening' | 'widening'

export interface SLChangeInfo {
  type: SLChangeType
  message: string
  emoji: string
  pipsMoved: number
  profitLocked?: number
}

/**
 * Classify SL change to determine the type of adjustment
 */
export function classifySLChange(
  tradeType: string,
  entryPrice: number,
  currentPrice: number,
  oldSL: number | undefined,
  newSL: number | undefined,
  symbol: string
): SLChangeInfo | null {
  // If no old SL or new SL, can't classify
  if (oldSL === undefined || newSL === undefined || oldSL === newSL) {
    return null
  }
  
  const isBuy = tradeType.toUpperCase().includes('BUY')
  const pipSize = getPipSize(symbol)
  const pipsMoved = Math.abs((newSL - oldSL) / pipSize)
  
  console.log(`🔍 [SL-CLASSIFY] Calculating pips moved:`, {
    symbol,
    oldSL,
    newSL,
    pipSize,
    priceDiff: newSL - oldSL,
    pipsMoved,
    tradeType
  })
  
  // Tolerance for breakeven detection (0.1 pips)
  const BREAKEVEN_TOLERANCE = 0.0001
  const isBreakeven = Math.abs(newSL - entryPrice) <= BREAKEVEN_TOLERANCE
  
  // Detect Breakeven
  if (isBreakeven) {
    return {
      type: 'breakeven',
      message: 'BREAKEVEN SET',
      emoji: '🔒',
      pipsMoved,
      profitLocked: 0
    }
  }
  
  // Calculate if trade is in profit
  const inProfit = isBuy ? currentPrice > entryPrice : currentPrice < entryPrice
  
  // Detect Trailing Stop (SL moved in profit direction while in profit)
  // AND SL has crossed entry into profit territory
  const slInProfitZone = isBuy ? newSL > entryPrice : newSL < entryPrice
  const isTrailing = inProfit && slInProfitZone && (
    (isBuy && newSL > oldSL) ||  // BUY: SL moved up
    (!isBuy && newSL < oldSL)     // SELL: SL moved down
  )
  
  if (isTrailing) {
    // Calculate locked profit (distance from entry to new SL)
    const profitLocked = Math.abs((newSL - entryPrice) / pipSize)
    
    return {
      type: 'trailing',
      message: 'TRAILING STOP',
      emoji: '📈',
      pipsMoved,
      profitLocked
    }
  }
  
  // Detect Tightening (SL moved closer to entry, reducing risk)
  const isTightening = (
    (isBuy && newSL > oldSL && newSL < entryPrice) ||  // BUY: SL moved up but still below entry
    (!isBuy && newSL < oldSL && newSL > entryPrice)     // SELL: SL moved down but still above entry
  )
  
  if (isTightening) {
    return {
      type: 'tightening',
      message: 'SL TIGHTENED',
      emoji: '🛡️',
      pipsMoved
    }
  }
  
  // Otherwise it's widening (increased risk)
  return {
    type: 'widening',
    message: 'SL WIDENED',
    emoji: '⚠️',
    pipsMoved
  }
}

/**
 * Render a message template by replacing variables
 */
function renderMessageTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  })
  return result
}

/**
 * Calculate risk and reward in pips
 */
function calculateRiskReward(
  entryPrice: number,
  stopLoss: number | undefined,
  takeProfit: number | undefined,
  symbol: string,
  tradeType: string
): { riskPips: number; rewardPips: number; ratio: number } | null {
  if (!stopLoss && !takeProfit) {
    return null
  }
  
  const pipSize = getPipSize(symbol)
  const isBuy = tradeType.toUpperCase().includes('BUY')
  
  // Calculate risk (entry to SL)
  let riskPips = 0
  if (stopLoss) {
    const riskDiff = isBuy ? entryPrice - stopLoss : stopLoss - entryPrice
    riskPips = Math.abs(riskDiff / pipSize)
  }
  
  // Calculate reward (entry to TP)
  let rewardPips = 0
  if (takeProfit) {
    const rewardDiff = isBuy ? takeProfit - entryPrice : entryPrice - takeProfit
    rewardPips = Math.abs(rewardDiff / pipSize)
  }
  
  // Calculate ratio (reward:risk)
  const ratio = riskPips > 0 ? rewardPips / riskPips : 0
  
  return { riskPips, rewardPips, ratio }
}

interface MT5Position {
  id?: string
  ticket?: string
  symbol: string
  type: string
  volume: number
  profit: number
  openPrice: number
  currentPrice: number
  stopLoss?: number
  takeProfit?: number
  time?: string
  timeUpdate?: string
}

/**
 * Format initial open trade message
 */
export async function formatOpenTradeMessage(position: MT5Position): Promise<string> {
  const symbol = position.symbol || 'Unknown'
  const type = position.type?.replace('POSITION_TYPE_', '') || 'Unknown'
  const entry = position.openPrice || 0
  const sl = position.stopLoss || 0
  const tp = position.takeProfit || 0
  
  // Calculate risk/reward (before template check so it's available for both paths)
  const rr = calculateRiskReward(entry, sl || undefined, tp || undefined, symbol, type)
  
  // Format SL/TP with risk/reward
  const slFormatted = sl 
    ? `${sl.toFixed(5)} (${rr?.riskPips.toFixed(1) || '0'} pips risk)`
    : 'Not Set'
  const tpFormatted = tp 
    ? `${tp.toFixed(5)} (+${rr?.rewardPips.toFixed(1) || '0'} pips)`
    : 'Not Set'
  
  // Try to get custom template from settings
  try {
    const settings = await getTelegramSettings()
    
    if (settings?.openTradeTemplate) {
      return renderMessageTemplate(settings.openTradeTemplate, {
        symbol,
        type,
        entry: entry.toFixed(5),
        sl: slFormatted,
        tp: tpFormatted,
        timestamp: formatTime(position.time),
        riskPips: rr?.riskPips.toFixed(1) || '0',
        rewardPips: rr?.rewardPips.toFixed(1) || '0',
        rrRatio: rr && rr.ratio > 0 ? `1:${rr.ratio.toFixed(2)}` : ''
      })
    }
  } catch (error) {
    console.log('⚠️ Could not load custom template, using default')
  }
  
  // Fallback to default format
  const emoji = position.type.toUpperCase().includes('BUY') ? '📈' : '📉'
  
  return `
${emoji} **NEW TRADE OPENED**

🔹 **Symbol:** ${symbol}
🔹 **Type:** ${type}
🔹 **Entry:** \`${entry.toFixed(5)}\`
🛡️ **SL:** ${sl ? `\`${sl.toFixed(5)}\` (${rr?.riskPips.toFixed(1) || '0'} pips risk)` : 'Not Set'}
🎯 **TP:** ${tp ? `\`${tp.toFixed(5)}\` (+${rr?.rewardPips.toFixed(1) || '0'} pips)` : 'Not Set'}
${rr && rr.ratio > 0 ? `⚖️ **R:R:** 1:${rr.ratio.toFixed(2)}` : ''}

⏰ ${formatTime(position.time)}
  `.trim()
}

/**
 * Format trade update message (when SL/TP changes)
 */
export async function formatTradeUpdateMessage(
  position: MT5Position,
  oldStopLoss?: number,
  oldTakeProfit?: number,
  slChangeInfo?: SLChangeInfo
): Promise<string> {
  const symbol = position.symbol || 'Unknown'
  const type = position.type?.replace('POSITION_TYPE_', '') || 'Unknown'
  const entry = position.openPrice || 0
  const currentPrice = position.currentPrice || 0
  const sl = position.stopLoss || 0
  const tp = position.takeProfit || 0
  
  // Handle undefined/null/0 properly for comparison
  const slChanged = oldStopLoss !== undefined && oldStopLoss !== null 
    ? (oldStopLoss !== position.stopLoss) 
    : false
  const tpChanged = oldTakeProfit !== undefined && oldTakeProfit !== null 
    ? (oldTakeProfit !== position.takeProfit) 
    : false
  
  // Use smart classification for SL changes if provided
  let headerEmoji = '🔄'
  let headerMessage = 'TRADE UPDATED'
  let footerMessage = ''
  
  if (slChangeInfo) {
    headerEmoji = slChangeInfo.emoji
    headerMessage = slChangeInfo.message
    
    // Add contextual footer based on type
    if (slChangeInfo.type === 'breakeven') {
      footerMessage = '\n\n✅ Risk eliminated - Trade is now risk-free!'
    } else if (slChangeInfo.type === 'trailing' && slChangeInfo.profitLocked) {
      footerMessage = `\n\n🔥 Locked +${slChangeInfo.profitLocked.toFixed(1)} pips profit`
    } else if (slChangeInfo.type === 'tightening') {
      footerMessage = `\n\nRisk reduced by ${slChangeInfo.pipsMoved.toFixed(1)} pips`
    } else if (slChangeInfo.type === 'widening') {
      footerMessage = `\n\n⚠️ Risk increased by ${slChangeInfo.pipsMoved.toFixed(1)} pips`
    }
  } else {
    // Fallback to old behavior
    const changes = []
    if (slChanged) changes.push('SL updated')
    if (tpChanged) changes.push('TP updated')
    if (changes.length > 0) {
      headerMessage = `TRADE UPDATED (${changes.join(', ')})`
    }
  }
  
  // Format SL/TP with old values if changed
  const slText = sl ? sl.toFixed(5) : 'Not Set'
  const slFull = slChanged && oldStopLoss ? `${slText} (was ${oldStopLoss.toFixed(5)})` : slText
  const tpText = tp ? tp.toFixed(5) : 'Not Set'
  const tpFull = tpChanged && oldTakeProfit ? `${tpText} (was ${oldTakeProfit.toFixed(5)})` : tpText
  
  // Calculate risk/reward
  const rr = calculateRiskReward(entry, sl || undefined, tp || undefined, symbol, type)
  
  // Add risk/reward info to SL/TP
  const slWithRisk = sl 
    ? `${slFull} (${rr?.riskPips.toFixed(1) || '0'} pips risk)`
    : slFull
  const tpWithReward = tp 
    ? `${tpFull} (+${rr?.rewardPips.toFixed(1) || '0'} pips)`
    : tpFull
  
  // Try to get custom template from settings
  try {
    const settings = await getTelegramSettings()
    
    if (settings?.updateTradeTemplate) {
      return renderMessageTemplate(settings.updateTradeTemplate, {
        symbol,
        type,
        entry: entry.toFixed(5),
        current: currentPrice.toFixed(5),
        sl: slWithRisk,
        tp: tpWithReward,
        changes: headerMessage,
        timestamp: formatTime(position.time),
        riskPips: rr?.riskPips.toFixed(1) || '0',
        rewardPips: rr?.rewardPips.toFixed(1) || '0',
        rrRatio: rr && rr.ratio > 0 ? `1:${rr.ratio.toFixed(2)}` : ''
      }) + footerMessage
    }
  } catch (error) {
    console.log('⚠️ Could not load custom template, using default')
  }
  
  // Fallback to default format with smart header
  return `
${headerEmoji} **${headerMessage}**

🔹 **Symbol:** ${symbol}
🔹 **Type:** ${type}
🔹 **Entry:** \`${entry.toFixed(5)}\`
🔹 **Current:** \`${currentPrice.toFixed(5)}\`
🛡️ **SL:** ${slWithRisk}
🎯 **TP:** ${tpWithReward}
${rr && rr.ratio > 0 ? `⚖️ **R:R:** 1:${rr.ratio.toFixed(2)}` : ''}${footerMessage}

⏰ ${formatTime(position.time)}
  `.trim()
}

/**
 * Format close notification message (new message sent when trade closes)
 */
export async function formatCloseNotification(
  position: MT5Position
): Promise<string> {
  const symbol = position.symbol || 'Unknown'
  const type = position.type?.replace('POSITION_TYPE_', '') || 'Unknown'
  const entry = (position as any).openPrice || position.priceOpen || 0
  const exit = (position as any).currentPrice || position.priceCurrent || 0
  // Calculate pips from entry/exit prices since MT5Position doesn't have pips property
  const pips = entry && exit ? calculatePipsFromPosition({
    symbol,
    type: position.type,
    openPrice: entry,
    currentPrice: exit
  }) : 0
  const profit = position.profit || 0
  const result = pips > 0 ? 'WIN' : pips < 0 ? 'LOSS' : 'BREAKEVEN'
  
  // Try to get custom template from settings
  try {
    const settings = await getTelegramSettings()
    
    if (settings?.closeNotificationTemplate) {
      return renderMessageTemplate(settings.closeNotificationTemplate, {
        symbol,
        type,
        entry: entry.toFixed(5),
        exit: exit.toFixed(5),
        pips: formatPips(pips),
        result,
        profit: profit.toFixed(2),
        timestamp: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
      })
    }
  } catch (error) {
    console.log('⚠️ Could not load custom close notification template, using default')
  }
  
  // Default format
  const emoji = result === 'WIN' ? '🎉' : result === 'LOSS' ? '😔' : '➖'
  const celebration = result === 'WIN' 
    ? '🎊 Congratulations to all VIP members!' 
    : result === 'LOSS'
    ? '📚 Learning experience - Next one will be better!'
    : '🔄 No gain, no loss - Breakeven exit'
  
  return `
${emoji} **TRADE ${result}!**

🔹 **Symbol:** ${symbol}
🔹 **Type:** ${type}
📊 **Result:** ${formatPips(pips)} pips

${celebration}

⏰ ${new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
  `.trim()
}

/**
 * Format trade closed message (edit to original message)
 */
export async function formatTradeClosedMessage(
  position: MT5Position,
  closePrice?: number
): Promise<string> {
  const symbol = position.symbol || 'Unknown'
  const type = position.type?.replace('POSITION_TYPE_', '') || 'Unknown'
  const entry = position.openPrice || position.entryPrice || 0
  const exit = closePrice || position.closePrice || position.currentPrice || 0
  const pips = position.pips || 0
  
  // Try to get custom template from settings
  try {
    const settings = await getTelegramSettings()
    
    if (settings?.closeTradeTemplate) {
      return renderMessageTemplate(settings.closeTradeTemplate, {
        symbol,
        type,
        entry: entry.toFixed(5),
        exit: exit.toFixed(5),
        pips: formatPips(pips),
        timestamp: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
      })
    }
  } catch (error) {
    console.log('⚠️ Could not load custom template, using default')
  }
  
  // Fallback to default format
  const emoji = pips > 0 ? '💰' : pips < 0 ? '📉' : '➖'
  
  return `
${emoji} **TRADE CLOSED**

🔹 **Symbol:** ${symbol}
🔹 **Type:** ${type}
🔹 **Entry:** \`${entry.toFixed(5)}\`
🔹 **Exit:** \`${exit.toFixed(5)}\`
📊 **Result:** ${formatPips(pips)} pips

⏰ ${new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
  `.trim()
}

/**
 * Format pips for display
 */
function formatPips(pips: number): string {
  if (pips === 0) return '0'
  if (pips > 0) return `+${pips.toFixed(1)}`
  return pips.toFixed(1)
}

/**
 * Format time string to readable format
 */
function formatTime(timeString?: string): string {
  if (!timeString) return 'Unknown'
  try {
    const date = new Date(timeString)
    return date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return timeString
  }
}

