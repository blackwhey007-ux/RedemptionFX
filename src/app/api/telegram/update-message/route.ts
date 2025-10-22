import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { getTelegramSettings } from '@/lib/telegramService'

export async function POST(request: NextRequest) {
  try {
    const { messageId, chatId, newText, botToken: providedToken } = await request.json()
    
    let botToken = providedToken
    if (!botToken) {
      const settings = await getTelegramSettings()
      botToken = settings?.botToken
    }
    
    if (!botToken) {
      return NextResponse.json({ error: 'No bot token' }, { status: 400 })
    }

    if (!messageId || !chatId || !newText) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const bot = new TelegramBot(botToken, { polling: false })
    
    await bot.editMessageText(newText, {
      chat_id: chatId,
      message_id: parseInt(messageId),
      parse_mode: 'Markdown'
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating Telegram message:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to update message' 
    }, { status: 500 })
  }
}
