'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { db } from '@/lib/firestore'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import { SignalNotification } from '@/types/signal'

interface SignalNotificationContextType {
  notifications: SignalNotification[]
  unreadCount: number
  markAsRead: (notificationId: string) => void
  clearAllNotifications: () => void
}

const SignalNotificationContext = createContext<SignalNotificationContextType | undefined>(undefined)

export function SignalNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<SignalNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0)

  // Function to play notification sound
  const playNotificationSound = () => {
    console.log('Attempting to play notification sound...')
    try {
      // Method 1: Try HTML5 Audio with data URI (most compatible)
      const audio = new Audio()
      
      // Create a simple beep sound using data URI
      const sampleRate = 44100
      const duration = 0.3
      const frequency = 800
      const samples = Math.floor(sampleRate * duration)
      const buffer = new ArrayBuffer(44 + samples * 2)
      const view = new DataView(buffer)
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i))
        }
      }
      
      writeString(0, 'RIFF')
      view.setUint32(4, 36 + samples * 2, true)
      writeString(8, 'WAVE')
      writeString(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, sampleRate, true)
      view.setUint32(28, sampleRate * 2, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      writeString(36, 'data')
      view.setUint32(40, samples * 2, true)
      
      // Generate sine wave
      for (let i = 0; i < samples; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3
        view.setInt16(44 + i * 2, sample * 32767, true)
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      
      audio.src = url
      audio.volume = 0.5
      audio.play().catch(() => {
        // Fallback: Try Web Audio API
        tryWebAudioAPI()
      })
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
      
    } catch (error) {
      console.log('Could not play notification sound:', error)
      // Fallback: Try Web Audio API
      tryWebAudioAPI()
    }
  }

  // Fallback Web Audio API method
  const tryWebAudioAPI = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Resume context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Set frequency for a pleasant notification sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
      
      // Set volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      // Play the sound
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.log('Web Audio API also failed:', error)
      // Final fallback: Use system beep
      trySystemBeep()
    }
  }

  // Final fallback: System beep
  const trySystemBeep = () => {
    try {
      // Try to use the system beep (works in some browsers)
      console.log('\u0007') // ASCII bell character
    } catch (error) {
      console.log('All sound methods failed:', error)
    }
  }

  // Function to show browser notification
  const showBrowserNotification = (notification: SignalNotification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New ${notification.signalCategory.toUpperCase()} Signal`, {
        body: notification.message,
        icon: '/images/redemptionfx-logo.png',
        tag: 'signal-notification'
      })
    }
  }

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    // Request notification permission on first load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Listen for signal notifications
    const q = query(
      collection(db, 'signalNotifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as SignalNotification[]

      // Filter notifications based on user role
      const filteredNotifications = newNotifications.filter(notification => {
        if (user.isAdmin) return true // Admin sees all notifications
        
        if (notification.sentTo === 'all') return true
        if (notification.sentTo === 'vip' && user.role === 'vip') return true
        if (notification.sentTo === 'free' && user.role === 'guest') return true
        
        return false
      })

      setNotifications(filteredNotifications)
      
      // Calculate unread count
      const unread = filteredNotifications.filter(notification => 
        !notification.readBy.includes(user.uid)
      ).length
      setUnreadCount(unread)

      // Play sound and show browser notification if there are new notifications
      if (unread > previousNotificationCount && previousNotificationCount > 0) {
        console.log('New notification detected! Playing sound...', {
          unread,
          previousNotificationCount,
          userRole: user.role
        })
        playNotificationSound()
        
        // Show browser notification for the newest notification
        const newestNotification = filteredNotifications.find(notification => 
          !notification.readBy.includes(user.uid)
        )
        if (newestNotification) {
          console.log('Showing browser notification:', newestNotification)
          showBrowserNotification(newestNotification)
        }
      }
      
      setPreviousNotificationCount(unread)
    })

    return () => unsubscribe()
  }, [user])

  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const notificationRef = collection(db, 'signalNotifications')
      const notificationQuery = query(notificationRef, where('__name__', '==', notificationId))
      
      // This is a simplified approach - in a real app you'd use updateDoc
      // For now, we'll just update the local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, readBy: [...notification.readBy, user.uid] }
            : notification
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  return (
    <SignalNotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      clearAllNotifications
    }}>
      {children}
    </SignalNotificationContext.Provider>
  )
}

export function useSignalNotifications() {
  const context = useContext(SignalNotificationContext)
  if (context === undefined) {
    throw new Error('useSignalNotifications must be used within a SignalNotificationProvider')
  }
  return context
}
