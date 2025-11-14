import { EconomicEvent } from '@/types/economic-calendar'
import { economicCalendarService } from './economicCalendarService'
import { NotificationService } from '@/lib/notificationService'
import { differenceInMinutes } from 'date-fns'

interface EconomicCalendarNotificationService {
  checkAndCreateNotifications: (userId: string) => Promise<void>
  createEventNotification: (userId: string, event: EconomicEvent, minutesUntil: number) => Promise<void>
  scheduleEventNotifications: (userId: string) => Promise<void>
}

class EconomicCalendarNotificationServiceImpl implements EconomicCalendarNotificationService {
  private static instance: EconomicCalendarNotificationServiceImpl
  private notificationCheckInterval: Map<string, NodeJS.Timeout> = new Map()

  static getInstance(): EconomicCalendarNotificationServiceImpl {
    if (!EconomicCalendarNotificationServiceImpl.instance) {
      EconomicCalendarNotificationServiceImpl.instance = new EconomicCalendarNotificationServiceImpl()
    }
    return EconomicCalendarNotificationServiceImpl.instance
  }

  async checkAndCreateNotifications(userId: string): Promise<void> {
    try {
      const preferences = await economicCalendarService.getUserPreferences(userId)
      if (!preferences?.enabledNotifications) return

      const highImpactEvents = await economicCalendarService.checkForHighImpactEvents(userId)
      
      for (const event of highImpactEvents) {
        const minutesUntil = differenceInMinutes(new Date(event.date), new Date())
        
        // Only create notification if we haven't already notified for this event
        const notificationId = `economic-calendar-${event.id}-${Math.floor(minutesUntil / 30)}`
        
        await this.createEventNotification(userId, event, minutesUntil)
      }
    } catch (error) {
      console.error('Error checking and creating economic calendar notifications:', error)
    }
  }

  async createEventNotification(userId: string, event: EconomicEvent, minutesUntil: number): Promise<void> {
    try {
      const impactEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🔴'
      }[event.impact]

      const timeText = minutesUntil < 60 
        ? `${minutesUntil} minutes` 
        : `${Math.floor(minutesUntil / 60)} hours`

      const title = `${impactEmoji} Economic Event Alert`
      const message = `${event.event} (${event.country}) in ${timeText}. Forecast: ${event.forecast}`

      await NotificationService.createNotification({
        userId,
        type: 'event',
        title,
        message,
        data: {
          eventId: event.id,
          actionUrl: `/economic-calendar/${event.id}`
        }
      })

      console.log(`Created economic calendar notification for event: ${event.event}`)
    } catch (error) {
      console.error('Error creating economic calendar notification:', error)
    }
  }

  async scheduleEventNotifications(userId: string): Promise<void> {
    // Clear existing interval for this user
    const existingInterval = this.notificationCheckInterval.get(userId)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    // Check immediately
    await this.checkAndCreateNotifications(userId)

    // Set up interval to check every 5 minutes
    const interval = setInterval(async () => {
      await this.checkAndCreateNotifications(userId)
    }, 5 * 60 * 1000) // 5 minutes

    this.notificationCheckInterval.set(userId, interval)
  }

  stopScheduling(userId: string): void {
    const interval = this.notificationCheckInterval.get(userId)
    if (interval) {
      clearInterval(interval)
      this.notificationCheckInterval.delete(userId)
    }
  }

  stopAllScheduling(): void {
    for (const [userId, interval] of this.notificationCheckInterval) {
      clearInterval(interval)
    }
    this.notificationCheckInterval.clear()
  }
}

export const economicCalendarNotificationService = EconomicCalendarNotificationServiceImpl.getInstance()








