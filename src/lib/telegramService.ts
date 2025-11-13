import { Signal } from '@/types/signal'
import { TelegramSettings, TelegramLog, TelegramMessage } from '@/types/telegram'
import { db } from './firestore'
import { collection, addDoc, getDocs, query, where, limit, orderBy, doc, updateDoc } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { calculatePips } from './currencyDatabase'

// Import TelegramBot for direct server-side calls (safe import to prevent module failure)
let TelegramBot: any = null
if (typeof window === 'undefined') {
  // Only import on server-side, with error handling
  try {
    TelegramBot = require('node-telegram-bot-api').default || require('node-telegram-bot-api')
    console.log('[TELEGRAM] TelegramBot imported successfully for server-side use')
  } catch (error) {
    console.warn('[TELEGRAM] Failed to import TelegramBot, will use HTTP API fallback:', error instanceof Error ? error.message : 'Unknown error')
    TelegramBot = null
  }
}

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
export const saveTelegramSettings = async (settings: TelegramSettings): Promise<string> => {
  try {
    // Check if settings already exist
    const existingSettings = await getTelegramSettings()
    
    if (existingSettings && existingSettings.id) {
      // Update existing settings
      const settingsRef = doc(db, 'telegramSettings', existingSettings.id)
      
      // Clean the settings object - remove id, createdAt, updatedAt and convert Dates to Timestamps
      const { id, createdAt, updatedAt, lastDailyReport, lastWeeklyReport, lastMonthlyReport, 
              lastPublicDailyReport, lastPublicWeeklyReport, lastPublicMonthlyReport, ...cleanSettings } = settings
      
      const updateData: any = {
        ...cleanSettings,
        updatedAt: Timestamp.now()
      }
      
      // Convert Date fields to Timestamps if they exist and are valid
      const convertToTimestamp = (date: any) => {
        if (!date) return null
        try {
          const d = new Date(date)
          if (isNaN(d.getTime())) return null
          return Timestamp.fromDate(d)
        } catch {
          return null
        }
      }
      
      const lastDailyTimestamp = convertToTimestamp(lastDailyReport)
      const lastWeeklyTimestamp = convertToTimestamp(lastWeeklyReport)
      const lastMonthlyTimestamp = convertToTimestamp(lastMonthlyReport)
      const lastPublicDailyTimestamp = convertToTimestamp(lastPublicDailyReport)
      const lastPublicWeeklyTimestamp = convertToTimestamp(lastPublicWeeklyReport)
      const lastPublicMonthlyTimestamp = convertToTimestamp(lastPublicMonthlyReport)
      
      if (lastDailyTimestamp) updateData.lastDailyReport = lastDailyTimestamp
      if (lastWeeklyTimestamp) updateData.lastWeeklyReport = lastWeeklyTimestamp
      if (lastMonthlyTimestamp) updateData.lastMonthlyReport = lastMonthlyTimestamp
      if (lastPublicDailyTimestamp) updateData.lastPublicDailyReport = lastPublicDailyTimestamp
      if (lastPublicWeeklyTimestamp) updateData.lastPublicWeeklyReport = lastPublicWeeklyTimestamp
      if (lastPublicMonthlyTimestamp) updateData.lastPublicMonthlyReport = lastPublicMonthlyTimestamp
      
      // Remove undefined values (Firestore doesn't allow undefined)
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })
      
      await updateDoc(settingsRef, updateData)
      return existingSettings.id
    } else {
      // Create new settings
      const settingsData = {
        ...settings,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
      
      const docRef = await addDoc(collection(db, 'telegramSettings'), settingsData)
      return docRef.id
    }
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

// Send a GIF/animation to Telegram
export const sendGif = async (
  chatId: string,
  gifUrl: string,
  botToken?: string
): Promise<boolean> => {
  try {
    const isServerSide = typeof window === 'undefined'
    
    // On server-side, try calling Telegram API directly
    if (isServerSide && TelegramBot) {
      try {
        const token = botToken || (await getTelegramSettings())?.botToken
        if (!token) {
          throw new Error('Bot token not configured')
        }
        
        const bot = new TelegramBot(token, { polling: false })
        
        // Send as animation (supports GIF URLs from Tenor, Giphy, or direct links)
        await bot.sendAnimation(chatId, gifUrl)
        
        console.log('[TELEGRAM] GIF sent directly via TelegramBot API')
        return true
      } catch (directError) {
        console.warn('[TELEGRAM] Direct API GIF send failed, falling back to HTTP:', directError instanceof Error ? directError.message : 'Unknown error')
      }
    }
    
    // HTTP fallback
    let apiUrl = '/api/telegram/send-gif'
    if (isServerSide) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      apiUrl = `${baseUrl}/api/telegram/send-gif`
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        gifUrl,
        botToken
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP error! status: ${response.status}, ${errorData.error || ''}`)
    }

    return true
  } catch (error) {
    console.error('Error sending GIF to Telegram:', error)
    // Don't throw - GIF sending is optional, shouldn't break the flow
    return false
  }
}

// Send a reply to an existing message
export const sendReplyMessage = async (
  chatId: string,
  text: string,
  replyToMessageId: number,
  botToken?: string
): Promise<number | null> => {
  try {
    const isServerSide = typeof window === 'undefined'
    
    // On server-side, try calling Telegram API directly
    if (isServerSide && TelegramBot) {
      try {
        const token = botToken || (await getTelegramSettings())?.botToken
        if (!token) {
          throw new Error('Bot token not configured')
        }
        
        const bot = new TelegramBot(token, { polling: false })
        const result = await bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_to_message_id: replyToMessageId,
          allow_sending_without_reply: true // Send even if original is deleted
        })
        
        console.log('[TELEGRAM] Reply sent directly via TelegramBot API')
        return result.message_id || null
      } catch (directError) {
        console.warn('[TELEGRAM] Direct API reply failed, falling back to HTTP:', directError instanceof Error ? directError.message : 'Unknown error')
      }
    }
    
    // HTTP fallback
    let apiUrl = '/api/telegram/send-reply'
    if (isServerSide) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      apiUrl = `${baseUrl}/api/telegram/send-reply`
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        text,
        replyToMessageId,
        botToken
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP error! status: ${response.status}, ${errorData.error || ''}`)
    }

    const result = await response.json()
    return result.messageId || null
  } catch (error) {
    console.error('Error sending reply to Telegram:', error)
    throw error
  }
}

