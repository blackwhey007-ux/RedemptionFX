import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { getTelegramSettings } from '@/lib/telegramService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, userId, botToken: providedBotToken } = body

    if (!chatId || !userId) {
      return NextResponse.json(
        { error: 'chatId and userId are required' },
        { status: 400 }
      )
    }

    // Validate chat ID format
    const isValidId = (id: string) => {
      return /^(@[a-zA-Z0-9_]+|-\d{10,}|-100\d{10,})$/.test(id)
    }

    if (!isValidId(chatId)) {
      return NextResponse.json(
        { 
          error: 'Invalid Chat ID format. Use @username, -100xxxxxxxxx, or -xxxxxxxxx',
          hint: 'Make sure your bot is added as administrator to the group/channel'
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
    
    // Convert userId to number if it's a string
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
    
    if (isNaN(numericUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format. Must be a numeric Telegram user ID' },
        { status: 400 }
      )
    }

    // Ban the member from the group/channel
    // Ban for 24 hours (they can be unbanned later if needed)
    await bot.banChatMember(chatId, numericUserId, {
      until_date: Math.floor(Date.now() / 1000) + 86400
    })

    return NextResponse.json({
      success: true,
      message: `User ${numericUserId} has been removed from ${chatId}`
    })

  } catch (error: any) {
    console.error('Error removing member from Telegram:', error)
    
    // Provide specific error messages
    let errorMessage = 'Unknown error'
    let hint = ''
    
    if (error instanceof Error) {
      if (error.message.includes('user not found') || error.message.includes('USER_NOT_FOUND')) {
        errorMessage = 'User not found in the group/channel'
        hint = 'The user may not be a member of this group/channel'
      } else if (error.message.includes('not enough rights') || error.message.includes('NOT_ENOUGH_RIGHTS')) {
        errorMessage = 'Insufficient permissions'
        hint = 'The bot needs "Ban Users" permission in the group/channel'
      } else if (error.message.includes('chat not found') || error.message.includes('CHAT_NOT_FOUND')) {
        errorMessage = 'Chat/group not found'
        hint = 'Make sure the bot is added as administrator and the chat ID is correct'
      } else if (error.message.includes('can\'t remove chat owner')) {
        errorMessage = 'Cannot remove chat owner'
        hint = 'Chat owners cannot be removed from their own groups'
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
    { error: 'Method not allowed. Use POST' },
    { status: 405 }
  )
}


