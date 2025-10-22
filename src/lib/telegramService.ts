import { Signal } from '@/types/signal'
import { TelegramSettings, TelegramLog, TelegramMessage } from '@/types/telegram'
import { db } from './firestore'
import { collection, addDoc, getDocs, query, where, limit, orderBy, doc, updateDoc } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { calculatePips } from './currencyDatabase'

// Get Telegram settings from Firestore
export const getTelegramSettings = async (): Promise<TelegramSettings | null> => {
  try {
    const q = query(collection(db, 'telegramSettings'), orderBy('createdAt', 'desc'), limit(1))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0]
    const data = doc.data()
    
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as TelegramSettings
  } catch (error) {
    console.error('Error getting Telegram settings:', error)
    return null
  }
}

// Save Telegram settings to Firestore
export const saveTelegramSettings = async (settings: Omit<TelegramSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const settingsData = {
      ...settings,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    
    const docRef = await addDoc(collection(db, 'telegramSettings'), settingsData)
    return docRef.id
  } catch (error) {
    console.error('Error saving Telegram settings:', error)
    throw error
  }
}

// Log Telegram operations
const logTelegramOperation = async (logData: Omit<TelegramLog, 'id' | 'timestamp'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'telegramLogs'), {
      ...logData,
      timestamp: Timestamp.now()
    })
  } catch (error) {
    console.error('Error logging Telegram operation:', error)
  }
}

// Calculate pip information for signal
const calculatePipInfo = (signal: Signal) => {
  const entry = signal.entryPrice
  const sl = signal.stopLoss
  const tp1 = signal.takeProfit1
  
  const slPips = Math.abs(calculatePips(entry, sl, signal.pair))
  const tp1Pips = Math.abs(calculatePips(entry, tp1, signal.pair))
  const riskReward = tp1Pips / slPips
  
  let tp2Pips = 0
  let tp3Pips = 0
  
  if (signal.takeProfit2) {
    tp2Pips = Math.abs(calculatePips(entry, signal.takeProfit2, signal.pair))
  }
  
  if (signal.takeProfit3) {
    tp3Pips = Math.abs(calculatePips(entry, signal.takeProfit3, signal.pair))
  }
  
  return {
    slPips: Math.round(slPips),
    tp1Pips: Math.round(tp1Pips),
    tp2Pips: Math.round(tp2Pips),
    tp3Pips: Math.round(tp3Pips),
    riskReward: isFinite(riskReward) ? riskReward.toFixed(2) : '0.00'
  }
}

// Format signal message based on template
export const formatSignalMessage = (signal: Signal, template?: string, isPublic: boolean = false): string => {
  const direction = signal.type === 'BUY' ? '🟢 LONG' : '🔴 SHORT'
  const pipInfo = calculatePipInfo(signal)
  
  const vipTemplate = `📊 *${signal.pair}* ${direction}

💰 Entry: \`${signal.entryPrice}\`
🛑 Stop Loss: \`${signal.stopLoss}\` (${pipInfo.slPips} pips)
🎯 TP1: \`${signal.takeProfit1}\` (${pipInfo.tp1Pips} pips)${signal.takeProfit2 ? `\n🎯 TP2: \`${signal.takeProfit2}\` (${pipInfo.tp2Pips} pips)` : ''}${signal.takeProfit3 ? `\n🎯 TP3: \`${signal.takeProfit3}\` (${pipInfo.tp3Pips} pips)` : ''}

📈 Risk/Reward: ${pipInfo.riskReward}:1
${signal.notes ? `\n💡 ${signal.notes}` : ''}

⏰ ${new Date(signal.postedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}`

  const publicTemplate = `🎯 *NEW SIGNAL ALERT*

📊 ${signal.pair} ${direction}

💰 Entry Zone: \`${signal.entryPrice}\`

⚡️ Join VIP for full details:
• Complete TP/SL levels
• Risk management tips
• Trade analysis
• Priority support

🔥 Limited slots available!`

  if (isPublic) {
    return publicTemplate
  }

  if (!template) {
    return vipTemplate
  }

  // Replace template variables with proper evaluation
  return template
    .replace(/\{title\}/g, signal.title)
    .replace(/\{pair\}/g, signal.pair)
    .replace(/\{type\}/g, signal.type)
    .replace(/\{entryPrice\}/g, signal.entryPrice.toString())
    .replace(/\{stopLoss\}/g, signal.stopLoss.toString())
    .replace(/\{takeProfit\}/g, signal.takeProfit1.toString())
    .replace(/\{takeProfit1\}/g, signal.takeProfit1.toString())
    .replace(/\{takeProfit2\}/g, signal.takeProfit2?.toString() || '')
    .replace(/\{takeProfit3\}/g, signal.takeProfit3?.toString() || '')
    .replace(/\{notes\}/g, signal.notes || '')
    .replace(/\{category\}/g, signal.category.toUpperCase())
    .replace(/\{timestamp\}/g, signal.postedAt.toLocaleString())
    // Handle conditional logic in templates
    .replace(/\{type === 'BUY' \? '🟢' : '🔴'\}/g, signal.type === 'BUY' ? '🟢' : '🔴')
    .replace(/\{takeProfit2 \? '🎯 Take Profit 2: ' : ''\}/g, signal.takeProfit2 ? '🎯 Take Profit 2: ' : '')
    .replace(/\{takeProfit3 \? '🎯 Take Profit 3: ' : ''\}/g, signal.takeProfit3 ? '🎯 Take Profit 3: ' : '')
    .replace(/\{notes \? '📝 Notes: ' : ''\}/g, signal.notes ? '📝 Notes: ' : '')
}