// Copy an existing message with a caption prefix
export const copyMessage = async (
  chatId: string,
  fromChatId: string,
  messageId: number,
  captionPrefix?: string,
  botToken?: string
): Promise<number | null> => {
  try {
    const isServerSide = typeof window === 'undefined'
    
    // On server-side, try calling Telegram API directly
    if (isServerSide && TelegramBot) {
      try {
        const token = botToken || (await getTelegramSettings())?.botToken
        if (!token) {
          throw new Error('Bot token not configured')
        }
        
        const bot = new TelegramBot(token, { polling: false })
        
        // Note: copyMessage doesn't support caption modification in Telegram API
        // We'll need to forward or recreate the message
        // For now, let's use forwardMessage and then send caption separately
        const result = await bot.copyMessage(chatId, fromChatId, messageId)
        
        // If we have a prefix, send it as a separate message
        if (captionPrefix) {
          await bot.sendMessage(chatId, captionPrefix, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })
        }
        
        console.log('[TELEGRAM] Message copied directly via TelegramBot API')
        return result.message_id || null
      } catch (directError) {
        console.warn('[TELEGRAM] Direct API copy failed, falling back to HTTP:', directError instanceof Error ? directError.message : 'Unknown error')
      }
    }
    
    // HTTP fallback
    let apiUrl = '/api/telegram/copy-message'
    if (isServerSide) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      apiUrl = `${baseUrl}/api/telegram/copy-message`
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        fromChatId,
        messageId,
        captionPrefix,
        botToken
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP error! status: ${response.status}, ${errorData.error || ''}`)
    }

    const result = await response.json()
    return result.messageId || null
  } catch (error) {
    console.error('Error copying Telegram message:', error)
    throw error
  }
}

// Edit message on Telegram via API
export const editTelegramMessage = async (
  chatId: string,
  messageId: number,
  text: string,
  botToken?: string
): Promise<boolean> => {
  try {
    const isServerSide = typeof window === 'undefined'
    
    // On server-side, try calling Telegram API directly
    if (isServerSide && TelegramBot) {
      try {
        const token = botToken || (await getTelegramSettings())?.botToken
        if (!token) {
          throw new Error('Bot token not configured')
        }
        
        const bot = new TelegramBot(token, { polling: false })
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
        
        console.log('[TELEGRAM] Message edited directly via TelegramBot API')
        return true
      } catch (directError) {
        console.warn('[TELEGRAM] Direct API edit failed, falling back to HTTP:', directError instanceof Error ? directError.message : 'Unknown error')
        // Continue to HTTP fallback below
      }
    }
    
    // HTTP fallback for message editing
    let apiUrl = '/api/telegram/edit-message'
    
    if (isServerSide) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      apiUrl = `${baseUrl}/api/telegram/edit-message`
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        messageId,
        text,
        botToken
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP error! status: ${response.status}, ${errorData.error || ''}`)
    }

    return true
  } catch (error) {
    console.error('Error editing Telegram message:', error)
    throw error
  }
}

