import { NextRequest, NextResponse } from 'next/server'
import { getTelegramSettings } from '@/lib/telegramService'
import { generateDailyReport, generateWeeklyReport, generateMonthlyReport, getReportData } from '@/lib/reportService'
import { TelegramReportLog } from '@/types/telegram'
import { db } from '@/lib/firestore'
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import TelegramBot from 'node-telegram-bot-api'

// Send message directly to Telegram
const sendDirectToTelegram = async (message: string, chatId: string, botToken: string): Promise<string | null> => {
  try {
    const bot = new TelegramBot(botToken, { polling: false })
    const result = await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
    return result.message_id.toString()
  } catch (error) {
    console.error('Error sending to Telegram:', error)
    throw error
  }
}

// Log report operation
const logReportOperation = async (logData: Omit<TelegramReportLog, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'telegramReportLogs'), {
      ...logData,
      sentAt: Timestamp.fromDate(logData.sentAt)
    })
  } catch (error) {
    console.error('Error logging report operation:', error)
  }
}

// Update last sent timestamp in settings
const updateLastSentTimestamp = async (settingsId: string, reportType: string, destination: 'vip' | 'public'): Promise<void> => {
  try {
    const fieldName = destination === 'vip' ? `last${reportType.charAt(0).toUpperCase() + reportType.slice(1)}Report` : 
                     `lastPublic${reportType.charAt(0).toUpperCase() + reportType.slice(1)}Report`
    
    await updateDoc(doc(db, 'telegramSettings', settingsId), {
      [fieldName]: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
  } catch (error) {
    console.error('Error updating last sent timestamp:', error)
  }
}

// Check if report should be sent based on schedule
const shouldSendReport = (settings: any, reportType: string, destination: 'vip' | 'public'): boolean => {
  const now = new Date()
  const enableField = destination === 'vip' ? `enable${reportType.charAt(0).toUpperCase() + reportType.slice(1)}Reports` :
                     `enablePublic${reportType.charAt(0).toUpperCase() + reportType.slice(1)}Reports`
  
  if (!settings[enableField]) {
    return false
  }

  const lastSentField = destination === 'vip' ? `last${reportType.charAt(0).toUpperCase() + reportType.slice(1)}Report` :
                       `lastPublic${reportType.charAt(0).toUpperCase() + reportType.slice(1)}Report`
  
  const lastSent = settings[lastSentField]?.toDate ? settings[lastSentField].toDate() : null

  switch (reportType) {
    case 'daily':
      // Send daily report if not sent today
      if (!lastSent) return true
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const lastSentDate = new Date(lastSent.getFullYear(), lastSent.getMonth(), lastSent.getDate())
      return today > lastSentDate

    case 'weekly':
      // Send weekly report if not sent this week
      if (!lastSent) return true
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay()) // Start of current week (Sunday)
      return lastSent < weekStart

    case 'monthly':
      // Send monthly report if not sent this month
      if (!lastSent) return true
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return lastSent < monthStart

    default:
      return false
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Cron job triggered for automated reports')
    
    // Get Telegram settings
    const settings = await getTelegramSettings()
    if (!settings?.botToken) {
      console.log('Telegram bot not configured, skipping reports')
      return NextResponse.json({ success: true, message: 'Telegram not configured' })
    }

    const results = {
      daily: { vip: false, public: false },
      weekly: { vip: false, public: false },
      monthly: { vip: false, public: false }
    }

    // Check and send daily reports
    if (shouldSendReport(settings, 'daily', 'vip')) {
      try {
        const message = await generateDailyReport(false)
        if (settings.channelId) {
          const messageId = await sendDirectToTelegram(message, settings.channelId, settings.botToken)
          if (messageId) {
            results.daily.vip = true
            await updateLastSentTimestamp(settings.id!, 'daily', 'vip')
            console.log('Daily VIP report sent successfully')
          }
        }
      } catch (error) {
        console.error('Failed to send daily VIP report:', error)
      }
    }

    if (shouldSendReport(settings, 'daily', 'public')) {
      try {
        const message = await generateDailyReport(true, settings)
        if (settings.publicChannelId) {
          const messageId = await sendDirectToTelegram(message, settings.publicChannelId, settings.botToken)
          if (messageId) {
            results.daily.public = true
            await updateLastSentTimestamp(settings.id!, 'daily', 'public')
            console.log('Daily public report sent successfully')
          }
        }
      } catch (error) {
        console.error('Failed to send daily public report:', error)
      }
    }

    // Check and send weekly reports
    if (shouldSendReport(settings, 'weekly', 'vip')) {
      try {
        const message = await generateWeeklyReport(false)
        if (settings.channelId) {
          const messageId = await sendDirectToTelegram(message, settings.channelId, settings.botToken)
          if (messageId) {
            results.weekly.vip = true
            await updateLastSentTimestamp(settings.id!, 'weekly', 'vip')
            console.log('Weekly VIP report sent successfully')
          }
        }
      } catch (error) {
        console.error('Failed to send weekly VIP report:', error)
      }
    }

    if (shouldSendReport(settings, 'weekly', 'public')) {
      try {
        const message = await generateWeeklyReport(true, settings)
        if (settings.publicChannelId) {
          const messageId = await sendDirectToTelegram(message, settings.publicChannelId, settings.botToken)
          if (messageId) {
            results.weekly.public = true
            await updateLastSentTimestamp(settings.id!, 'weekly', 'public')
            console.log('Weekly public report sent successfully')
          }
        }
      } catch (error) {
        console.error('Failed to send weekly public report:', error)
      }
    }

    // Check and send monthly reports
    if (shouldSendReport(settings, 'monthly', 'vip')) {
      try {
        const message = await generateMonthlyReport(false)
        if (settings.channelId) {
          const messageId = await sendDirectToTelegram(message, settings.channelId, settings.botToken)
          if (messageId) {
            results.monthly.vip = true
            await updateLastSentTimestamp(settings.id!, 'monthly', 'vip')
            console.log('Monthly VIP report sent successfully')
          }
        }
      } catch (error) {
        console.error('Failed to send monthly VIP report:', error)
      }
    }

    if (shouldSendReport(settings, 'monthly', 'public')) {
      try {
        const message = await generateMonthlyReport(true, settings)
        if (settings.publicChannelId) {
          const messageId = await sendDirectToTelegram(message, settings.publicChannelId, settings.botToken)
          if (messageId) {
            results.monthly.public = true
            await updateLastSentTimestamp(settings.id!, 'monthly', 'public')
            console.log('Monthly public report sent successfully')
          }
        }
      } catch (error) {
        console.error('Failed to send monthly public report:', error)
      }
    }

    console.log('Cron job completed:', results)
    return NextResponse.json({ 
      success: true, 
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in cron job:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
