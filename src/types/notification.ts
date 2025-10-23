import { Timestamp } from 'firebase/firestore'

// Base notification interface
export interface BaseNotification {
  id: string
  userId: string
  title: string
  message: string
  read: boolean
  createdAt: Timestamp
  updatedAt?: Timestamp
}

// User notification types
export interface UserNotification extends BaseNotification {
  type: 'welcome' | 'promotion' | 'announcement' | 'system' | 'vip_approved' | 'payment_reminder'
  data?: {
    promotionId?: string
    actionUrl?: string
    soundType?: 'default' | 'success' | 'warning' | 'info' | 'vip_approved' | 'promotion'
  }
}

// Signal notification types
export interface SignalNotification extends BaseNotification {
  type: 'signal'
  signalId: string
  signalTitle: string
  signalCategory: 'free' | 'vip'
  sentTo: 'all' | 'vip' | 'free'
  readBy: string[]
  data?: {
    actionUrl?: string
    soundType?: 'default' | 'success' | 'warning' | 'info'
  }
}

// Admin notification types (no userId needed - for all admins)
export interface AdminNotification {
  id: string
  type: 'new_member' | 'payment_received' | 'role_changed' | 'event_application'
  title: string
  message: string
  read: boolean
  createdAt: Timestamp
  updatedAt?: Timestamp
  memberId?: string
  memberName?: string
  memberEmail?: string
  eventId?: string
  applicationId?: string
  applicantName?: string
  eventTitle?: string
  data?: {
    actionUrl?: string
    soundType?: 'default' | 'success' | 'warning' | 'info'
  }
}

// Event notification types
export interface EventNotification extends BaseNotification {
  type: 'event'
  eventId: string
  eventTitle: string
  applicationId?: string
  applicantName?: string
  data?: {
    actionUrl?: string
    soundType?: 'default' | 'success' | 'warning' | 'info'
  }
}

// Unified notification type using discriminated unions
export type Notification = 
  | UserNotification 
  | SignalNotification 
  | AdminNotification 
  | EventNotification

// Notification preferences
export interface NotificationPreferences {
  soundEnabled: boolean
  browserNotificationsEnabled: boolean
  soundType: 'default' | 'minimal' | 'custom'
  doNotDisturb: boolean
  dndSchedule?: { start: string; end: string }
  notificationTypes: {
    signals: boolean
    promotions: boolean
    system: boolean
    vip: boolean
    admin: boolean
  }
  volume: number // 0-1
  vibrationEnabled: boolean
}

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  browserNotificationsEnabled: true,
  soundType: 'default',
  doNotDisturb: false,
  notificationTypes: {
    signals: true,
    promotions: true,
    system: true,
    vip: true,
    admin: false
  },
  volume: 0.7,
  vibrationEnabled: true
}

// Notification creation interfaces
export interface CreateUserNotification {
  userId: string
  type: UserNotification['type']
  title: string
  message: string
  data?: UserNotification['data']
}

export interface CreateSignalNotification {
  signalId: string
  signalTitle: string
  signalCategory: 'free' | 'vip'
  sentTo: 'all' | 'vip' | 'free'
  message: string
  data?: SignalNotification['data']
}

export interface CreateAdminNotification {
  type: AdminNotification['type']
  title: string
  message: string
  memberId?: string
  memberName?: string
  memberEmail?: string
  eventId?: string
  applicationId?: string
  applicantName?: string
  eventTitle?: string
  data?: AdminNotification['data']
}

export interface CreateEventNotification {
  eventId: string
  eventTitle: string
  title: string
  message: string
  applicationId?: string
  applicantName?: string
  data?: EventNotification['data']
}

export type CreateNotification = 
  | CreateUserNotification 
  | CreateSignalNotification 
  | CreateAdminNotification 
  | CreateEventNotification

// Notification filter options
export interface NotificationFilters {
  type?: Notification['type']
  read?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  search?: string
}

// Pagination options
export interface PaginationOptions {
  limit: number
  startAfter?: Timestamp
  orderBy: 'createdAt'
  orderDirection: 'asc' | 'desc'
}

// Notification stats
export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  recentActivity: {
    lastNotification?: Date
    notificationsToday: number
    notificationsThisWeek: number
  }
}

// Sound configuration
export interface SoundConfig {
  type: 'default' | 'minimal' | 'custom'
  frequency?: number
  duration?: number
  pattern?: number[]
  volume: number
}

// Browser notification options
export interface BrowserNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
  data?: any
  actions?: NotificationAction[]
}

// Notification action for browser notifications
export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