// Send message to Telegram via API
const sendToTelegramAPI = async (message: string, destination: 'channel' | 'group', id: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/telegram/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        destination,
        id
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.messageId || null
  } catch (error) {
    console.error('Error sending to Telegram API:', error)
    throw error
  }
}

// Main function to send signal to Telegram
export const sendSignalToTelegram = async (signal: Signal): Promise<{ success: boolean; messageIds: string[]; errors: string[] }> => {
  try {
    const settings = await getTelegramSettings()
    
    if (!settings || !settings.botToken) {
      console.log('Telegram not configured')
      return { success: false, messageIds: [], errors: ['Telegram not configured'] }
    }

    const messageIds: string[] = []
    const errors: string[] = []

    if (signal.category === 'vip') {
      // Send full details to VIP channel
      const message = formatSignalMessage(signal, settings.messageTemplate, false)
      
      if (settings.enableChannel && settings.channelId) {
        try {
          const messageId = await sendToTelegramAPI(message, 'channel', settings.channelId)
          if (messageId) {
            messageIds.push(messageId)
            await logTelegramOperation({
              signalId: signal.id,
              action: 'send',
              destination: 'channel',
              success: true,
              messageId
            })
          }
        } catch (error) {
          const errorMsg = `VIP Channel send failed: ${error}`
          errors.push(errorMsg)
          await logTelegramOperation({
            signalId: signal.id,
            action: 'send',
            destination: 'channel',
            success: false,
            error: errorMsg
          })
        }
      }
    } else {
      // Send teaser to public channel
      const message = formatSignalMessage(signal, null, true)
      
      if (settings.enablePublicChannel && settings.publicChannelId) {
        try {
          const messageId = await sendToTelegramAPI(message, 'channel', settings.publicChannelId)
          if (messageId) {
            messageIds.push(messageId)
            await logTelegramOperation({
              signalId: signal.id,
              action: 'send',
              destination: 'channel',
              success: true,
              messageId
            })
          }
        } catch (error) {
          const errorMsg = `Public Channel send failed: ${error}`
          errors.push(errorMsg)
          await logTelegramOperation({
            signalId: signal.id,
            action: 'send',
            destination: 'channel',
            success: false,
            error: errorMsg
          })
        }
      }
    }

    return { success: messageIds.length > 0, messageIds, errors }

  } catch (error) {
    console.error('Error sending signal to Telegram:', error)
    await logTelegramOperation({
      signalId: signal.id,
      action: 'send',
      destination: 'channel', // Default destination for logging
      success: false,
      error: `General error: ${error}`
    })
    return { success: false, messageIds: [], errors: [`General error: ${error}`] }
  }
}

// Test Telegram connection
export const testTelegramConnection = async (botToken: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/telegram/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ botToken })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.toString() }
  }
}

// Send test message
export const sendTestMessage = async (message: string, destination: 'channel' | 'group', id: string, botToken: string): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const response = await fetch('/api/telegram/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        destination,
        id,
        botToken
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.toString() }
  }
}

// Update signal status in Telegram
export const updateSignalStatusInTelegram = async (
  signal: Signal, 
  newStatus: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const settings = await getTelegramSettings()
    if (!settings?.botToken || !signal.telegramMessageId) {
      return { success: false, error: 'Missing settings or message ID' }
    }

    const statusEmoji = {
      'hit_tp': '✅ TAKE PROFIT HIT',
      'hit_tp1': '✅ TP1 HIT',
      'hit_tp2': '✅ TP2 HIT',
      'hit_tp3': '✅ TP3 HIT',
      'hit_sl': '❌ STOP LOSS HIT',
      'breakeven': '🔒 MOVED TO BREAKEVEN',
      'close_now': '🔚 CLOSED MANUALLY',
      'cancelled': '⛔️ CANCELLED'
    }[newStatus] || newStatus

    // Create enhanced status message for close_now
    let enhancedStatusEmoji = statusEmoji
    if (newStatus === 'close_now' && signal.result !== undefined && signal.closePrice !== undefined) {
      const resultText = signal.result > 0 ? `+${signal.result}` : `${signal.result}`
      enhancedStatusEmoji = `🔚 CLOSED MANUALLY at ${signal.closePrice} (${resultText} pips)`
    }

    const originalMessage = formatSignalMessage(signal, settings.messageTemplate, false)
    const updatedMessage = `${originalMessage}\n\n🔔 *UPDATE: ${enhancedStatusEmoji}*`

    const response = await fetch('/api/telegram/update-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: signal.telegramMessageId,
        chatId: settings.channelId,
        newText: updatedMessage
      })
    })

    const result = await response.json()
    
    // Also send new update message with enhanced close_now info
    let updateMessage = `🔔 *SIGNAL UPDATE*\n\n${signal.pair} ${signal.type}\n\n${enhancedStatusEmoji}\n\n⏰ ${new Date().toLocaleString()}`
    await sendToTelegramAPI(updateMessage, 'channel', settings.channelId!)

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
