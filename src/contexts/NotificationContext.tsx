'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'
import { Member } from '@/lib/memberService'
import { subscribeToAdminNotifications, markNotificationAsRead } from '@/lib/eventService'

interface Notification {
  id: string
  type: 'new_member' | 'payment_received' | 'role_changed' | 'event_application'
  title: string
  message: string
  timestamp: Date
  read: boolean
  memberId?: string
  eventId?: string
  applicationId?: string
  applicantName?: string
  eventTitle?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  newMemberCount: number
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  markMemberAsApproved: (memberId: string) => void
  clearApprovedMembers: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
  userRole: string
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  userRole 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [newMemberCount, setNewMemberCount] = useState(0)
  const [approvedMembers, setApprovedMembers] = useState<Set<string>>(() => {
    // Load approved members from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('approvedMembers')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    }
    return new Set()
  })

  // Only set up real-time listeners for admin users
  useEffect(() => {
    if (userRole !== 'admin') {
      return
    }

    // Listen for new members (last 7 days)
    const recentMembersQuery = query(
      collection(db, 'users'),
      where('createdAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      orderBy('createdAt', 'desc'),
      limit(10)
    )

    const unsubscribeMembers = onSnapshot(recentMembersQuery, (snapshot) => {
      const newMembers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as Member[]

      // Create notifications for new members (excluding approved ones and admins)
      const newNotifications: Notification[] = newMembers
        .filter(member => !approvedMembers.has(member.uid) && member.role !== 'admin')
        .map(member => ({
          id: `new_member_${member.uid}`,
          type: 'new_member',
          title: 'New Member Joined',
          message: `${member.displayName} (${member.email}) joined as ${member.role}`,
          timestamp: member.createdAt?.toDate?.() || new Date(),
          read: false,
          memberId: member.uid
        }))

      // Update count to only include unapproved members (not all members from last 7 days)
      setNewMemberCount(newNotifications.length)

      setNotifications(prev => {
        // Filter out notifications for approved members and merge new ones
        const filteredPrev = prev.filter(n => !approvedMembers.has(n.memberId || ''))
        const existingIds = new Set(filteredPrev.map(n => n.id))
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id))
        return [...uniqueNew, ...filteredPrev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      })
    })

    // Listen for event application notifications
    const unsubscribeEventNotifications = subscribeToAdminNotifications((eventNotifications) => {
      const eventNotificationsList: Notification[] = eventNotifications.map(notification => ({
        id: notification.id,
        type: 'event_application' as const,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp,
        read: notification.read,
        eventId: notification.eventId,
        applicationId: notification.applicationId,
        applicantName: notification.applicantName,
        eventTitle: notification.eventTitle
      }))

      setNotifications(prev => {
        // Remove old event notifications and add new ones
        const filteredPrev = prev.filter(n => n.type !== 'event_application')
        const existingIds = new Set(filteredPrev.map(n => n.id))
        const uniqueNew = eventNotificationsList.filter(n => !existingIds.has(n.id))
        return [...uniqueNew, ...filteredPrev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      })
    })

    return () => {
      unsubscribeMembers()
      unsubscribeEventNotifications()
    }
  }, [userRole])

  const markAsRead = async (notificationId: string) => {
    // Mark event notifications as read in the database
    const notification = notifications.find(n => n.id === notificationId)
    if (notification?.type === 'event_application') {
      try {
        await markNotificationAsRead(notificationId)
      } catch (error) {
        console.error('Error marking event notification as read:', error)
      }
    }

    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const markMemberAsApproved = (memberId: string) => {
    console.log('NotificationContext: Marking member as approved:', memberId)
    
    // Update approved members first (synchronously)
    const newApprovedSet = new Set([...approvedMembers, memberId])
    if (typeof window !== 'undefined') {
      localStorage.setItem('approvedMembers', JSON.stringify([...newApprovedSet]))
    }
    console.log('NotificationContext: Approved members set:', [...newApprovedSet])
    
    // Then batch both state updates together
    setApprovedMembers(newApprovedSet)
    setNotifications(prev => {
      const filtered = prev.filter(n => n.memberId !== memberId)
      console.log('NotificationContext: Notifications before:', prev.length, 'after:', filtered.length)
      return filtered
    })
  }

  const clearApprovedMembers = () => {
    console.log('NotificationContext: Clearing all approved members')
    setApprovedMembers(new Set())
    if (typeof window !== 'undefined') {
      localStorage.removeItem('approvedMembers')
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    newMemberCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    markMemberAsApproved,
    clearApprovedMembers
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
