import { db } from './firestore'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, limit, Timestamp, getDoc } from 'firebase/firestore'
import { Signal, SignalNotification } from '@/types/signal'
import { addStreamingLog } from './streamingLogService'

// CRITICAL: Safe utility function for signal result calculations
// DO NOT modify without testing VIP results page
// Used in: app/dashboard/vip-results/page.tsx
export const safeGetSignalResult = (signal: Signal): number => {
  if (!signal) return 0
  if (signal.result === undefined || signal.result === null) return 0
  if (typeof signal.result !== 'number') return 0
  if (isNaN(signal.result)) return 0
  return signal.result
}

// Create a new signal
export const createSignal = async (signalData: Omit<Signal, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => {
  const maxRetries = 3
  let attempt = 0
  
  while (attempt < maxRetries) {
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
    
    // Create enhanced notification for the signal with detailed information
    const signalType = signalData.type === 'BUY' ? '📈 BUY' : '📉 SELL'
    const signalEmoji = signalData.category === 'vip' ? '👑' : '🔔'
    
    const enhancedMessage = `${signalEmoji} New ${signalData.category.toUpperCase()} Signal: ${signalData.pair}
${signalType} @ ${signalData.entryPrice}
🛑 SL: ${signalData.stopLoss} | 🎯 TP: ${signalData.takeProfit1}${signalData.takeProfit2 ? ` | TP2: ${signalData.takeProfit2}` : ''}`

    // Clean signal data to remove undefined values (Firestore doesn't accept undefined)
    const cleanSignalData: any = {
      pair: signalData.pair,
      type: signalData.type,
      entryPrice: signalData.entryPrice,
      stopLoss: signalData.stopLoss,
      takeProfit1: signalData.takeProfit1
    }
    
    // Only add optional fields if they have values
    if (signalData.takeProfit2 !== undefined) cleanSignalData.takeProfit2 = signalData.takeProfit2
    if (signalData.description !== undefined && signalData.description !== '') cleanSignalData.description = signalData.description
    if (signalData.notes !== undefined && signalData.notes !== '') cleanSignalData.notes = signalData.notes

    const notificationData = {
      signalId: docRef.id,
      signalTitle: signalData.title,
      signalCategory: signalData.category,
      message: enhancedMessage,
      sentTo: signalData.category === 'free' ? 'all' as const : 'vip' as const,
      // Add detailed signal data for programmatic access
      signalData: cleanSignalData
    }
      console.log('Creating enhanced signal notification:', notificationData)
      
      // Try to create notification, but don't fail if quota is exceeded
      try {
        await createSignalNotification(notificationData)
      } catch (notificationError: any) {
        // If quota exceeded, skip notification creation
        if (notificationError?.code === 'resource-exhausted' || 
            notificationError?.message?.includes('RESOURCE_EXHAUSTED') ||
            notificationError?.message?.includes('Quota exceeded')) {
          console.warn('⚠️ Firestore quota exceeded - skipping notification creation')
        } else {
          // Re-throw other errors
          throw notificationError
        }
      }
      
      // NOTE: Telegram notifications are ONLY sent by the Open Trades streaming service (MT5 auto-detection)
      // Manual signals created from Signal Management page do NOT send Telegram notifications
      console.log('✅ Signal created - Telegram notifications disabled for manual signals')
      
      return { id: docRef.id, ...signal }
    } catch (error: any) {
      attempt++
      
      // Check for Firestore quota exceeded error
      const isQuotaError = 
        error?.code === 'resource-exhausted' ||
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('Quota exceeded')
      
      if (isQuotaError) {
        if (attempt < maxRetries) {
          // Exponential backoff: wait 2^attempt seconds
          const delay = Math.pow(2, attempt) * 1000
          console.warn(`⚠️ Firestore quota exceeded, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue // Retry
        } else {
          // Max retries reached
          console.error('❌ Firestore quota exceeded after all retries')
          throw new Error('Firestore quota exceeded. Please check your Firebase billing or wait for quota reset.')
        }
      }
      
      // For non-quota errors, throw immediately
      console.error('Error creating signal:', error)
      throw error
    }
  }
  
  // Should never reach here, but just in case
  throw new Error('Failed to create signal after all retries')
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

// CRITICAL: Update signal status and send Telegram notification
// DO NOT modify without testing Telegram integration
// Used in: Admin signals page status updates
export const updateSignalStatus = async (signalId: string, status: Signal['status'], result?: number, closePrice?: number) => {
  try {
    console.log('Updating signal status:', { signalId, status, result, closePrice })
    
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
    
    // Get signal BEFORE updating to capture old status
    const signalDocBefore = await getDoc(signalRef)
    const oldSignal = signalDocBefore.exists() ? { id: signalDocBefore.id, ...signalDocBefore.data() } as Signal : null
    
    await updateDoc(signalRef, updateData)
    console.log('Signal status updated in Firestore:', updateData)

    // Get signal data for Telegram update (after update)
    const signalDoc = await getDoc(signalRef)
    if (signalDoc.exists()) {
      const signal = { id: signalDoc.id, ...signalDoc.data() } as Signal
      
      console.log('Signal data for Telegram update:', {
        id: signal.id,
        category: signal.category,
        sentToTelegram: signal.sentToTelegram,
        telegramMessageId: signal.telegramMessageId,
        status: signal.status,
        result: signal.result
      })
      
      // NOTE: Telegram status updates are ONLY sent by the Open Trades streaming service (MT5 auto-detection)
      // Manual status changes from Signal Management page do NOT send Telegram notifications
      console.log('✅ Signal status updated - Telegram notifications disabled for manual status changes')
    } else {
      console.error('Signal document not found after update:', signalId)
    }
  } catch (error) {
    console.error('Error updating signal status:', error)
    throw error
  }
}

// Update signal fields (TP/SL/etc)
export const updateSignal = async (
  signalId: string,
  updateData: Partial<Pick<Signal, 'stopLoss' | 'takeProfit1' | 'takeProfit2' | 'takeProfit3' | 'entryPrice' | 'notes' | 'description'>>
): Promise<Signal> => {
  try {
    console.log('Updating signal:', signalId, updateData)
    
    const signalRef = doc(db, 'signals', signalId)
    
    // Get current signal data to compare values
    const signalDoc = await getDoc(signalRef)
    if (!signalDoc.exists()) {
      throw new Error('Signal not found')
    }
    
    const currentSignal = { id: signalDoc.id, ...signalDoc.data() } as Signal
    
    // Detect if TP/SL changed
    const tpChanged = updateData.takeProfit1 !== undefined && updateData.takeProfit1 !== currentSignal.takeProfit1
    const slChanged = updateData.stopLoss !== undefined && updateData.stopLoss !== currentSignal.stopLoss
    const entryChanged = updateData.entryPrice !== undefined && updateData.entryPrice !== currentSignal.entryPrice
    
    // Prepare update data
    const firestoreUpdate: any = {
      ...updateData,
      updatedAt: Timestamp.now()
    }
    
    // Remove undefined values
    Object.keys(firestoreUpdate).forEach(key => {
      if (firestoreUpdate[key] === undefined) {
        delete firestoreUpdate[key]
      }
    })
    
    // Update Firestore
    await updateDoc(signalRef, firestoreUpdate)
    console.log('Signal updated in Firestore:', firestoreUpdate)
    
    // Get updated signal
    const updatedDoc = await getDoc(signalRef)
    const updatedSignal = { id: updatedDoc.id, ...updatedDoc.data() } as Signal
    
    // Log TP/SL/Entry changes to streaming logs (always, not just when Telegram is updated)
    if (tpChanged || slChanged || entryChanged) {
      try {
        console.log('[SIGNAL_UPDATE] Logging TP/SL change:', {
          signalId: updatedSignal.id,
          pair: updatedSignal.pair,
          tpChanged,
          slChanged,
          entryChanged
        })
        
        await addStreamingLog({
          type: 'signal_updated',
          message: `Signal TP/SL updated: ${updatedSignal.pair} ${updatedSignal.type}`,
          signalId: updatedSignal.id,
          success: true,
          details: {
            pair: updatedSignal.pair,
            category: updatedSignal.category,
            tpChanged,
            slChanged,
            entryChanged,
            oldTP: currentSignal.takeProfit1,
            newTP: updateData.takeProfit1 !== undefined ? updateData.takeProfit1 : currentSignal.takeProfit1,
            oldSL: currentSignal.stopLoss,
            newSL: updateData.stopLoss !== undefined ? updateData.stopLoss : currentSignal.stopLoss,
            oldEntry: currentSignal.entryPrice,
            newEntry: updateData.entryPrice !== undefined ? updateData.entryPrice : currentSignal.entryPrice,
            source: 'admin_edit' // or 'mt5_auto' when from MT5
          }
        })
        
        console.log('[SIGNAL_UPDATE] ✅ Log written successfully')
      } catch (logError) {
        console.error('[SIGNAL_UPDATE] ❌ Error logging TP/SL change:', logError)
        // Don't fail the update if logging fails, but log the error
      }
    }
    
    // NOTE: Telegram message updates for TP/SL changes are ONLY sent by the Open Trades streaming service (MT5 auto-detection)
    // Manual TP/SL edits from Signal Management page do NOT send Telegram notifications
    console.log('✅ Signal updated - Telegram notifications disabled for manual TP/SL edits')
    
    return updatedSignal
  } catch (error) {
    console.error('Error updating signal:', error)
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
