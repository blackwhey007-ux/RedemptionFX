import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { getTelegramSettings } from '@/lib/telegramService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, messageId, text, botToken: providedBotToken } = body

    if (!chatId || !messageId || !text) {
      return NextResponse.json(
        { error: 'chatId, messageId, and text are required' },
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
    
    // Edit message
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
    
    return NextResponse.json({
      success: true,
      message: 'Message edited successfully'
    })

  } catch (error) {
    console.error('Error editing Telegram message:', error)
    
    // Provide specific error messages for common issues
    let errorMessage = 'Unknown error'
    let hint = ''
    
    if (error instanceof Error) {
      if (error.message.includes('message to edit not found')) {
        errorMessage = 'Message not found'
        hint = 'The message may have been deleted or is too old to edit'
      } else if (error.message.includes('message is not modified')) {
        errorMessage = 'Message not modified'
        hint = 'The new text is the same as the current text'
      } else if (error.message.includes('not enough rights')) {
        errorMessage = 'Insufficient permissions'
        hint = 'The bot needs permission to edit messages in the channel/group'
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

