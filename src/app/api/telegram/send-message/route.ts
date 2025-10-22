import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { getTelegramSettings } from '@/lib/telegramService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, destination, id, botToken: providedBotToken } = body

    if (!message || !destination || !id) {
      return NextResponse.json(
        { error: 'Message, destination, and id are required' },
        { status: 400 }
      )
    }

    // Validate Channel/Group ID format
    const isValidId = (id: string) => {
      // Check if it's a valid format: @username, -100xxxxxxxxx, or numeric ID
      return /^(@[a-zA-Z0-9_]+|-\d{10,}|-100\d{10,})$/.test(id)
    }

    if (!isValidId(id)) {
      return NextResponse.json(
        { 
          error: 'Invalid Channel/Group ID format. Use @username, -100xxxxxxxxx, or -xxxxxxxxx',
          hint: 'Make sure your bot is added as administrator to the channel/group'
        },
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
    
    // Send message
    const result = await bot.sendMessage(id, message, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
    
    return NextResponse.json({
      success: true,
      messageId: result.message_id.toString()
    })

  } catch (error) {
    console.error('Error sending Telegram message:', error)
    
    // Provide specific error messages for common issues
    let errorMessage = 'Unknown error'
    let hint = ''
    
    if (error instanceof Error) {
      if (error.message.includes('chat not found')) {
        errorMessage = 'Channel/Group not found'
        hint = 'Make sure the bot is added as administrator to the channel/group and the ID is correct'
      } else if (error.message.includes('bot was blocked')) {
        errorMessage = 'Bot was blocked by the user'
        hint = 'The bot needs to be unblocked in the channel/group'
      } else if (error.message.includes('not enough rights')) {
        errorMessage = 'Insufficient permissions'
        hint = 'The bot needs "Post Messages" permission in the channel/group'
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
