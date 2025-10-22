import { db } from './firestore'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore'
import { Trade } from '@/types/trade'

// Create a new trade
export const createTrade = async (tradeData: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    console.log('Creating trade with data:', tradeData)
    
    // Remove any empty id field from tradeData to avoid conflicts
    const { id, ...cleanTradeData } = tradeData as any
    
    // Remove undefined fields to prevent Firebase errors
    const sanitizedTradeData = Object.fromEntries(
      Object.entries(cleanTradeData).filter(([key, value]) => value !== undefined)
    )
    
    const trade = {
      ...sanitizedTradeData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    
    console.log('Trade object to save:', trade)
    
    // Validate required fields
    if (!trade.pair || !trade.profileId || !trade.userId) {
      throw new Error('Missing required fields: pair, profileId, or userId')
    }
    
    // Check for invalid values
    if (typeof trade.entryPrice !== 'number' || typeof trade.exitPrice !== 'number') {
      throw new Error('Entry and exit prices must be numbers')
    }
    
    const docRef = await addDoc(collection(db, 'trades'), trade)
    console.log('Trade saved with ID:', docRef.id)
    
    // Return the trade with the Firestore-generated ID
    return { ...trade, id: docRef.id }
  } catch (error) {
    console.error('Error creating trade:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    })
    throw error
  }
}

// Get trades by profile ID
export const getTradesByProfile = async (profileId: string, limitCount: number = 100) => {
  try {
    console.log(`Fetching trades for profile: ${profileId}`)
    const q = query(
      collection(db, 'trades'),
      where('profileId', '==', profileId)
    )
    
    const querySnapshot = await getDocs(q)
    console.log(`Found ${querySnapshot.docs.length} trades for profile ${profileId}`)
    
    const trades = querySnapshot.docs.map(doc => {
      const data = doc.data()
      console.log(`TradeService: Processing document ${doc.id} with data:`, data)
      
      const trade = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Trade
      
      // Validate the trade object - check if we have a valid document ID
      if (!doc.id || doc.id.trim() === '') {
        console.warn('TradeService: Document has no valid ID, skipping:', doc.id)
        return null // Return null for invalid documents
      }
      
      // Debug: Log the status of each trade
      console.log(`TradeService: Trade ${trade.id} has status: ${trade.status}, pips: ${trade.pips}, profit: ${trade.profit}, result: ${trade.result}`)
      
      return trade
    })
    
    // Filter out null values (invalid trades)
    const validTrades = trades.filter(trade => trade !== null) as Trade[]
    
    // Sort by createdAt in descending order (newest first) and limit
    return validTrades
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })
      .slice(0, limitCount)
  } catch (error) {
    console.error('Error getting trades by profile:', error)
    throw error
  }
}

// Get trades by user ID
export const getTradesByUser = async (userId: string, limitCount: number = 100) => {
  try {
    console.log(`Fetching trades for user: ${userId}`)
    const q = query(
      collection(db, 'trades'),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    console.log(`Found ${querySnapshot.docs.length} trades for user ${userId}`)
    
    const trades = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Trade[]
    
    // Sort by createdAt in descending order (newest first) and limit
    return trades
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })
      .slice(0, limitCount)
  } catch (error) {
    console.error('Error getting trades by user:', error)
    throw error
  }
}

// Get all trades (admin only)
export const getAllTrades = async (limitCount: number = 200) => {
  try {
    console.log('Fetching all trades')
    const q = query(
      collection(db, 'trades')
    )
    
    const querySnapshot = await getDocs(q)
    console.log(`Found ${querySnapshot.docs.length} total trades`)
    
    const trades = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Trade[]
    
    // Sort by createdAt in descending order (newest first) and limit
    return trades
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })
      .slice(0, limitCount)
  } catch (error) {
    console.error('Error getting all trades:', error)
    throw error
  }
}

// Update a trade
export const updateTrade = async (tradeId: string, tradeData: Partial<Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>>) => {
  try {
    console.log(`Updating trade ${tradeId} with data:`, tradeData)
    console.log(`TradeService: Status being saved: ${tradeData.status}, pips: ${tradeData.pips}, profit: ${tradeData.profit}, result: ${tradeData.result}`)
    const tradeRef = doc(db, 'trades', tradeId)
    
    // Remove undefined fields to prevent Firebase errors
    const sanitizedUpdateData = Object.fromEntries(
      Object.entries(tradeData).filter(([key, value]) => value !== undefined)
    )
    
    const updateData = {
      ...sanitizedUpdateData,
      updatedAt: Timestamp.now()
    }
    
    await updateDoc(tradeRef, updateData)
    console.log(`Trade ${tradeId} updated successfully`)
    console.log(`TradeService: Final update data saved:`, updateData)
    
    return { id: tradeId, ...updateData }
  } catch (error) {
    console.error('Error updating trade:', error)
    throw error
  }
}

// Delete a trade
export const deleteTrade = async (tradeId: string) => {
  try {
    console.log(`Deleting trade ${tradeId}`)
    const tradeRef = doc(db, 'trades', tradeId)
    await deleteDoc(tradeRef)
    console.log(`Trade ${tradeId} deleted successfully`)
  } catch (error) {
    console.error('Error deleting trade:', error)
    throw error
  }
}

// Get trade statistics for a profile
export const getTradeStats = async (profileId: string) => {
  try {
    const trades = await getTradesByProfile(profileId)
    
    const stats = {
      totalTrades: trades.length,
      winningTrades: trades.filter(trade => trade.result && trade.result > 0).length,
      losingTrades: trades.filter(trade => trade.result && trade.result < 0).length,
      totalPips: trades.reduce((sum, trade) => sum + (trade.result || 0), 0),
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      bestTrade: 0,
      worstTrade: 0
    }
    
    if (stats.totalTrades > 0) {
      stats.winRate = (stats.winningTrades / stats.totalTrades) * 100
      
      const winningTrades = trades.filter(trade => trade.result && trade.result > 0)
      const losingTrades = trades.filter(trade => trade.result && trade.result < 0)
      
      if (winningTrades.length > 0) {
        stats.averageWin = winningTrades.reduce((sum, trade) => sum + (trade.result || 0), 0) / winningTrades.length
      }
      
      if (losingTrades.length > 0) {
        stats.averageLoss = losingTrades.reduce((sum, trade) => sum + (trade.result || 0), 0) / losingTrades.length
      }
      
      const results = trades.map(trade => trade.result || 0)
      stats.bestTrade = Math.max(...results)
      stats.worstTrade = Math.min(...results)
    }
    
    return stats
  } catch (error) {
    console.error('Error getting trade stats:', error)
    throw error
  }
}
