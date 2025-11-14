'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { useNotificationPreferences } from './NotificationPreferencesContext'
import { NotificationService } from '@/lib/notificationService'
import { notificationSoundManager } from '@/lib/notificationSoundManager'
import { notificationCache } from '@/lib/notificationCache'
import { getTimestampMillis } from '@/lib/utils/timestamp'
import type { 
  Notification as AppNotification, 
  NotificationFilters, 
  PaginationOptions, 
  NotificationStats,
  BrowserNotificationOptions
} from '@/types/notification'

interface UnifiedNotificationContextType {
  // State
  notifications: AppNotification[]
  stats: NotificationStats | null
  loading: boolean
  error: string | null
  hasMore: boolean
  isOnline: boolean

  // Actions
  loadNotifications: (refresh?: boolean) => Promise<void>
  loadMoreNotifications: () => Promise<void>
  markAsRead: (notificationId: string, notificationType: string) => Promise<void>
  markMultipleAsRead: (notificationIds: { id: string; type: string }[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string, notificationType: string) => Promise<void>
  refreshNotifications: () => Promise<void>
  clearError: () => void

  // Filters and pagination
  setFilters: (filters: NotificationFilters) => void
  currentFilters: NotificationFilters
  pagination: PaginationOptions
  setPagination: (pagination: Partial<PaginationOptions>) => void

  // Browser notifications
  requestNotificationPermission: () => Promise<boolean>
  showBrowserNotification: (options: BrowserNotificationOptions) => void
}

const UnifiedNotificationContext = createContext<UnifiedNotificationContextType | undefined>(undefined)

interface UnifiedNotificationProviderProps {
  children: ReactNode
}

export function UnifiedNotificationProvider({ children }: UnifiedNotificationProviderProps) {
  const { user } = useAuth()
  const { preferences, isDNDActive } = useNotificationPreferences()
  
  // State
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isOnline, setIsOnline] = useState(true)

  // Filters and pagination
  const [currentFilters, setCurrentFilters] = useState<NotificationFilters>({})
  const [pagination, setPaginationState] = useState<PaginationOptions>({
    limit: 20,
    orderBy: 'createdAt',
    orderDirection: 'desc'
  })

  // Refs for tracking
  const lastDocRef = useRef<any>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const lastNotificationTimeRef = useRef<number>(0)

