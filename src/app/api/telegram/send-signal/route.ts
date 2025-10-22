import { NextRequest, NextResponse } from 'next/server'
import { sendSignalToTelegram } from '@/lib/telegramService'
import { Signal } from '@/types/signal'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { signal } = body

    if (!signal) {
      return NextResponse.json(
        { error: 'Signal data is required' },
        { status: 400 }
      )
    }

    // Validate signal structure
    const requiredFields = ['id', 'title', 'pair', 'type', 'entryPrice', 'stopLoss', 'takeProfit1', 'category']
    for (const field of requiredFields) {
      if (!signal[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Send signal to Telegram
    const result = await sendSignalToTelegram(signal as Signal)

    return NextResponse.json({
      success: result.success,
      messageIds: result.messageIds,
      errors: result.errors
    })

  } catch (error) {
    console.error('Error in send-signal API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
