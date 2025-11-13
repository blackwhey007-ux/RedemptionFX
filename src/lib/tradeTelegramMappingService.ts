/**
 * Trade-Telegram Mapping Service
 * Stores and retrieves Telegram message IDs for MT5 positions
 */

import { db } from './firebaseConfig'
import { collection, addDoc, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore'

export interface TradeTelegramMapping {
  positionId: string
  telegramMessageId: number
  telegramChatId: string
  updateMessageIds?: number[] // Array of update notification message IDs
  createdAt: Date
  lastUpdated: Date
}

/**
 * Save Telegram message ID for a position
 */
export async function saveTelegramMapping(
  positionId: string,
  messageId: number,
  chatId: string
): Promise<{ existed: boolean }> {
  try {
    // Check if mapping already exists
    const existingMapping = await getTelegramMapping(positionId)
    
    if (existingMapping) {
      // Update existing mapping
      const mappingRef = doc(db, 'trade_telegram_mappings', positionId)
      await updateDoc(mappingRef, {
        telegramMessageId: messageId,
        telegramChatId: chatId,
        lastUpdated: Timestamp.now()
      })
      console.log('📝 Updated Telegram mapping for position:', positionId)
      return { existed: true }
    } else {
      // Create new mapping
      await addDoc(collection(db, 'trade_telegram_mappings'), {
        positionId,
        telegramMessageId: messageId,
        telegramChatId: chatId,
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now()
      })
      console.log('✅ Saved Telegram mapping for position:', positionId)
      return { existed: false }
    }
  } catch (error) {
    console.error('Error saving Telegram mapping:', error)
    throw error
  }
}

/**
 * Get Telegram message ID for a position
 */
export async function getTelegramMapping(
  positionId: string
): Promise<TradeTelegramMapping | null> {
  try {
    const q = query(
      collection(db, 'trade_telegram_mappings'),
      where('positionId', '==', positionId)
    )
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0]
    const data = doc.data()
    
    return {
      positionId: data.positionId,
      telegramMessageId: data.telegramMessageId,
      telegramChatId: data.telegramChatId,
      createdAt: data.createdAt?.toDate(),
      lastUpdated: data.lastUpdated?.toDate()
    } as TradeTelegramMapping
  } catch (error) {
    console.error('Error getting Telegram mapping:', error)
    return null
  }
}

/**
 * Append an update notification message ID to an existing mapping
 */
export async function addUpdateMessageId(
  positionId: string,
  updateMessageId: number
): Promise<void> {
  try {
    // Find the mapping document
    const q = query(
      collection(db, 'trade_telegram_mappings'),
      where('positionId', '==', positionId)
    )
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'trade_telegram_mappings', querySnapshot.docs[0].id)
      const existingData = querySnapshot.docs[0].data()
      const currentUpdateIds = existingData.updateMessageIds || []
      
      await updateDoc(docRef, {
        updateMessageIds: [...currentUpdateIds, updateMessageId],
        lastUpdated: Timestamp.now()
      })
      console.log('📝 Added update message ID to mapping:', positionId, updateMessageId)
    }
  } catch (error) {
    console.error('Error adding update message ID:', error)
    throw error
  }
}

/**
 * Delete Telegram mapping for a position
 */
export async function deleteTelegramMapping(positionId: string): Promise<void> {
  try {
    // Find the document by positionId
    const q = query(
      collection(db, 'trade_telegram_mappings'),
      where('positionId', '==', positionId)
    )
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'trade_telegram_mappings', querySnapshot.docs[0].id)
      await updateDoc(docRef, {
        deletedAt: Timestamp.now()
      })
      console.log('🗑️ Deleted Telegram mapping for position:', positionId)
    }
  } catch (error) {
    console.error('Error deleting Telegram mapping:', error)
    throw error
  }
}

