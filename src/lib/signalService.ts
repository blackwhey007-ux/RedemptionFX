import { db } from './firestore'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, limit, Timestamp, getDoc } from 'firebase/firestore'
import { Signal, SignalNotification } from '@/types/signal'
import { sendSignalToTelegram, updateSignalStatusInTelegram } from './telegramService'

// Create a new signal
export const createSignal = async (signalData: Omit<Signal, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => {
  try {
    console.log('Creating signal with data:', signalData)
    const signal = {
      ...signalData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true
    }
    
    console.log('Signal object to save:', signal)
    const docRef = await addDoc(collection(db, 'signals'), signal)
    console.log('Signal saved with ID:', docRef.id)
    
    // Create notification for the signal
    const notificationData = {
      signalId: docRef.id,
      signalTitle: signalData.title,
      signalCategory: signalData.category,
      message: `New ${signalData.category.toUpperCase()} signal: ${signalData.title}`,
      sentTo: signalData.category === 'free' ? 'all' as const : 'vip' as const
    }
    console.log('Creating notification:', notificationData)
    await createSignalNotification(notificationData)
    
    // Send to Telegram if configured
    try {
      console.log(`Sending ${signalData.category} signal to Telegram...`)
      const telegramResult = await sendSignalToTelegram({ id: docRef.id, ...signal })
      
      if (telegramResult.success) {
        console.log('Signal sent to Telegram successfully:', telegramResult.messageIds)
        // Update signal with Telegram info
        await updateDoc(docRef, {
          sentToTelegram: true,
          telegramSentAt: Timestamp.now(),
          telegramMessageId: telegramResult.messageIds[0] || null,
          telegramChatId: signalData.category === 'vip' ? 'vip_channel' : 'public_channel'
        })
      } else {
        console.warn('Failed to send signal to Telegram:', telegramResult.errors)
      }
    } catch (telegramError) {
      console.error('Error sending signal to Telegram:', telegramError)
      // Don't fail signal creation if Telegram fails
    }
    
    return { id: docRef.id, ...signal }
  } catch (error) {
    console.error('Error creating signal:', error)
    throw error
  }
}

// Get signals by category
export const getSignalsByCategory = async (category: 'free' | 'vip', limitCount: number = 50) => {
  try {
    console.log(`Fetching signals for category: ${category}`)
    // Temporary workaround: Get all signals and filter in memory
    const q = query(
      collection(db, 'signals'),
      orderBy('createdAt', 'desc'),
      limit(limitCount * 2) // Get more to account for filtering
    )
    
    const querySnapshot = await getDocs(q)
    console.log(`Found ${querySnapshot.docs.length} signals in database`)
    
    const signals = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        postedAt: doc.data().postedAt?.toDate()
      }))
      .filter(signal => (signal as any).isActive && (signal as any).category === category)
      .slice(0, limitCount) // Limit after filtering
    
    console.log(`After filtering for category ${category} and isActive, ${signals.length} signals remain`)
    return signals as Signal[]
  } catch (error) {
    console.error('Error getting signals:', error)
    throw error
  }
}

// Get all signals (admin only)
export const getAllSignals = async (limitCount: number = 100) => {
  try {
    const q = query(
      collection(db, 'signals'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        postedAt: doc.data().postedAt?.toDate()
      }))
      .filter(signal => (signal as any).isActive) as Signal[]
  } catch (error) {
    console.error('Error getting all signals:', error)
    throw error
  }
}

// Update signal status
export const updateSignalStatus = async (signalId: string, status: Signal['status'], result?: number, closePrice?: number) => {
  try {
    const signalRef = doc(db, 'signals', signalId)
    const updateData: any = {
      status,
      updatedAt: Timestamp.now()
    }
    
    // Only include result if it's provided
    if (result !== undefined) {
      updateData.result = result
    }
    
    // Store close price for close_now status
    if (closePrice !== undefined) {
      updateData.closePrice = closePrice
    }
    
    await updateDoc(signalRef, updateData)

    // Get signal data for Telegram update
    const signalDoc = await getDoc(signalRef)
    if (signalDoc.exists()) {
      const signal = { id: signalDoc.id, ...signalDoc.data() } as Signal
      
      // Only update Telegram if it's a VIP signal that was sent to Telegram
      if (signal.category === 'vip' && signal.sentToTelegram) {
        try {
          await updateSignalStatusInTelegram(signal, status)
        } catch (telegramError) {
          console.error('Error updating Telegram status:', telegramError)
          // Don't fail the status update if Telegram fails
        }
      }
    }
  } catch (error) {
    console.error('Error updating signal status:', error)
    throw error
  }
}

// Delete signal (admin only)
export const deleteSignal = async (signalId: string) => {
  try {
    await deleteDoc(doc(db, 'signals', signalId))
  } catch (error) {
    console.error('Error deleting signal:', error)
    throw error
  }
}

// Create signal notification
export const createSignalNotification = async (notificationData: Omit<SignalNotification, 'id' | 'createdAt' | 'readBy'>) => {
  try {
    console.log('Creating signal notification with data:', notificationData)
    const notification = {
      ...notificationData,
      createdAt: Timestamp.now(),
      readBy: []
    }
    
    console.log('Notification object to save:', notification)
    const docRef = await addDoc(collection(db, 'signalNotifications'), notification)
    console.log('Notification saved with ID:', docRef.id)
    return { id: docRef.id, ...notification }
  } catch (error) {
    console.error('Error creating signal notification:', error)
    throw error
  }
}

// Get signal notifications for user
export const getSignalNotifications = async (userId: string, limitCount: number = 20) => {
  try {
    const q = query(
      collection(db, 'signalNotifications'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as SignalNotification[]
  } catch (error) {
    console.error('Error getting signal notifications:', error)
    throw error
  }
}

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  try {
    const notificationRef = doc(db, 'signalNotifications', notificationId)
    const notification = await getDocs(query(collection(db, 'signalNotifications'), where('__name__', '==', notificationId)))
    
    if (!notification.empty) {
      const currentData = notification.docs[0].data()
      const readBy = currentData.readBy || []
      
      if (!readBy.includes(userId)) {
        await updateDoc(notificationRef, {
          readBy: [...readBy, userId]
        })
      }
    }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}
