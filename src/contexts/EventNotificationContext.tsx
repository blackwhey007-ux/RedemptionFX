'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  subscribeToAdminNotifications, 
  markNotificationAsRead,
  AdminEventNotification 
} from '@/lib/eventService'

interface EventNotificationContextType {
  eventNotifications: AdminEventNotification[]
  unreadEventCount: number
  markEventNotificationAsRead: (notificationId: string) => void
  markAllEventNotificationsAsRead: () => void
  clearEventNotifications: () => void
}

const EventNotificationContext = createContext<EventNotificationContextType | undefined>(undefined)

interface EventNotificationProviderProps {
  children: ReactNode
}

export const EventNotificationProvider: React.FC<EventNotificationProviderProps> = ({ 
  children 
}) => {
  const { user } = useAuth()
  const [eventNotifications, setEventNotifications] = useState<AdminEventNotification[]>([])

  // Only set up real-time listeners for admin users
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setEventNotifications([])
      return
    }

    const unsubscribe = subscribeToAdminNotifications((notifications) => {
      setEventNotifications(notifications)
    })

    return () => unsubscribe()
  }, [user])

  const markEventNotificationAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      setEventNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllEventNotificationsAsRead = async () => {
    try {
      const unreadNotifications = eventNotifications.filter(n => !n.read)
      await Promise.all(
        unreadNotifications.map(notification => markNotificationAsRead(notification.id))
      )
      setEventNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const clearEventNotifications = () => {
    setEventNotifications([])
  }

  const unreadEventCount = eventNotifications.filter(n => !n.read).length

  const value: EventNotificationContextType = {
    eventNotifications,
    unreadEventCount,
    markEventNotificationAsRead,
    markAllEventNotificationsAsRead,
    clearEventNotifications
  }

  return (
    <EventNotificationContext.Provider value={value}>
      {children}
    </EventNotificationContext.Provider>
  )
}

export const useEventNotifications = (): EventNotificationContextType => {
  const context = useContext(EventNotificationContext)
  if (context === undefined) {
    throw new Error('useEventNotifications must be used within an EventNotificationProvider')
  }
  return context
}




