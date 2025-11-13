import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from './firebaseConfig'

export interface CreateUserNotification {
  userId: string
  type: 'welcome' | 'promotion' | 'announcement' | 'system' | 'vip_approved' | 'payment_reminder' | 'event'
  title: string
  message: string
  data?: {
    promotionId?: string
    eventId?: string
    actionUrl?: string
    soundType?: 'default' | 'success' | 'warning' | 'info' | 'vip_approved' | 'promotion'
  }
}

export class UserNotificationService {
  // Create a new notification for a user
  static async createNotification(notification: CreateUserNotification) {
    try {
      // Clean the data object to remove undefined values
      const cleanData = notification.data ? Object.fromEntries(
        Object.entries(notification.data).filter(([_, value]) => value !== undefined)
      ) : undefined

      const notificationData = {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: false,
        createdAt: Timestamp.now(),
        ...(cleanData && { data: cleanData })
      }

      console.log('Creating notification with data:', notificationData)

      const docRef = await addDoc(collection(db, 'user_notifications'), notificationData)
      return docRef.id
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Create welcome notification for new VIP users
  static async createWelcomeNotification(userId: string, userName: string) {
    return UserNotificationService.createNotification({
      userId,
      type: 'welcome',
      title: 'Welcome to RedemptionFX!',
      message: `Welcome ${userName}! You now have access to our VIP trading signals and exclusive features.`,
      data: {
        soundType: 'success',
        actionUrl: '/dashboard'
      }
    })
  }

  // Create VIP approval notification
  static async createVIPApprovalNotification(userId: string, userName: string) {
    return UserNotificationService.createNotification({
      userId,
      type: 'vip_approved',
      title: 'VIP Access Approved!',
      message: `Congratulations ${userName}! Your VIP membership has been approved. You now have access to live signals and exclusive features.`,
      data: {
        soundType: 'vip_approved',
        actionUrl: '/dashboard/signals'
      }
    })
  }

  // Create promotion notification
  static async createPromotionNotification(userId: string, promotion: any) {
    return UserNotificationService.createNotification({
      userId,
      type: 'promotion',
      title: 'New Promotion Available!',
      message: promotion.description || `Check out our latest promotion: ${promotion.title}`,
      data: {
        promotionId: promotion.id,
        soundType: 'promotion',
        actionUrl: '/dashboard'
      }
    })
  }

  // Create announcement notification
  static async createAnnouncementNotification(userId: string, title: string, message: string, actionUrl?: string) {
    return UserNotificationService.createNotification({
      userId,
      type: 'announcement',
      title,
      message,
      data: {
        soundType: 'info',
        actionUrl
      }
    })
  }

  // Create payment reminder notification
  static async createPaymentReminderNotification(userId: string, daysUntilExpiry: number) {
    return UserNotificationService.createNotification({
      userId,
      type: 'payment_reminder',
      title: 'Payment Reminder',
      message: `Your VIP subscription expires in ${daysUntilExpiry} days. Please renew to continue enjoying our services.`,
      data: {
        soundType: 'warning',
        actionUrl: '/upgrade'
      }
    })
  }

  // Create system notification
  static async createSystemNotification(userId: string, title: string, message: string) {
    return UserNotificationService.createNotification({
      userId,
      type: 'system',
      title,
      message,
      data: {
        soundType: 'default'
      }
    })
  }

  // Send notification to all VIP users
  static async notifyAllVIPUsers(notification: Omit<CreateUserNotification, 'userId'>) {
    try {
      // Get all VIP users
      const usersRef = collection(db, 'users')
      const vipQuery = query(usersRef, where('role', '==', 'vip'))
      const vipSnapshot = await getDocs(vipQuery)
      
      const promises = vipSnapshot.docs.map(doc => 
        UserNotificationService.createNotification({
          ...notification,
          userId: doc.id
        })
      )
      
      await Promise.all(promises)
      return vipSnapshot.docs.length
    } catch (error) {
      console.error('Error notifying all VIP users:', error)
      throw error
    }
  }

  // Send notification to all users
  static async notifyAllUsers(notification: Omit<CreateUserNotification, 'userId'>) {
    try {
      // Get all users (excluding admin users)
      const usersRef = collection(db, 'users')
      const usersSnapshot = await getDocs(usersRef)
      
      // Filter out admin users and only send to VIP and Guest users
      const nonAdminUsers = usersSnapshot.docs.filter(doc => {
        const userData = doc.data()
        return userData.role === 'vip' || userData.role === 'guest'
      })
      
      console.log(`Found ${nonAdminUsers.length} non-admin users to notify`)
      
      const promises = nonAdminUsers.map(doc => 
        UserNotificationService.createNotification({
          ...notification,
          userId: doc.id
        })
      )
      
      await Promise.all(promises)
      return nonAdminUsers.length
    } catch (error) {
      console.error('Error notifying all users:', error)
      throw error
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
    try {
      const notificationRef = doc(db, 'user_notifications', notificationId)
      await updateDoc(notificationRef, {
        read: true
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string) {
    try {
      const notificationsRef = collection(db, 'user_notifications')
      const userNotificationsQuery = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      )
      
      const snapshot = await getDocs(userNotificationsQuery)
      const promises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      )
      
      await Promise.all(promises)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }
}
