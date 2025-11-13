import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { getTelegramSettings } from '@/lib/telegramService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, fromChatId, messageId, captionPrefix, botToken: providedBotToken } = body

    if (!chatId || !fromChatId || !messageId) {
      return NextResponse.json(
        { error: 'chatId, fromChatId, and messageId are required' },
        { status: 400 }
      )
    }

    // Get bot token from settings or use provided one
    let botToken = providedBotToken
    if (!botToken) {
      const settings = await getTelegramSettings()
      if (!settings?.botToken) {
        return NextResponse.json(
          { error: 'Bot token not configured' },
          { status: 400 }
        )
      }
      botToken = settings.botToken
    }

    // Initialize bot
    const bot = new TelegramBot(botToken, { polling: false })
    
    // Copy the message
    const result = await bot.copyMessage(chatId, fromChatId, messageId)
    
    // If caption prefix is provided, send it as a separate message immediately before
    if (captionPrefix) {
      await bot.sendMessage(chatId, captionPrefix, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    }
    
    return NextResponse.json({
      success: true,
      messageId: result.message_id
    })

  } catch (error) {
    console.error('Error copying Telegram message:', error)
    
    let errorMessage = 'Unknown error'
    let hint = ''
    
    if (error instanceof Error) {
      if (error.message.includes('chat not found')) {
        errorMessage = 'Channel/Group not found'
        hint = 'Make sure the bot is added as administrator to the channel/group'
      } else if (error.message.includes('message to copy not found')) {
        errorMessage = 'Original message not found'
        hint = 'The original message may have been deleted'
      } else if (error.message.includes('not enough rights')) {
        errorMessage = 'Insufficient permissions'
        hint = 'The bot needs "Post Messages" permission'
      } else if (error.message.includes('Unauthorized')) {
        errorMessage = 'Invalid bot token'
        hint = 'Check your bot token from @BotFather'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        hint: hint
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


