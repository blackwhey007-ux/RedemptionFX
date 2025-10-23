'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'
import { useAuth } from './AuthContext'
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification'

interface NotificationPreferencesContextType {
  preferences: NotificationPreferences
  loading: boolean
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>
  resetToDefaults: () => Promise<void>
  isDNDActive: () => boolean
}

const NotificationPreferencesContext = createContext<NotificationPreferencesContextType | undefined>(undefined)

interface NotificationPreferencesProviderProps {
  children: ReactNode
}

export function NotificationPreferencesProvider({ children }: NotificationPreferencesProviderProps) {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [loading, setLoading] = useState(true)

  // Load preferences from Firestore
  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
      setLoading(false)
      return
    }

    const loadPreferences = async () => {
      try {
        const prefsRef = doc(db, 'user_preferences', user.uid)
        const prefsSnap = await getDoc(prefsRef)
        
        if (prefsSnap.exists()) {
          const data = prefsSnap.data()
          setPreferences({
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...data.notificationPreferences
          })
        } else {
          // Create default preferences for new user
          await setDoc(prefsRef, {
            notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          setPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error)
        setPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [user])

  // Set up real-time listener for preferences updates
  useEffect(() => {
    if (!user) return

    const prefsRef = doc(db, 'user_preferences', user.uid)
    const unsubscribe = onSnapshot(prefsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        setPreferences(prev => ({
          ...prev,
          ...data.notificationPreferences
        }))
      }
    }, (error) => {
      console.error('Error listening to preferences updates:', error)
    })

    return () => unsubscribe()
  }, [user])

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!user) return

    try {
      const newPreferences = { ...preferences, ...updates }
      setPreferences(newPreferences)

      const prefsRef = doc(db, 'user_preferences', user.uid)
      await setDoc(prefsRef, {
        notificationPreferences: newPreferences,
        updatedAt: new Date()
      }, { merge: true })
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      // Revert on error
      setPreferences(preferences)
      throw error
    }
  }

  const resetToDefaults = async () => {
    await updatePreferences(DEFAULT_NOTIFICATION_PREFERENCES)
  }

  const isDNDActive = (): boolean => {
    if (!preferences.doNotDisturb) return false
    
    if (preferences.dndSchedule) {
      const now = new Date()
      const currentTime = now.getHours() * 60 + now.getMinutes()
      const [startHour, startMin] = preferences.dndSchedule.start.split(':').map(Number)
      const [endHour, endMin] = preferences.dndSchedule.end.split(':').map(Number)
      const startTime = startHour * 60 + startMin
      const endTime = endHour * 60 + endMin
      
      return currentTime >= startTime && currentTime <= endTime
    }
    
    return preferences.doNotDisturb
  }

  const value: NotificationPreferencesContextType = {
    preferences,
    loading,
    updatePreferences,
    resetToDefaults,
    isDNDActive
  }

  return (
    <NotificationPreferencesContext.Provider value={value}>
      {children}
    </NotificationPreferencesContext.Provider>
  )
}

export function useNotificationPreferences() {
  const context = useContext(NotificationPreferencesContext)
  if (context === undefined) {
    throw new Error('useNotificationPreferences must be used within a NotificationPreferencesProvider')
  }
  return context
}