// Send message to Telegram via API
export const sendToTelegramAPI = async (message: string, destination: 'channel' | 'group', id: string, botToken?: string): Promise<string | null> => {
  try {
    const isServerSide = typeof window === 'undefined'
    
    // On server-side, try calling Telegram API directly (more efficient)
    if (isServerSide && TelegramBot) {
      try {
        const token = botToken || (await getTelegramSettings())?.botToken
        if (!token) {
          throw new Error('Bot token not configured')
        }
        
        const bot = new TelegramBot(token, { polling: false })
        const result = await bot.sendMessage(id, message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
        
        console.log('[TELEGRAM] Message sent directly via TelegramBot API')
        return result.message_id?.toString() || null
      } catch (directError) {
        // If direct API call fails, fall back to HTTP endpoint
        console.warn('[TELEGRAM] Direct API call failed, falling back to HTTP:', directError instanceof Error ? directError.message : 'Unknown error')
        // Continue to HTTP fallback below
      }
    }
    
    // Client-side or server-side fallback: use HTTP API endpoint
    let apiUrl = '/api/telegram/send-message'
    
    // For server-side HTTP fallback, use absolute URL
    if (isServerSide) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      apiUrl = `${baseUrl}/api/telegram/send-message`
      console.log('[TELEGRAM] Using HTTP fallback with URL:', apiUrl)
    }
    
    const response = await fetch(apiUrl, {
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
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP error! status: ${response.status}, ${errorData.error || ''}`)
    }

    const result = await response.json()
    return result.messageId || null
  } catch (error) {
    console.error('Error sending to Telegram API:', error)
    throw error
  }
}

/**
 * Send direct message to a Telegram user
 * @param chatId - User's Telegram user ID (numeric)
 * @param message - Message text (Markdown supported)
 * @param botToken - Optional bot token, otherwise uses settings
 * @returns Message ID if successful, null otherwise
 */
export const sendDirectMessage = async (
  chatId: number | string,
  message: string,
  botToken?: string
): Promise<string | null> => {
  try {
    const isServerSide = typeof window === 'undefined'
    
    if (!isServerSide) {
      console.warn('[TELEGRAM] sendDirectMessage can only be called server-side')
      return null
    }
    
    console.log(`[TELEGRAM] sendDirectMessage called: chatId=${chatId}, messageLength=${message.length}, botTokenProvided=${!!botToken}`)
    
    // On server-side, try calling Telegram API directly
    if (TelegramBot) {
      console.log(`[TELEGRAM] TelegramBot is available`)
      try {
        const settings = await getTelegramSettings()
        const token = botToken || settings?.botToken
        
        console.log(`[TELEGRAM] Bot token check:`, {
          botTokenProvided: !!botToken,
          settingsExists: !!settings,
          tokenFromSettings: !!settings?.botToken,
          finalTokenExists: !!token
        })
        
        if (!token) {
          console.warn('[TELEGRAM] ❌ Bot token not configured for direct message. Please configure Telegram bot token in settings.')
          return null
        }
        
        console.log(`[TELEGRAM] Creating TelegramBot instance with token (length: ${token.length})`)
        const bot = new TelegramBot(token, { polling: false })
        const chatIdStr = typeof chatId === 'number' ? chatId.toString() : chatId
        
        console.log(`[TELEGRAM] Sending message to chatId: ${chatIdStr}`)
        const result = await bot.sendMessage(chatIdStr, message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
        
        console.log(`[TELEGRAM] ✅ Direct message sent successfully to user ${chatIdStr}, messageId: ${result.message_id}`)
        return result.message_id?.toString() || null
      } catch (directError: any) {
        // Handle specific Telegram API errors
        if (directError.response?.statusCode === 403) {
          console.warn(`[TELEGRAM] ❌ User ${chatId} has not started conversation with bot or blocked it. User must send /start to the bot first.`)
          return null
        }
        if (directError.response?.statusCode === 400) {
          console.warn(`[TELEGRAM] ❌ Invalid chat ID: ${chatId}. Please verify the Telegram User ID is correct.`)
          return null
        }
        console.warn('[TELEGRAM] ❌ Direct API call failed:', {
          error: directError instanceof Error ? directError.message : 'Unknown error',
          statusCode: directError.response?.statusCode,
          response: directError.response?.body
        })
        return null
      }
    }
    
    console.warn('[TELEGRAM] ❌ TelegramBot not available, cannot send direct message')
    return null
  } catch (error) {
    console.error('[TELEGRAM] ❌ Error sending direct message:', error)
    return null
  }
}

/**
 * Verify if Telegram bot token is configured
 */
export async function verifyBotToken(botToken?: string): Promise<{ configured: boolean; error?: string }> {
  try {
    const isServerSide = typeof window === 'undefined'
    
    if (!isServerSide) {
      return { configured: false, error: 'Can only verify bot token server-side' }
    }
    
    if (!TelegramBot) {
      return { configured: false, error: 'TelegramBot module not available' }
    }
    
    const settings = await getTelegramSettings()
    const token = botToken || settings?.botToken
    
    if (!token) {
      return { configured: false, error: 'Bot token not configured' }
    }
    
    // Try to get bot info to verify token
    try {
      const bot = new TelegramBot(token, { polling: false })
      const botInfo = await bot.getMe()
      console.log(`[TELEGRAM] Bot token verified successfully. Bot username: @${botInfo.username}`)
      return { configured: true }
    } catch (error: any) {
      return { 
        configured: false, 
        error: error.response?.statusCode === 401 
          ? 'Invalid bot token' 
          : error instanceof Error ? error.message : 'Unknown error'
      }
    }
  } catch (error) {
    return { 
      configured: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
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
    console.log('[TELEGRAM] updateSignalStatusInTelegram called:', {
      signalId: signal.id,
      pair: signal.pair,
      status: newStatus,
      hasMessageId: !!signal.telegramMessageId,
      hasChatId: !!signal.telegramChatId,
      category: signal.category
    })
    
    const settings = await getTelegramSettings()
    if (!settings?.botToken) {
      console.warn('[TELEGRAM] Missing bot token')
      return { success: false, error: 'Missing bot token' }
    }

    // Determine chat ID - use signal's telegramChatId if available, otherwise use settings based on category
    let chatId = signal.telegramChatId
    if (!chatId && settings) {
      if (signal.category === 'vip' && settings.channelId) {
        chatId = settings.channelId
        console.log('[TELEGRAM] Using VIP channel ID from settings:', chatId)
      } else if (signal.category === 'free' && settings.publicChannelId) {
        chatId = settings.publicChannelId
        console.log('[TELEGRAM] Using public channel ID from settings:', chatId)
      }
    }

    if (!chatId) {
      console.warn('[TELEGRAM] Missing chat ID:', {
        signalChatId: signal.telegramChatId,
        hasVipChannel: !!settings?.channelId,
        hasPublicChannel: !!settings?.publicChannelId,
        category: signal.category
      })
      return { success: false, error: 'Missing chat ID' }
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

    // If we have telegramMessageId, try to edit the existing message
    if (signal.telegramMessageId) {
      try {
        // Format message with error handling
        let originalMessage: string
        try {
          originalMessage = formatSignalMessage(signal, settings.messageTemplate, false)
        } catch (formatError) {
          console.error('[TELEGRAM] Error formatting signal message:', formatError)
          // Fallback to simple message if formatting fails
          originalMessage = `📊 *${signal.pair}* ${signal.type === 'BUY' ? '🟢 LONG' : '🔴 SHORT'}\n\n💰 Entry: ${signal.entryPrice}\n🛑 SL: ${signal.stopLoss}\n🎯 TP: ${signal.takeProfit1}`
        }
        
        const updatedMessage = `${originalMessage}\n\n🔔 *UPDATE: ${enhancedStatusEmoji}*`

        const isServerSide = typeof window === 'undefined'
        let apiUrl = '/api/telegram/update-message'
        if (isServerSide) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
          apiUrl = `${baseUrl}/api/telegram/update-message`
        }

        // Try direct API call first (server-side only)
        if (isServerSide && TelegramBot && signal.telegramMessageId) {
          try {
            // Validate message ID is a valid number
            const messageIdNum = parseInt(signal.telegramMessageId.toString())
            if (isNaN(messageIdNum)) {
              throw new Error(`Invalid telegramMessageId: ${signal.telegramMessageId}`)
            }
            
            const bot = new TelegramBot(settings.botToken, { polling: false })
            await bot.editMessageText(updatedMessage, {
              chat_id: chatId,
              message_id: messageIdNum,
              parse_mode: 'Markdown',
              disable_web_page_preview: true
            })
            console.log('[TELEGRAM] ✅ Status update: Message edited successfully')
          } catch (directError) {
            console.warn('[TELEGRAM] Direct edit failed, trying HTTP:', directError instanceof Error ? directError.message : 'Unknown error')
            // Continue to HTTP fallback
          }
        }

        // HTTP fallback for editing (only if messageId is valid)
        if (signal.telegramMessageId) {
          try {
            const messageIdNum = parseInt(signal.telegramMessageId.toString())
            if (!isNaN(messageIdNum)) {
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  messageId: messageIdNum.toString(),
                  chatId: chatId,
                  newText: updatedMessage
                })
              })

              if (response.ok) {
                const result = await response.json()
                console.log('[TELEGRAM] ✅ Status update: Message edited via HTTP')
                
                // Also send new update message with enhanced info
                const updateMessage = `🔔 *SIGNAL UPDATE*\n\n${signal.pair} ${signal.type}\n\n${enhancedStatusEmoji}\n\n⏰ ${new Date().toLocaleString()}`
                await sendToTelegramAPI(updateMessage, 'channel', chatId)
                
                return result
              }
            }
          } catch (httpError) {
            console.warn('[TELEGRAM] HTTP edit failed, will send new message instead:', httpError instanceof Error ? httpError.message : 'Unknown error')
            // Continue to send new message below
          }
        }
      } catch (editError) {
        console.warn('[TELEGRAM] Failed to edit message, will send new message instead:', editError instanceof Error ? editError.message : 'Unknown error')
        // Continue to send new message below
      }
    }

    // If editing failed or no messageId, send a NEW message instead
    const updateMessage = `🔔 *SIGNAL UPDATE*\n\n${signal.pair} ${signal.type}\n\n${enhancedStatusEmoji}${signal.result !== undefined ? `\n💰 Result: ${signal.result > 0 ? '+' : ''}${signal.result} pips` : ''}${signal.closePrice !== undefined ? `\n📊 Close Price: ${signal.closePrice}` : ''}\n\n⏰ ${new Date().toLocaleString()}`
    
    const messageId = await sendToTelegramAPI(updateMessage, 'channel', chatId)
    
    if (messageId) {
      console.log('[TELEGRAM] ✅ Status update: New message sent successfully')
      return { success: true }
    } else {
      return { success: false, error: 'Failed to send new message' }
    }
  } catch (error: any) {
    console.error('[TELEGRAM] Error updating signal status:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// Update signal message in Telegram (for TP/SL changes)
export const updateSignalMessageInTelegram = async (signal: Signal): Promise<{ success: boolean; error?: string }> => {
  try {
    const settings = await getTelegramSettings()
    if (!settings?.botToken || !signal.telegramMessageId) {
      console.error('[TELEGRAM] Missing bot token or message ID:', {
        hasBotToken: !!settings?.botToken,
        hasMessageId: !!signal.telegramMessageId,
        telegramChatId: signal.telegramChatId
      })
      return { success: false, error: 'Missing bot token or message ID' }
    }

    // If telegramChatId is not set, try to determine from signal category
    let chatId = signal.telegramChatId
    if (!chatId && settings) {
      if (signal.category === 'vip' && settings.channelId) {
        chatId = settings.channelId
        console.log('[TELEGRAM] Using VIP channel ID from settings:', chatId)
      } else if (signal.category === 'free' && settings.publicChannelId) {
        chatId = settings.publicChannelId
        console.log('[TELEGRAM] Using public channel ID from settings:', chatId)
      }
    }

    if (!chatId) {
      console.error('[TELEGRAM] No chat ID available for signal:', {
        signalId: signal.id,
        category: signal.category,
        telegramChatId: signal.telegramChatId,
        hasVipChannel: !!settings?.channelId,
        hasPublicChannel: !!settings?.publicChannelId
      })
      return { success: false, error: 'Missing chat ID' }
    }

    // Format updated message with new TP/SL values
    const updatedMessage = formatSignalMessage(signal, settings.messageTemplate, false)
    
    console.log('[TELEGRAM] Updating message:', {
      signalId: signal.id,
      messageId: signal.telegramMessageId,
      chatId: chatId,
      pair: signal.pair
    })
    
    const isServerSide = typeof window === 'undefined'
    
    // Try direct API call first (server-side)
    if (isServerSide && TelegramBot) {
      try {
        // Validate message ID before parsing
        const messageIdNum = parseInt(signal.telegramMessageId.toString())
        if (isNaN(messageIdNum)) {
          throw new Error(`Invalid telegramMessageId: ${signal.telegramMessageId}`)
        }
        
        const bot = new TelegramBot(settings.botToken, { polling: false })
        await bot.editMessageText(updatedMessage, {
          chat_id: chatId,
          message_id: messageIdNum,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
        console.log('[TELEGRAM] ✅ Message updated directly via TelegramBot API')
        return { success: true }
      } catch (directError) {
        console.warn('[TELEGRAM] Direct API call failed, falling back to HTTP:', directError instanceof Error ? directError.message : 'Unknown error')
        console.warn('[TELEGRAM] Error details:', directError)
        // Continue to HTTP fallback
      }
    }
    
    // HTTP fallback (client-side or if direct call failed)
    let apiUrl = '/api/telegram/update-message'
    if (isServerSide) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      apiUrl = `${baseUrl}/api/telegram/update-message`
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: signal.telegramMessageId,
        chatId: chatId,
        newText: updatedMessage
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.error || `HTTP error! status: ${response.status}`
      console.error('[TELEGRAM] HTTP update failed:', errorMsg)
      throw new Error(errorMsg)
    }

    const result = await response.json()
    console.log('[TELEGRAM] ✅ Message updated via HTTP API')
    return result
  } catch (error: any) {
    console.error('[TELEGRAM] Error updating signal message:', error)
    console.error('[TELEGRAM] Error details:', {
      message: error.message,
      stack: error.stack,
      signalId: signal.id,
      telegramMessageId: signal.telegramMessageId,
      telegramChatId: signal.telegramChatId
    })
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// Remove member from Telegram group/channel
export const removeMemberFromTelegramGroup = async (
  chatId: string,
  userId: string | number,
  botToken?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get bot token from settings if not provided
    let token = botToken
    if (!token) {
      const settings = await getTelegramSettings()
      if (!settings?.botToken) {
        return { success: false, error: 'Bot token not configured' }
      }
      token = settings.botToken
    }
    
    // Initialize bot
    const bot = new TelegramBot(token, { polling: false })
    
    // Convert userId to number if it's a string
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
    
    if (isNaN(numericUserId)) {
      return { success: false, error: 'Invalid user ID format' }
    }
    
    // Ban the member (permanently removes them)
    // Note: banChatMember bans permanently, kickChatMember allows rejoin
    // We use banChatMember to prevent re-joining
    await bot.banChatMember(chatId, numericUserId, {
      until_date: Math.floor(Date.now() / 1000) + 86400 // Ban for 24 hours initially (can be extended)
    })
    
    // Optionally unban after a short period if you want to allow rejoin after payment
    // For now, we'll keep them banned
    
    await logTelegramOperation({
      signalId: 'subscription-expiry',
      action: 'send',
      destination: 'group',
      success: true,
      messageId: `Removed user ${numericUserId} from ${chatId}`
    })
    
    return { success: true }
  } catch (error: any) {
    console.error('Error removing member from Telegram group:', error)
    
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      if (error.message.includes('user not found')) {
        errorMessage = 'User not found in group'
      } else if (error.message.includes('not enough rights')) {
        errorMessage = 'Bot does not have permission to ban members'
      } else if (error.message.includes('chat not found')) {
        errorMessage = 'Chat/group not found'
      } else {
        errorMessage = error.message
      }
    }
    
    await logTelegramOperation({
      signalId: 'subscription-expiry',
      action: 'send',
      destination: 'group',
      success: false,
      error: errorMessage
    })
    
    return { success: false, error: errorMessage }
  }
}

// Get Telegram user ID from username
// Note: This requires the user to have interacted with the bot first
// For now, we'll rely on telegramUserId being stored or the username being resolved
export const getTelegramUserIdByUsername = async (
  username: string,
  botToken?: string
): Promise<{ success: boolean; userId?: number; error?: string }> => {
  try {
    // Note: Telegram Bot API doesn't provide a direct way to get user ID from username
    // without the user interacting with the bot first. 
    // We'll need to store telegramUserId when users join or interact with the bot.
    // For now, return an error suggesting to store the ID
    
    return {
      success: false,
      error: 'Telegram user ID lookup by username requires bot interaction. Store telegramUserId when users join the group.'
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
