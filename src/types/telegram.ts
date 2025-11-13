export interface TelegramSettings {
  id?: string
  botToken: string
  channelId?: string
  groupId?: string
  publicChannelId?: string
  enableChannel: boolean
  enableGroup: boolean
  enableDMs: boolean
  enablePublicChannel: boolean
  messageTemplate: string
  // MT5 Trade Message Templates
  openTradeTemplate?: string
  updateTradeTemplate?: string
  closeTradeTemplate?: string
  // Report Templates
  dailyReportTemplate?: string
  weeklyReportTemplate?: string
  monthlyReportTemplate?: string
  publicReportTemplate?: string
  // VIP Channel Reports
  enableDailyReports?: boolean
  enableWeeklyReports?: boolean
  enableMonthlyReports?: boolean
  // Public Channel Reports (Marketing)
  enablePublicDailyReports?: boolean
  enablePublicWeeklyReports?: boolean
  enablePublicMonthlyReports?: boolean
  // Scheduling
  dailyReportTime?: string // HH:MM format
  weeklyReportDay?: number // 0-6 (Sunday-Saturday)
  monthlyReportDay?: number // 1-28
  // Last Sent Tracking
  lastDailyReport?: Date
  lastWeeklyReport?: Date
  lastMonthlyReport?: Date
  lastPublicDailyReport?: Date
  lastPublicWeeklyReport?: Date
  lastPublicMonthlyReport?: Date
  // Marketing Links
  vipWebsiteUrl?: string        // e.g., "https://yourwebsite.com/vip"
  vipTelegramContact?: string   // e.g., "@yourusername" or "https://t.me/yourusername"
  // Update Notifications (TP/SL changes)
  sendUpdateNotification?: boolean
  updateNotificationStyle?: 'reply' | 'copy'
  updateNotificationPrefix?: string
  // Trade Close Notifications
  sendCloseNotification?: boolean
  winGifUrl?: string
  lossGifUrl?: string
  closeNotificationTemplate?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface TelegramLog {
  id: string
  signalId: string
  action: 'send' | 'update' | 'delete'
  destination: 'channel' | 'group' | 'dm'
  success: boolean
  messageId?: string
  error?: string
  timestamp: Date
}

export interface TelegramReportLog {
  id: string
  reportType: 'daily' | 'weekly' | 'monthly'
  destination: 'vip' | 'public' | 'both'
  sentAt: Date
  success: boolean
  vipMessageId?: string
  publicMessageId?: string
  error?: string
  metrics: {
    totalPips: number
    winRate: number
    signalsCount: number
  }
}

export interface TelegramMessage {
  text: string
  parse_mode?: 'HTML' | 'Markdown'
  reply_markup?: {
    inline_keyboard?: Array<Array<{
      text: string
      url?: string
      callback_data?: string
    }>>
  }
}
