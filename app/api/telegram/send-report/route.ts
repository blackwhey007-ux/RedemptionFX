import { NextRequest, NextResponse } from 'next/server'
import { getTelegramSettings } from '@/lib/telegramService'
import { generateDailyReport, generateWeeklyReport, generateMonthlyReport, getReportData } from '@/lib/reportService'
import { TelegramReportLog } from '@/types/telegram'
import { db } from '@/lib/firestore'
import { collection, addDoc } from 'firebase/firestore'
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportType, destination } = body

    if (!reportType || !destination) {
      return NextResponse.json(
        { error: 'Report type and destination are required' },
        { status: 400 }
      )
    }

    if (!['daily', 'weekly', 'monthly'].includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be daily, weekly, or monthly' },
        { status: 400 }
      )
    }

    if (!['vip', 'public', 'both'].includes(destination)) {
      return NextResponse.json(
        { error: 'Invalid destination. Must be vip, public, or both' },
        { status: 400 }
      )
    }

    // Get Telegram settings
    const settings = await getTelegramSettings()
    if (!settings?.botToken) {
      return NextResponse.json(
        { error: 'Telegram bot not configured' },
        { status: 400 }
      )
    }

    // Generate report content
    let vipMessage = ''
    let publicMessage = ''
    
    if (destination === 'vip' || destination === 'both') {
      switch (reportType) {
        case 'daily':
          vipMessage = await generateDailyReport(false)
          break
        case 'weekly':
          vipMessage = await generateWeeklyReport(false)
          break
        case 'monthly':
          vipMessage = await generateMonthlyReport(false)
          break
      }
    }

    if (destination === 'public' || destination === 'both') {
      switch (reportType) {
        case 'daily':
          publicMessage = await generateDailyReport(true, settings)
          break
        case 'weekly':
          publicMessage = await generateWeeklyReport(true, settings)
          break
        case 'monthly':
          publicMessage = await generateMonthlyReport(true, settings)
          break
      }
    }

    // Get report data for logging
    const reportData = await getReportData(reportType as 'daily' | 'weekly' | 'monthly')

    // Send messages
    const results = {
      vipMessageId: null as string | null,
      publicMessageId: null as string | null,
      errors: [] as string[]
    }

    // Send to VIP channel
    if ((destination === 'vip' || destination === 'both') && vipMessage && settings.channelId) {
      try {
        const messageId = await sendDirectToTelegram(vipMessage, settings.channelId, settings.botToken)
        results.vipMessageId = messageId
      } catch (error) {
        const errorMsg = `VIP channel send failed: ${error}`
        results.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    // Send to public channel
    if ((destination === 'public' || destination === 'both') && publicMessage && settings.publicChannelId) {
      try {
        const messageId = await sendDirectToTelegram(publicMessage, settings.publicChannelId, settings.botToken)
        results.publicMessageId = messageId
      } catch (error) {
        const errorMsg = `Public channel send failed: ${error}`
        results.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    // Log the operation
    const success = results.vipMessageId !== null || results.publicMessageId !== null
    await logReportOperation({
      reportType: reportType as 'daily' | 'weekly' | 'monthly',
      destination: destination as 'vip' | 'public' | 'both',
      sentAt: new Date(),
      success,
      vipMessageId: results.vipMessageId || undefined,
      publicMessageId: results.publicMessageId || undefined,
      error: results.errors.length > 0 ? results.errors.join('; ') : undefined,
      metrics: {
        totalPips: reportData.metrics.totalPips,
        winRate: reportData.metrics.winRate,
        signalsCount: reportData.metrics.signalsCount
      }
    })

    return NextResponse.json({
      success,
      vipMessageId: results.vipMessageId,
      publicMessageId: results.publicMessageId,
      errors: results.errors,
      metrics: reportData.metrics
    })

  } catch (error) {
    console.error('Error sending report:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
