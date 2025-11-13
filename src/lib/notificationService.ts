import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  getDocs,
  getDoc,
  writeBatch,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  onSnapshot,
  Unsubscribe,
  arrayUnion
} from 'firebase/firestore'
import { db } from './firebaseConfig'
import { getDateFromTimestamp, getTimestampMillis } from './utils/timestamp'
import { cacheManager } from './cacheManager'
import { 
  Notification, 
  CreateNotification, 
  NotificationFilters, 
  PaginationOptions, 
  NotificationStats,
  UserNotification,
  SignalNotification,
  AdminNotification,
  EventNotification
} from '@/types/notification'

export class NotificationService {
  // Create a new notification
  static async createNotification(notification: CreateNotification): Promise<string> {
    try {
      const notificationData = {
        ...notification,
        read: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      // Add type-specific fields
      if ('userId' in notification) {
        // User notification
        const docRef = await addDoc(collection(db, 'user_notifications'), notificationData)
        return docRef.id
      } else if ('signalId' in notification) {
        // Signal notification
        const signalNotificationData = {
          ...notificationData,
          readBy: []
        }
        const docRef = await addDoc(collection(db, 'signalNotifications'), signalNotificationData)
        return docRef.id
      } else if ('eventId' in notification) {
        // Event notification
        const docRef = await addDoc(collection(db, 'eventNotifications'), notificationData)
        return docRef.id
      } else if ('memberId' in notification || 'memberName' in notification) {
        // Admin notification (check for admin-specific fields)
        const docRef = await addDoc(collection(db, 'adminNotifications'), notificationData)
        return docRef.id
      } else {
        // Fallback to admin notification
        const docRef = await addDoc(collection(db, 'adminNotifications'), notificationData)
        return docRef.id
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Get notifications with pagination and filtering
  static async getNotifications(
    userId: string,
    userRole: string,
    filters: NotificationFilters = {},
    pagination: PaginationOptions = { limit: 20, orderBy: 'createdAt', orderDirection: 'desc' }
  ): Promise<{ notifications: Notification[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    console.log('📡 NotificationService.getNotifications called:', {
      userId,
      userRole,
      filters,
      pagination
    })
    
    try {
      const notifications: Notification[] = []
      let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null

      // Get user notifications
      console.log('📡 Fetching user notifications...')
      const userNotifications = await this.getUserNotifications(userId, filters, pagination)
      console.log('📡 User notifications fetched:', userNotifications.notifications.length)
      notifications.push(...userNotifications.notifications)
      lastDoc = userNotifications.lastDoc

      // Get signal notifications only for non-admin users (VIP and guest)
      if (userRole === 'vip' || userRole === 'guest') {
        console.log('📡 Fetching signal notifications for role:', userRole)
        const signalNotifications = await this.getSignalNotifications(userRole, userId, filters, pagination)
        notifications.push(...signalNotifications.notifications)
        if (!lastDoc) lastDoc = signalNotifications.lastDoc
      }

      // Get admin notifications if user is admin
      if (userRole === 'admin') {
        console.log('📡 Fetching admin notifications...')
        const adminNotifications = await this.getAdminNotifications(filters, pagination)
        console.log('📡 Admin notifications fetched:', adminNotifications.notifications.length)
        notifications.push(...adminNotifications.notifications)
        if (!lastDoc) lastDoc = adminNotifications.lastDoc
      }

      // Get event notifications if user is admin
      if (userRole === 'admin') {
        console.log('📡 Fetching event notifications...')
        const eventNotifications = await this.getEventNotifications(filters, pagination)
        console.log('📡 Event notifications fetched:', eventNotifications.notifications.length)
        notifications.push(...eventNotifications.notifications)
        if (!lastDoc) lastDoc = eventNotifications.lastDoc
      }

      // Sort all notifications by createdAt
      notifications.sort((a, b) => {
        const aTime = getTimestampMillis(a.createdAt)
        const bTime = getTimestampMillis(b.createdAt)
        return pagination.orderDirection === 'desc' ? bTime - aTime : aTime - bTime
      })

      console.log('📡 Total notifications returned:', notifications.length)
      return { notifications, lastDoc }
    } catch (error) {
      console.error('📡 Error in getNotifications:', error)
      throw error
    }
  }

  private static async getUserNotifications(
    userId: string,
    filters: NotificationFilters,
    pagination: PaginationOptions
  ): Promise<{ notifications: UserNotification[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    const notificationsRef = collection(db, 'user_notifications')
    let q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', pagination.orderDirection),
      limit(pagination.limit)
    )

    if (pagination.startAfter) {
      q = query(q, startAfter(pagination.startAfter))
    }

    if (filters.type) {
      q = query(q, where('type', '==', filters.type))
    }

    if (filters.read !== undefined) {
      q = query(q, where('read', '==', filters.read))
    }

    const snapshot = await getDocs(q)
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserNotification))

    return {
      notifications,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
    }
  }

  private static async getSignalNotifications(
    userRole: string,
    userId: string,
    filters: NotificationFilters,
    pagination: PaginationOptions
  ): Promise<{ notifications: SignalNotification[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    const notificationsRef = collection(db, 'signalNotifications')
    let q = query(
      notificationsRef,
      orderBy('createdAt', pagination.orderDirection),
      limit(pagination.limit)
    )

    if (pagination.startAfter) {
      q = query(q, startAfter(pagination.startAfter))
    }

    const snapshot = await getDocs(q)
    const allNotifications = snapshot.docs.map(doc => {
      const data = doc.data()
      const readBy = data.readBy || []
      const isRead = readBy.includes(userId)
      
      return {
        id: doc.id,
        ...data,
        read: isRead,  // Add read property based on readBy array
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as SignalNotification
    })

    // Filter based on user role
    const filteredNotifications = allNotifications.filter(notification => {
      if (userRole === 'admin') return true
      if (notification.sentTo === 'all') return true
      if (notification.sentTo === 'vip' && userRole === 'vip') return true
      if (notification.sentTo === 'free' && userRole === 'guest') return true
      return false
    })

    console.log('📡 Signal notifications fetched:', filteredNotifications.length, {
      read: filteredNotifications.filter(n => n.read).length,
      unread: filteredNotifications.filter(n => !n.read).length
    })

    return {
      notifications: filteredNotifications,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
    }
  }

  private static async getAdminNotifications(
    filters: NotificationFilters,
    pagination: PaginationOptions
  ): Promise<{ notifications: AdminNotification[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    const notificationsRef = collection(db, 'adminNotifications')
    let q = query(
      notificationsRef,
      orderBy('createdAt', pagination.orderDirection),
      limit(pagination.limit)
    )

    if (pagination.startAfter) {
      q = query(q, startAfter(pagination.startAfter))
    }

    if (filters.type) {
      q = query(q, where('type', '==', filters.type))
    }

    const snapshot = await getDocs(q)
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AdminNotification))

    return {
      notifications,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
    }
  }

  private static async getEventNotifications(
    filters: NotificationFilters,
    pagination: PaginationOptions
  ): Promise<{ notifications: EventNotification[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    const notificationsRef = collection(db, 'eventNotifications')
    let q = query(
      notificationsRef,
      orderBy('createdAt', pagination.orderDirection),
      limit(pagination.limit)
    )

    if (pagination.startAfter) {
      q = query(q, startAfter(pagination.startAfter))
    }

    const snapshot = await getDocs(q)
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EventNotification))

    return {
      notifications,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, notificationType: string, userId?: string): Promise<void> {
    try {
      console.log('🔔 markAsRead called:', { notificationId, notificationType, userId })
      
      let collectionName: string
      
      switch (notificationType) {
        case 'user':
          collectionName = 'user_notifications'
          break
        case 'signal':
          collectionName = 'signalNotifications'
          break
        case 'admin':
          collectionName = 'adminNotifications'
          break
        case 'event':
          collectionName = 'eventNotifications'
          break
        default:
          throw new Error(`Unknown notification type: ${notificationType}`)
      }

      const notificationRef = doc(db, collectionName, notificationId)
      console.log('🔔 Document path:', `${collectionName}/${notificationId}`)
      
      // Check if document exists before updating
      const docSnap = await getDoc(notificationRef)
      if (!docSnap.exists()) {
        console.error('❌ Document does not exist:', notificationId, 'in collection:', collectionName)
        throw new Error(`Notification ${notificationId} not found in ${collectionName}`)
      }
      
      console.log('✅ Document exists, proceeding with update')
      console.log('🔔 Current document data:', docSnap.data())
      
      if (notificationType === 'signal' && userId) {
        // For signal notifications, add user to readBy array
        console.log('🔔 Updating signal notification with arrayUnion for user:', userId)
        const updateData = { 
          readBy: arrayUnion(userId),
          updatedAt: Timestamp.now()
        }
        console.log('🔔 Update data:', updateData)
        
        await updateDoc(notificationRef, updateData)
        console.log('✅ Signal notification marked as read successfully in Firestore')
      } else {
        // For other notification types, mark as read
        console.log('🔔 Updating notification with read: true')
        const updateData = { 
          read: true,
          updatedAt: Timestamp.now()
        }
        console.log('🔔 Update data:', updateData)
        
        await updateDoc(notificationRef, updateData)
        console.log('✅ Notification marked as read successfully in Firestore')
      }
      
      // Verify the update by reading the document again
      const updatedDoc = await getDoc(notificationRef)
      if (updatedDoc.exists()) {
        console.log('✅ Verification - Updated document data:', updatedDoc.data())
      } else {
        console.error('❌ Verification failed - Document no longer exists after update')
      }
      
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  // Mark multiple notifications as read (batched)
  static async markMultipleAsRead(notifications: { id: string; type: string }[]): Promise<void> {
    try {
      const batch = writeBatch(db)
      
      for (const notification of notifications) {
        let collectionName: string
        
        switch (notification.type) {
          case 'user':
            collectionName = 'user_notifications'
            break
          case 'signal':
            collectionName = 'signalNotifications'
            break
          case 'admin':
            collectionName = 'adminNotifications'
            break
          case 'event':
            collectionName = 'eventNotifications'
            break
          default:
            continue
        }

        const notificationRef = doc(db, collectionName, notification.id)
        batch.update(notificationRef, { 
          read: true,
          updatedAt: Timestamp.now()
        })
      }

      await batch.commit()
    } catch (error) {
      console.error('Error marking multiple notifications as read:', error)
      throw error
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string, userRole: string): Promise<void> {
    try {
      console.log('🔔 markAllAsRead called:', { userId, userRole })
      
      const batch = writeBatch(db)
      let totalUpdates = 0
      
      // Mark user notifications as read (limited to 20 most recent)
      console.log('🔔 Fetching unread user notifications...')
      const userNotificationsQuery = query(
        collection(db, 'user_notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
      const userSnapshot = await getDocs(userNotificationsQuery)
      console.log('🔔 Found', userSnapshot.docs.length, 'unread user notifications')
      
      userSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          read: true,
          updatedAt: Timestamp.now()
        })
        totalUpdates++
      })

      // Mark signal notifications as read (add user to readBy, limited to 20)
      if (userRole === 'admin' || userRole === 'vip' || userRole === 'guest') {
        console.log('🔔 Fetching signal notifications not read by user...')
        const signalNotificationsQuery = query(
          collection(db, 'signalNotifications'),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
        const signalSnapshot = await getDocs(signalNotificationsQuery)
        
        // Filter in memory for unread by this user
        const unreadSignals = signalSnapshot.docs.filter(doc => {
          const readBy = doc.data().readBy || []
          return !readBy.includes(userId)
        })
        
        console.log('🔔 Found', unreadSignals.length, 'signal notifications not read by user')
        
        // Add signal notifications to batch using arrayUnion
        unreadSignals.forEach(doc => {
          batch.update(doc.ref, {
            readBy: arrayUnion(userId),
            updatedAt: Timestamp.now()
          })
          totalUpdates++
        })
        console.log('🔔 Added', unreadSignals.length, 'signal notifications to batch')
      }

      console.log('🔔 Total updates to commit:', totalUpdates)
      
      if (totalUpdates > 0) {
        await batch.commit()
        console.log('✅ Successfully committed', totalUpdates, 'updates to Firestore')
        
        // Invalidate notification stats cache
        cacheManager.invalidatePattern(`notificationStats:${userId}`)
      } else {
        console.log('ℹ️ No notifications to mark as read')
      }
      
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  // Get notification statistics (with caching)
  static async getNotificationStats(userId: string, userRole: string): Promise<NotificationStats> {
    try {
      // Check cache first
      const cacheKey = `notificationStats:${userId}:${userRole}`
      const cached = cacheManager.getTyped<NotificationStats>('notificationStats', cacheKey)
      
      if (cached) {
        console.log('📊 Using cached notification stats')
        return cached
      }

      console.log('📊 Fetching notification stats from Firestore')
      
      // Reduced limit from 1000 to 100 to save reads
      const { notifications } = await this.getNotifications(userId, userRole, {}, { limit: 100, orderBy: 'createdAt', orderDirection: 'desc' })
      
      const unread = notifications.filter(n => !n.read).length
      const byType: Record<string, number> = {}
      
      notifications.forEach(notification => {
        byType[notification.type] = (byType[notification.type] || 0) + 1
      })

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      const notificationsToday = notifications.filter(n => 
        getDateFromTimestamp(n.createdAt) >= today
      ).length

      const notificationsThisWeek = notifications.filter(n => 
        getDateFromTimestamp(n.createdAt) >= weekAgo
      ).length

      const lastNotification = notifications.length > 0 ? getDateFromTimestamp(notifications[0].createdAt) : undefined

      const stats = {
        total: notifications.length,
        unread,
        byType,
        recentActivity: {
          lastNotification,
          notificationsToday,
          notificationsThisWeek
        }
      }

      // Cache the stats
      cacheManager.setTyped('notificationStats', cacheKey, stats)

      return stats
    } catch (error) {
      console.error('Error getting notification stats:', error)
      throw error
    }
  }

  // Set up real-time listener for notifications
  static subscribeToNotifications(
    userId: string,
    userRole: string,
    callback: (notifications: Notification[]) => void,
    filters: NotificationFilters = {}
  ): Unsubscribe {
    console.log('📡 Setting up notification subscriptions:', { userId, userRole, filters })
    
    const unsubscribes: Unsubscribe[] = []
    
    // Shared state to hold notifications from all listeners
    let userNotifications: UserNotification[] = []
    let signalNotifications: SignalNotification[] = []
    let adminNotifications: AdminNotification[] = []
    let eventNotifications: EventNotification[] = []

    // Helper function to combine and trigger callback
    const triggerCallback = () => {
      console.log('📡 triggerCallback: Combining notifications', {
        userNotifications: userNotifications.length,
        signalNotifications: signalNotifications.length,
        adminNotifications: adminNotifications.length,
        eventNotifications: eventNotifications.length
      })
      this.combineAndCallback(
        userNotifications,
        signalNotifications,
        adminNotifications,
        eventNotifications,
        callback
      )
    }

    // User notifications listener (reduced from 50 to 20 documents)
    const userNotificationsRef = collection(db, 'user_notifications')
    let userQuery = query(
      userNotificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    )

    if (filters.type) {
      userQuery = query(userQuery, where('type', '==', filters.type))
    }

    const userUnsubscribe = onSnapshot(
      userQuery,
      (snapshot) => {
        try {
          console.log('📡 User notifications listener fired:', snapshot.docs.length, 'docs')
          userNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as UserNotification))
          console.log('📡 User notifications processed:', userNotifications.length)
          triggerCallback()
        } catch (error) {
          console.error('📡 Error processing user notifications:', error)
        }
      },
      (error) => {
        console.error('📡 Error in user notifications listener:', error)
      }
    )

    unsubscribes.push(userUnsubscribe)

    // Signal notifications listener (only for non-admin users, reduced from 50 to 20)
    if (userRole === 'vip' || userRole === 'guest') {
      const signalNotificationsRef = collection(db, 'signalNotifications')
      const signalQuery = query(
        signalNotificationsRef,
        orderBy('createdAt', 'desc'),
        limit(20)
      )

      const signalUnsubscribe = onSnapshot(
        signalQuery,
        (snapshot) => {
          try {
            console.log('📡 Signal notifications listener fired:', snapshot.docs.length, 'docs')
            const allSignalNotifications = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as SignalNotification))

            // Filter based on user role
            signalNotifications = allSignalNotifications.filter(notification => {
              if (notification.sentTo === 'all') return true
              if (notification.sentTo === 'vip' && userRole === 'vip') return true
              if (notification.sentTo === 'free' && userRole === 'guest') return true
              return false
            })
            console.log('📡 Signal notifications processed:', signalNotifications.length, 'after filtering')
            triggerCallback()
          } catch (error) {
            console.error('📡 Error processing signal notifications:', error)
          }
        },
        (error) => {
          console.error('📡 Error in signal notifications listener:', error)
        }
      )

      unsubscribes.push(signalUnsubscribe)
    }

    // Admin notifications listener (only for admin users, reduced from 50 to 20)
    if (userRole === 'admin') {
      const adminNotificationsRef = collection(db, 'adminNotifications')
      const adminQuery = query(
        adminNotificationsRef,
        orderBy('createdAt', 'desc'),
        limit(20)
      )

      const adminUnsubscribe = onSnapshot(
        adminQuery,
        (snapshot) => {
          try {
            console.log('📡 Admin notifications listener fired:', snapshot.docs.length, 'docs')
            adminNotifications = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as AdminNotification))
            console.log('📡 Admin notifications processed:', adminNotifications.length)
            triggerCallback()
          } catch (error) {
            console.error('📡 Error processing admin notifications:', error)
          }
        },
        (error) => {
          console.error('📡 Error in admin notifications listener:', error)
        }
      )

      unsubscribes.push(adminUnsubscribe)
    }

    // Event notifications listener (only for admin users, reduced from 50 to 20)
    if (userRole === 'admin') {
      const eventNotificationsRef = collection(db, 'eventNotifications')
      const eventQuery = query(
        eventNotificationsRef,
        orderBy('createdAt', 'desc'),
        limit(20)
      )

      const eventUnsubscribe = onSnapshot(
        eventQuery,
        (snapshot) => {
          try {
            console.log('📡 Event notifications listener fired:', snapshot.docs.length, 'docs')
            eventNotifications = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as EventNotification))
            console.log('📡 Event notifications processed:', eventNotifications.length)
            triggerCallback()
          } catch (error) {
            console.error('📡 Error processing event notifications:', error)
          }
        },
        (error) => {
          console.error('📡 Error in event notifications listener:', error)
        }
      )

      unsubscribes.push(eventUnsubscribe)
    }

    // Return cleanup function
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
    }
  }

  private static combineAndCallback(
    userNotifications: UserNotification[],
    signalNotifications: SignalNotification[],
    adminNotifications: AdminNotification[],
    eventNotifications: EventNotification[],
    callback: (notifications: Notification[]) => void
  ) {
    const allNotifications = [
      ...userNotifications,
      ...signalNotifications,
      ...adminNotifications,
      ...eventNotifications
    ]

    // Sort by createdAt
    allNotifications.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt))

    callback(allNotifications)
  }

  // Delete notification
  static async deleteNotification(notificationId: string, notificationType: string): Promise<void> {
    try {
      let collectionName: string
      
      switch (notificationType) {
        case 'user':
          collectionName = 'user_notifications'
          break
        case 'signal':
          collectionName = 'signalNotifications'
          break
        case 'admin':
          collectionName = 'adminNotifications'
          break
        case 'event':
          collectionName = 'eventNotifications'
          break
        default:
          throw new Error(`Unknown notification type: ${notificationType}`)
      }

      const notificationRef = doc(db, collectionName, notificationId)
      await updateDoc(notificationRef, { 
        deleted: true,
        deletedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }

  // Clean up old notifications
  static async cleanupOldNotifications(daysOld: number = 30): Promise<void> {
    try {
      console.log(`🧹 Starting notification cleanup for notifications older than ${daysOld} days`)
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate)

      // Clean up each collection
      const collections = [
        'user_notifications',
        'signalNotifications', 
        'adminNotifications',
        'eventNotifications'
      ]

      let totalDeleted = 0

      for (const collectionName of collections) {
        console.log(`🧹 Cleaning up ${collectionName}...`)
        
        const q = query(
          collection(db, collectionName),
          where('createdAt', '<', cutoffTimestamp),
          where('read', '==', true)
        )
        
        const snapshot = await getDocs(q)
        
        if (snapshot.docs.length > 0) {
          const batch = writeBatch(db)
          
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
          })
          
          await batch.commit()
          totalDeleted += snapshot.docs.length
          console.log(`🧹 Deleted ${snapshot.docs.length} old notifications from ${collectionName}`)
        } else {
          console.log(`🧹 No old notifications found in ${collectionName}`)
        }
      }

      console.log(`🧹 Cleanup completed. Total deleted: ${totalDeleted} notifications`)
    } catch (error) {
      console.error('🧹 Error during notification cleanup:', error)
      throw error
    }
  }
}
