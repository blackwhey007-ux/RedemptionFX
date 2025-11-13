import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { getTelegramSettings } from '@/lib/telegramService'

/**
 * Edit/Update an existing Telegram message
 * Used by streaming service to update messages when TP/SL changes
 */
export async function POST(request: NextRequest) {
  try {
    const { messageId, chatId, text, botToken: providedToken } = await request.json()
    
    console.log('[TELEGRAM_EDIT_API] Edit message request:', {
      messageId,
      chatId,
      textLength: text?.length
    })
    
    // Get bot token
    let botToken = providedToken
    if (!botToken) {
      const settings = await getTelegramSettings()
      botToken = settings?.botToken
    }
    
    if (!botToken) {
      console.error('[TELEGRAM_EDIT_API] No bot token configured')
      return NextResponse.json({ 
        success: false,
        error: 'Bot token not configured' 
      }, { status: 400 })
    }

    if (!messageId || !chatId || !text) {
      console.error('[TELEGRAM_EDIT_API] Missing required parameters:', {
        hasMessageId: !!messageId,
        hasChatId: !!chatId,
        hasText: !!text
      })
      return NextResponse.json({ 
        success: false,
        error: 'Missing required parameters (messageId, chatId, text)' 
      }, { status: 400 })
    }

    // Parse message ID to number
    const messageIdNum = parseInt(messageId.toString())
    if (isNaN(messageIdNum)) {
      console.error('[TELEGRAM_EDIT_API] Invalid message ID:', messageId)
      return NextResponse.json({
        success: false,
        error: `Invalid message ID: ${messageId}`
      }, { status: 400 })
    }

    console.log('[TELEGRAM_EDIT_API] Editing message:', {
      chatId,
      messageId: messageIdNum
    })

    const bot = new TelegramBot(botToken, { polling: false })
    
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageIdNum,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
    
    console.log('[TELEGRAM_EDIT_API] ✅ Message edited successfully')
    
    return NextResponse.json({ 
      success: true,
      message: 'Telegram message edited successfully',
      messageId: messageIdNum
    })
    
  } catch (error: any) {
    console.error('[TELEGRAM_EDIT_API] ❌ Error editing message:', error)
    console.error('[TELEGRAM_EDIT_API] Error details:', {
      message: error.message,
      description: error.response?.body?.description,
      code: error.response?.body?.error_code
    })
    
    // Telegram-specific error handling
    let errorMessage = error.message || 'Failed to edit message'
    
    if (error.response?.body?.description) {
      errorMessage = error.response.body.description
    }
    
    // Common Telegram errors
    if (errorMessage.includes('message is not modified')) {
      errorMessage = 'Message content is the same, no update needed'
    } else if (errorMessage.includes('message to edit not found')) {
      errorMessage = 'Message not found - it may have been deleted'
    } else if (errorMessage.includes('chat not found')) {
      errorMessage = 'Chat not found - check chat ID is correct'
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage
    }, { status: 500 })
  }
}