  // Online/offline detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load notifications from cache or Firestore
  const loadNotifications = useCallback(async (refresh = false) => {
    if (!user) {
      console.log('🔔 loadNotifications: No user, skipping')
      return
    }

    console.log('🔔 loadNotifications: Starting load', {
      userId: user.uid,
      userRole: user.role,
      refresh,
      filters: currentFilters,
      pagination
    })

    setLoading(true)
    setError(null)

    try {
      // Try cache first if not refreshing
      if (!refresh) {
        console.log('🔔 loadNotifications: Checking cache first')
        const cachedNotifications = await notificationCache.getCachedNotifications(user.uid, user.role)
        if (cachedNotifications && cachedNotifications.length > 0) {
          console.log('🔔 loadNotifications: Using cached notifications', {
            count: cachedNotifications.length,
            read: cachedNotifications.filter(n => n.read).length,
            unread: cachedNotifications.filter(n => !n.read).length,
            notifications: cachedNotifications.map(n => ({ id: n.id, read: n.read, type: n.type }))
          })
          setNotifications(cachedNotifications)
          setLoading(false)
          
          // Load stats from cache
          const cachedStats = await notificationCache.getCachedStats(user.uid)
          if (cachedStats) {
            console.log('🔔 loadNotifications: Using cached stats:', cachedStats)
            setStats(cachedStats)
          }
        }
      }

      // Load from Firestore
      console.log('🔔 loadNotifications: Fetching from Firestore')
      const result = await NotificationService.getNotifications(
        user.uid,
        user.role,
        currentFilters,
        pagination
      )

      console.log('🔔 loadNotifications: Firestore result', {
        count: result.notifications.length,
        read: result.notifications.filter(n => n.read).length,
        unread: result.notifications.filter(n => !n.read).length,
        types: result.notifications.map(n => n.type),
        hasLastDoc: !!result.lastDoc,
        notifications: result.notifications.map(n => ({ id: n.id, read: n.read, type: n.type }))
      })

      setNotifications(result.notifications)
      lastDocRef.current = result.lastDoc
      setHasMore(result.notifications.length === pagination.limit)

      // Cache the results
      await notificationCache.cacheNotifications(user.uid, user.role, result.notifications)

      // Load stats
      const notificationStats = await NotificationService.getNotificationStats(user.uid, user.role)
      setStats(notificationStats)
      await notificationCache.cacheStats(user.uid, notificationStats)

      // Check for new notifications and play sound
      if (result.notifications.length > 0) {
        const latestNotification = result.notifications[0]
        const notificationTime = getTimestampMillis(latestNotification.createdAt)
        
        if (notificationTime > lastNotificationTimeRef.current) {
          lastNotificationTimeRef.current = notificationTime
          
          // Play sound if preferences allow
          if (preferences.soundEnabled && !isDNDActive()) {
            console.log('🔔 loadNotifications: Playing sound for new notification')
            await notificationSoundManager.playNotificationSound(
              preferences,
              latestNotification.type,
              notificationTime
            )
          }

          // Show browser notification if enabled
          if (preferences.browserNotificationsEnabled && !isDNDActive()) {
            console.log('🔔 loadNotifications: Showing browser notification')
            showBrowserNotification({
              title: latestNotification.title,
              body: latestNotification.message,
              icon: '/images/redemptionfx-logo.png',
              tag: `notification-${latestNotification.id}`,
              data: { notificationId: latestNotification.id }
            })
          }

          // Vibrate if enabled
          if (preferences.vibrationEnabled) {
            await notificationSoundManager.vibrate(preferences)
          }
        }
      }

    } catch (err) {
      console.error('🔔 loadNotifications: Error loading notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [user, currentFilters, pagination, preferences, isDNDActive])

  // Load more notifications (pagination)
  const loadMoreNotifications = useCallback(async () => {
    if (!user || !hasMore || loading) return

    setLoading(true)
    setError(null)

    try {
      const newPagination = {
        ...pagination,
        startAfter: lastDocRef.current
      }

      const result = await NotificationService.getNotifications(
        user.uid,
        user.role,
        currentFilters,
        newPagination
      )

      setNotifications(prev => [...prev, ...result.notifications])
      lastDocRef.current = result.lastDoc
      setHasMore(result.notifications.length === pagination.limit)

    } catch (err) {
      console.error('Error loading more notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load more notifications')
    } finally {
      setLoading(false)
    }
  }, [user, currentFilters, pagination, hasMore, loading])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string, notificationType: string) => {
    if (!user) return

    console.log('🔔 UnifiedNotificationContext: markAsRead called:', { 
      notificationId, 
      notificationType, 
      userId: user.uid 
    })

    try {
      // Update Firestore
      await NotificationService.markAsRead(notificationId, notificationType, user.uid)
      
      console.log('🔔 UnifiedNotificationContext: Firestore update successful, applying optimistic update')
      
      // Optimistic update with immediate cache update
      setNotifications(prev => {
        const updated = prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
        
        // Update cache immediately
        console.log('🔔 UnifiedNotificationContext: Updating cache with read status')
        notificationCache.cacheNotifications(user.uid, user.role, updated)
        
        return updated
      })

      // Update stats and cache
      if (stats) {
        const newStats = { ...stats, unread: Math.max(0, stats.unread - 1) }
        setStats(newStats)
        console.log('🔔 UnifiedNotificationContext: Updating stats cache')
        notificationCache.cacheStats(user.uid, newStats)
      }

      console.log('🔔 UnifiedNotificationContext: Optimistic update and cache update applied')
      
      // Force refresh from Firestore to verify (bypass cache)
      console.log('🔔 UnifiedNotificationContext: Force refreshing from Firestore to verify update')
      setTimeout(() => {
        loadNotifications(true) // true = refresh, bypass cache
      }, 500)

    } catch (err) {
      console.error('🔔 UnifiedNotificationContext: Error marking notification as read:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read')
    }
  }, [user, stats, user?.role, loadNotifications])

  // Mark multiple notifications as read
  const markMultipleAsRead = useCallback(async (notificationIds: { id: string; type: string }[]) => {
    if (!user) return

    try {
      await NotificationService.markMultipleAsRead(notificationIds)
      
      // Optimistic update
      const idsToUpdate = new Set(notificationIds.map(n => n.id))
      setNotifications(prev => 
        prev.map(notification => 
          idsToUpdate.has(notification.id)
            ? { ...notification, read: true }
            : notification
        )
      )

      // Update stats
      if (stats) {
        setStats(prev => prev ? { 
          ...prev, 
          unread: Math.max(0, prev.unread - notificationIds.length) 
        } : null)
      }

    } catch (err) {
      console.error('Error marking multiple notifications as read:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark notifications as read')
    }
  }, [user, stats])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return

    console.log('🔔 UnifiedNotificationContext: markAllAsRead called:', { 
      userId: user.uid,
      userRole: user.role 
    })

    try {
      await NotificationService.markAllAsRead(user.uid, user.role)
      
      console.log('🔔 UnifiedNotificationContext: Firestore update successful, applying optimistic update')
      
      // Optimistic update with immediate cache update
      setNotifications(prev => {
        const updated = prev.map(notification => ({ ...notification, read: true }))
        
        // Update cache immediately
        console.log('🔔 UnifiedNotificationContext: Updating cache with all read status')
        notificationCache.cacheNotifications(user.uid, user.role, updated)
        
        return updated
      })

      // Update stats and cache
      const newStats = { ...stats, unread: 0 }
      setStats(newStats)
      console.log('🔔 UnifiedNotificationContext: Updating stats cache')
      notificationCache.cacheStats(user.uid, newStats)

      console.log('🔔 UnifiedNotificationContext: All notifications marked as read and cache updated')
      
      // Force refresh from Firestore to verify (bypass cache)
      console.log('🔔 UnifiedNotificationContext: Force refreshing from Firestore to verify all read update')
      setTimeout(() => {
        loadNotifications(true) // true = refresh, bypass cache
      }, 500)

    } catch (err) {
      console.error('🔔 UnifiedNotificationContext: Error marking all notifications as read:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read')
    }
  }, [user, user?.role, stats, loadNotifications])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string, notificationType: string) => {
    if (!user) return

    try {
      await NotificationService.deleteNotification(notificationId, notificationType)
      
      // Optimistic update
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId))

      // Update stats
      if (stats) {
        const deletedNotification = notifications.find(n => n.id === notificationId)
        const wasUnread = deletedNotification && !deletedNotification.read
        setStats(prev => prev ? { 
          ...prev, 
          total: prev.total - 1,
          unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread
        } : null)
      }

    } catch (err) {
      console.error('Error deleting notification:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
    }
  }, [user, stats, notifications])

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await loadNotifications(true)
  }, [loadNotifications])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Set filters
  const setFilters = useCallback((filters: NotificationFilters) => {
    setCurrentFilters(filters)
    setNotifications([])
    lastDocRef.current = null
    setHasMore(true)
  }, [])

  // Set pagination
  const setPagination = useCallback((newPagination: Partial<PaginationOptions>) => {
    setPaginationState(prev => ({ ...prev, ...newPagination }))
    setNotifications([])
    lastDocRef.current = null
    setHasMore(true)
  }, [])

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return false
    
    // Check if Notification API is available
    if (!('Notification' in window)) return false

    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (err) {
      console.warn('Failed to request notification permission:', err)
      return false
    }
  }, [])

  // Show browser notification
  const showBrowserNotification = useCallback((options: BrowserNotificationOptions) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return
    
    // Check if Notification API is available
    if (!('Notification' in window)) return
    
    try {
      // Access Notification inside try-catch to handle any undefined errors
      const NotificationAPI = window.Notification
      
      // Check if Notification constructor exists
      if (!NotificationAPI || typeof NotificationAPI === 'undefined') {
        return
      }
      
      // Check if permission is granted
      if (NotificationAPI.permission !== 'granted') return
      
      // Create the notification
      new NotificationAPI(options.title, {
        body: options.body,
        icon: options.icon || '/images/redemptionfx-logo.png',
        badge: options.badge || '/images/redemptionfx-logo.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        ...(options.vibrate && { vibrate: options.vibrate }),
        data: options.data,
        ...(options.actions && { actions: options.actions } as any)
      })
    } catch (err) {
      // Silently fail - don't spam console with notification errors
      console.debug('Browser notification not available:', err)
    }
  }, [])

  // Load notifications when user or filters change
  useEffect(() => {
    console.log('🔔 UnifiedNotificationContext: Initial load effect', { 
      hasUser: !!user, 
      userId: user?.uid,
      userRole: user?.role,
      currentFilters,
      pagination 
    })
    
    if (user) {
      console.log('🔔 Loading notifications for user:', {
        uid: user.uid,
        role: user.role,
        email: user.email
      })
      loadNotifications()
    } else {
      console.log('🔔 No user, clearing notifications')
      setNotifications([])
      setStats(null)
      setError(null)
    }
  }, [user, currentFilters, pagination, loadNotifications])

  // Set up real-time listener
  useEffect(() => {
    console.log('🔔 Setting up real-time listener', {
      hasUser: !!user,
      isOnline,
      userId: user?.uid,
      userRole: user?.role
    })
    
    if (!user || !isOnline) {
      console.log('🔔 Skipping listener setup:', { hasUser: !!user, isOnline })
      return
    }

    console.log('🔔 Subscribing to notifications for:', {
      uid: user.uid,
      role: user.role,
      filters: currentFilters
    })
    
    const unsubscribe = NotificationService.subscribeToNotifications(
      user.uid,
      user.role,
      (newNotifications) => {
        console.log('🔔 Received notifications from listener:', {
          count: newNotifications.length,
          types: newNotifications.map(n => n.type),
          notifications: newNotifications
        })
        
        // Use Firestore as single source of truth - no complex merging
        console.log('🔔 Using Firestore data as source of truth')
        setNotifications(newNotifications)
        
        // Update stats based on Firestore data
        const unreadCount = newNotifications.filter(n => !n.read).length
        const newStats = {
          total: newNotifications.length,
          unread: unreadCount,
          read: newNotifications.length - unreadCount
        }
        
        console.log('🔔 Updating notification stats from Firestore data:', newStats)
        setStats(newStats)
        
        // Check for new notifications
        if (newNotifications.length > 0) {
          const latestNotification = newNotifications[0]
          const notificationTime = getTimestampMillis(latestNotification.createdAt)
          
          if (notificationTime > lastNotificationTimeRef.current) {
            lastNotificationTimeRef.current = notificationTime
            
            // Play sound if preferences allow
            if (preferences.soundEnabled && !isDNDActive()) {
              console.log('🔔 Playing notification sound for:', latestNotification.type)
              notificationSoundManager.playNotificationSound(
                preferences,
                latestNotification.type,
                notificationTime
              )
            }

            // Show browser notification if enabled
            if (preferences.browserNotificationsEnabled && !isDNDActive()) {
              console.log('🔔 Showing browser notification:', latestNotification.title)
              showBrowserNotification({
                title: latestNotification.title,
                body: latestNotification.message,
                icon: '/images/redemptionfx-logo.png',
                tag: `notification-${latestNotification.id}`,
                data: { notificationId: latestNotification.id }
              })
            }
          }
        }
      },
      currentFilters
    )

    unsubscribeRef.current = unsubscribe

    return () => {
      if (unsubscribeRef.current) {
        console.log('🔔 Cleaning up real-time listener')
        unsubscribeRef.current()
      }
    }
  }, [user, user?.role, currentFilters, preferences, isDNDActive, showBrowserNotification])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  const value: UnifiedNotificationContextType = {
    // State
    notifications,
    stats,
    loading,
    error,
    hasMore,
    isOnline,

    // Actions
    loadNotifications,
    loadMoreNotifications,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    clearError,

    // Filters and pagination
    setFilters,
    currentFilters,
    pagination,
    setPagination,

    // Browser notifications
    requestNotificationPermission,
    showBrowserNotification
  }

  return (
    <UnifiedNotificationContext.Provider value={value}>
      {children}
    </UnifiedNotificationContext.Provider>
  )
}

export function useUnifiedNotifications() {
  const context = useContext(UnifiedNotificationContext)
  if (context === undefined) {
    throw new Error('useUnifiedNotifications must be used within a UnifiedNotificationProvider')
  }
  return context
}
