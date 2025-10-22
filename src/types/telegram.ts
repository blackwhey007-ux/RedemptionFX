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
