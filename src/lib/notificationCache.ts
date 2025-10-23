import { Notification, NotificationStats } from '@/types/notification'

interface CachedNotificationData {
  notifications: Notification[]
  lastUpdated: number
  userId: string
  userRole: string
}

interface CachedStats {
  stats: NotificationStats
  lastUpdated: number
  userId: string
}

class NotificationCache {
  private dbName = 'RedemptionFXNotifications'
  private version = 1
  private db: IDBDatabase | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create notifications store
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', { keyPath: 'userId' })
          notificationStore.createIndex('lastUpdated', 'lastUpdated', { unique: false })
          notificationStore.createIndex('userRole', 'userRole', { unique: false })
        }

        // Create stats store
        if (!db.objectStoreNames.contains('stats')) {
          const statsStore = db.createObjectStore('stats', { keyPath: 'userId' })
          statsStore.createIndex('lastUpdated', 'lastUpdated', { unique: false })
        }

        // Create preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          const preferencesStore = db.createObjectStore('preferences', { keyPath: 'userId' })
          preferencesStore.createIndex('lastUpdated', 'lastUpdated', { unique: false })
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize()
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB')
    }
    return this.db
  }

  async cacheNotifications(
    userId: string,
    userRole: string,
    notifications: Notification[]
  ): Promise<void> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['notifications'], 'readwrite')
      const store = transaction.objectStore('notifications')

      const data: CachedNotificationData = {
        notifications,
        lastUpdated: Date.now(),
        userId,
        userRole
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put(data)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('Failed to cache notifications:', error)
    }
  }

  async getCachedNotifications(
    userId: string,
    userRole: string
  ): Promise<Notification[] | null> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['notifications'], 'readonly')
      const store = transaction.objectStore('notifications')

      const data = await new Promise<CachedNotificationData | null>((resolve, reject) => {
        const request = store.get(userId)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })

      if (!data) return null

      // Check if cache is still valid
      const isExpired = Date.now() - data.lastUpdated > this.CACHE_DURATION
      if (isExpired || data.userRole !== userRole) {
        await this.clearNotificationsCache(userId)
        return null
      }

      return data.notifications
    } catch (error) {
      console.warn('Failed to get cached notifications:', error)
      return null
    }
  }

  async cacheStats(userId: string, stats: NotificationStats): Promise<void> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['stats'], 'readwrite')
      const store = transaction.objectStore('stats')

      const data: CachedStats = {
        stats,
        lastUpdated: Date.now(),
        userId
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put(data)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('Failed to cache stats:', error)
    }
  }

  async getCachedStats(userId: string): Promise<NotificationStats | null> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['stats'], 'readonly')
      const store = transaction.objectStore('stats')

      const data = await new Promise<CachedStats | null>((resolve, reject) => {
        const request = store.get(userId)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })

      if (!data) return null

      // Check if cache is still valid
      const isExpired = Date.now() - data.lastUpdated > this.CACHE_DURATION
      if (isExpired) {
        await this.clearStatsCache(userId)
        return null
      }

      return data.stats
    } catch (error) {
      console.warn('Failed to get cached stats:', error)
      return null
    }
  }

  async cachePreferences(userId: string, preferences: any): Promise<void> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['preferences'], 'readwrite')
      const store = transaction.objectStore('preferences')

      const data = {
        preferences,
        lastUpdated: Date.now(),
        userId
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put(data)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('Failed to cache preferences:', error)
    }
  }

  async getCachedPreferences(userId: string): Promise<any | null> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['preferences'], 'readonly')
      const store = transaction.objectStore('preferences')

      const data = await new Promise<any | null>((resolve, reject) => {
        const request = store.get(userId)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })

      if (!data) return null

      // Check if cache is still valid
      const isExpired = Date.now() - data.lastUpdated > this.CACHE_DURATION
      if (isExpired) {
        await this.clearPreferencesCache(userId)
        return null
      }

      return data.preferences
    } catch (error) {
      console.warn('Failed to get cached preferences:', error)
      return null
    }
  }

  async clearNotificationsCache(userId: string): Promise<void> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['notifications'], 'readwrite')
      const store = transaction.objectStore('notifications')

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(userId)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('Failed to clear notifications cache:', error)
    }
  }

  async clearStatsCache(userId: string): Promise<void> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['stats'], 'readwrite')
      const store = transaction.objectStore('stats')

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(userId)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('Failed to clear stats cache:', error)
    }
  }

  async clearPreferencesCache(userId: string): Promise<void> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['preferences'], 'readwrite')
      const store = transaction.objectStore('preferences')

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(userId)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('Failed to clear preferences cache:', error)
    }
  }

  async clearAllCaches(userId: string): Promise<void> {
    await Promise.all([
      this.clearNotificationsCache(userId),
      this.clearStatsCache(userId),
      this.clearPreferencesCache(userId)
    ])
  }

  async clearExpiredCaches(): Promise<void> {
    try {
      const db = await this.ensureDB()
      const now = Date.now()

      // Clear expired notifications
      const notificationTransaction = db.transaction(['notifications'], 'readwrite')
      const notificationStore = notificationTransaction.objectStore('notifications')
      const notificationIndex = notificationStore.index('lastUpdated')
      const notificationRange = IDBKeyRange.upperBound(now - this.CACHE_DURATION)
      
      await new Promise<void>((resolve, reject) => {
        const request = notificationIndex.openCursor(notificationRange)
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          } else {
            resolve()
          }
        }
        request.onerror = () => reject(request.error)
      })

      // Clear expired stats
      const statsTransaction = db.transaction(['stats'], 'readwrite')
      const statsStore = statsTransaction.objectStore('stats')
      const statsIndex = statsStore.index('lastUpdated')
      const statsRange = IDBKeyRange.upperBound(now - this.CACHE_DURATION)
      
      await new Promise<void>((resolve, reject) => {
        const request = statsIndex.openCursor(statsRange)
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          } else {
            resolve()
          }
        }
        request.onerror = () => reject(request.error)
      })

      // Clear expired preferences
      const preferencesTransaction = db.transaction(['preferences'], 'readwrite')
      const preferencesStore = preferencesTransaction.objectStore('preferences')
      const preferencesIndex = preferencesStore.index('lastUpdated')
      const preferencesRange = IDBKeyRange.upperBound(now - this.CACHE_DURATION)
      
      await new Promise<void>((resolve, reject) => {
        const request = preferencesIndex.openCursor(preferencesRange)
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          } else {
            resolve()
          }
        }
        request.onerror = () => reject(request.error)
      })

    } catch (error) {
      console.warn('Failed to clear expired caches:', error)
    }
  }

  async getCacheSize(): Promise<{ notifications: number; stats: number; preferences: number }> {
    try {
      const db = await this.ensureDB()
      
      const notificationCount = await this.getStoreCount(db, 'notifications')
      const statsCount = await this.getStoreCount(db, 'stats')
      const preferencesCount = await this.getStoreCount(db, 'preferences')

      return {
        notifications: notificationCount,
        stats: statsCount,
        preferences: preferencesCount
      }
    } catch (error) {
      console.warn('Failed to get cache size:', error)
      return { notifications: 0, stats: 0, preferences: 0 }
    }
  }

  private async getStoreCount(db: IDBDatabase, storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

// Export singleton instance
export const notificationCache = new NotificationCache()

// Initialize cache on module load
if (typeof window !== 'undefined') {
  notificationCache.initialize().catch(console.warn)
}

