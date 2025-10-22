'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'
import { useAuth } from './AuthContext'

export interface UserNotification {
  id: string
  userId: string
  type: 'welcome' | 'promotion' | 'announcement' | 'system' | 'vip_approved' | 'payment_reminder'
  title: string
  message: string
  read: boolean
  createdAt: Timestamp
  data?: {
    promotionId?: string
    actionUrl?: string
    soundType?: 'default' | 'success' | 'warning' | 'info'
  }
}

interface UserNotificationContextType {
  notifications: UserNotification[]
  unreadCount: number
  loading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  playNotificationSound: (type?: string) => void
  addNotification: (notification: Omit<UserNotification, 'id' | 'createdAt' | 'read'>) => Promise<void>
}

const UserNotificationContext = createContext<UserNotificationContextType | undefined>(undefined)

interface UserNotificationProviderProps {
  children: ReactNode
}

export function UserNotificationProvider({ children }: UserNotificationProviderProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)

  const unreadCount = notifications.filter(n => !n.read).length

  // Play notification sound
  const playNotificationSound = (type: string = 'default') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Different sound patterns for different notification types
      const soundPatterns = {
        default: [440, 330], // A4, E4
        success: [523, 659, 784], // C5, E5, G5
        warning: [330, 220], // E4, A3
        info: [440, 554, 659], // A4, C#5, E5
        vip_approved: [523, 659, 784, 1047], // C5, E5, G5, C6
        promotion: [659, 784, 1047] // E5, G5, C6
      }

      const frequencies = soundPatterns[type as keyof typeof soundPatterns] || soundPatterns.default

      frequencies.forEach((frequency, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          oscillator.type = 'sine'
          
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
        }, index * 200)
      })
    } catch (error) {
      console.log('Audio not supported:', error)
    }
  }

  // Load notifications for the current user
  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    const loadNotifications = async () => {
      try {
        const notificationsRef = collection(db, 'user_notifications')
        // Use simple query without orderBy to avoid index requirement
        const q = query(
          notificationsRef,
          where('userId', '==', user.uid)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const userNotifications: UserNotification[] = []
          snapshot.forEach((doc) => {
            userNotifications.push({
              id: doc.id,
              ...doc.data()
            } as UserNotification)
          })
          
          // Sort manually by createdAt (newest first)
          userNotifications.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return b.createdAt.toMillis() - a.createdAt.toMillis()
            }
            return 0
          })
          
          setNotifications(userNotifications)
          setLoading(false)

          // Play sound for new unread notifications
          const newUnreadNotifications = userNotifications.filter(n => !n.read)
          if (newUnreadNotifications.length > 0) {
            const latestNotification = newUnreadNotifications[0]
            playNotificationSound(latestNotification.data?.soundType || latestNotification.type)
          }
        })

        return () => unsubscribe()
      } catch (error) {
        console.error('Error loading notifications:', error)
        setLoading(false)
      }
    }

    loadNotifications()
  }, [user])

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'user_notifications', notificationId)
      await updateDoc(notificationRef, {
        read: true
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read)
      const updatePromises = unreadNotifications.map(notification => 
        updateDoc(doc(db, 'user_notifications', notification.id), { read: true })
      )
      await Promise.all(updatePromises)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Add new notification
  const addNotification = async (notification: Omit<UserNotification, 'id' | 'createdAt' | 'read'>) => {
    try {
      await addDoc(collection(db, 'user_notifications'), {
        ...notification,
        read: false,
        createdAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error adding notification:', error)
    }
  }

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    playNotificationSound,
    addNotification
  }

  return (
    <UserNotificationContext.Provider value={value}>
      {children}
    </UserNotificationContext.Provider>
  )
}

export function useUserNotifications() {
  const context = useContext(UserNotificationContext)
  if (context === undefined) {
    throw new Error('useUserNotifications must be used within a UserNotificationProvider')
  }
  return context
}
