import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { botToken } = body

    if (!botToken) {
      return NextResponse.json(
        { error: 'Bot token is required' },
        { status: 400 }
      )
    }

    // Test bot connection
    const bot = new TelegramBot(botToken, { polling: false })
    const me = await bot.getMe()
    
    return NextResponse.json({
      success: true,
      botInfo: {
        id: me.id,
        username: me.username,
        first_name: me.first_name
      }
    })

  } catch (error) {
    console.error('Error testing Telegram connection:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
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
