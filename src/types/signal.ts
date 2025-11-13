export interface Signal {
  id: string
  title: string
  description: string
  category: 'free' | 'vip'
  pair: string
  type: 'BUY' | 'SELL'
  entryPrice: number
  stopLoss: number
  takeProfit1: number
  takeProfit2?: number // deprecated - kept for backwards compatibility
  takeProfit3?: number // deprecated - kept for backwards compatibility
  status: 'active' | 'hit_tp' | 'hit_sl' | 'breakeven' | 'cancelled' | 'close_now'
  result?: number // pips gained/lost
  closePrice?: number // for close_now status
  notes?: string
  screenshot?: string // Firebase Storage URL
  postedAt: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string // Admin user ID
  createdByName: string // Admin display name
  isActive: boolean
  // Telegram-related fields
  telegramMessageId?: string // Store message ID for future updates
  sentToTelegram?: boolean // Track if sent successfully
  telegramSentAt?: Date // Timestamp of Telegram send
  telegramChatId?: string // Store chat ID for updates
  telegramError?: string // Store error message if Telegram send failed
}

export interface SignalNotification {
  id: string
  signalId: string
  signalTitle: string
  signalCategory: 'free' | 'vip'
  message: string
  createdAt: Date
  readBy: string[] // Array of user IDs who have read this notification
  sentTo: 'all' | 'vip' | 'free' // Who should receive this notification
  signalData?: {
    pair: string
    type: 'BUY' | 'SELL'
    entryPrice: number
    stopLoss: number
    takeProfit1: number
    takeProfit2?: number
    description?: string
    notes?: string
  }
}
