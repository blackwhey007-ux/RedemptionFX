import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { getTelegramSettings } from '@/lib/telegramService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, gifUrl, botToken: providedBotToken } = body

    if (!chatId || !gifUrl) {
      return NextResponse.json(
        { error: 'chatId and gifUrl are required' },
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
    
    // Send GIF/animation
    await bot.sendAnimation(chatId, gifUrl)
    
    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Error sending Telegram GIF:', error)
    
    let errorMessage = 'Unknown error'
    let hint = ''
    
    if (error instanceof Error) {
      if (error.message.includes('chat not found')) {
        errorMessage = 'Channel/Group not found'
        hint = 'Make sure the bot is added as administrator'
      } else if (error.message.includes('wrong file identifier')) {
        errorMessage = 'Invalid GIF URL or file_id'
        hint = 'Use a valid GIF URL from Tenor, Giphy, or a Telegram file_id'
      } else if (error.message.includes('not enough rights')) {
        errorMessage = 'Insufficient permissions'
        hint = 'The bot needs permission to send media'
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


