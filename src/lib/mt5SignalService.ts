import { getMT5Positions } from './mt5VipService'
import { createSignal, updateSignalStatus, updateSignal } from './signalService'
import { db } from './firebaseConfig'
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, Timestamp, runTransaction, setDoc } from 'firebase/firestore'
import { Signal } from '@/types/signal'
import { MT5Position } from '@/types/mt5'
import { calculatePips } from './currencyDatabase'
import { addStreamingLog } from './streamingLogService'

interface PositionSignalMapping {
  id?: string
  positionId: string // MT5 position ticket/ID
  signalId: string // Our signal ID in Firestore
  pair: string
  createdAt: Date
  updatedAt: Date
  lastKnownProfit?: number // Store profit when position was last seen
  closedAt?: Date // When position was detected as closed
}

/**
 * Get signal mapping for a position
 */
export async function getSignalMappingByPosition(positionId: string): Promise<PositionSignalMapping | null> {
  try {
    const q = query(
      collection(db, 'mt5_signal_mappings'),
      where('positionId', '==', positionId)
    )
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0]
    const data = doc.data()
    
    return {
      id: doc.id,
      positionId: data.positionId,
      signalId: data.signalId,
      pair: data.pair,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastKnownProfit: data.lastKnownProfit,
      closedAt: data.closedAt?.toDate()
    }
  } catch (error) {
    console.error('Error getting signal mapping:', error)
    return null
  }
}

/**
 * Save position-signal mapping
 */
/**
 * Acquire atomic lock for position processing (prevents duplicates)
 * This MUST be called BEFORE creating any signal
 */
async function acquireAtomicPositionLock(positionId: string, pair: string): Promise<{
  acquired: boolean
  existed: boolean
  existingSignalId?: string
}> {
  try {
    const lockRef = doc(db, 'mt5_signal_mappings', positionId.toString())
    
    const result = await runTransaction(db, async (transaction) => {
      const lockDoc = await transaction.get(lockRef)
      
      if (lockDoc.exists()) {
        // Lock already held by another event - this is a duplicate
        const data = lockDoc.data()
        console.log(`⚠️ [ATOMIC-LOCK] Position ${positionId} already locked by another event`)
        return {
          acquired: false,
          existed: true,
          existingSignalId: data.signalId === 'PENDING' ? undefined : data.signalId
        }
      }
      
      // Acquire lock by creating mapping with PENDING status
      transaction.set(lockRef, {
        positionId,
        signalId: 'PENDING', // Placeholder until signal is created
        pair,
        status: 'processing',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      console.log(`✅ [ATOMIC-LOCK] Acquired lock for position ${positionId}`)
      return {
        acquired: true,
        existed: false
      }
    })
    
    return result
  } catch (error) {
    console.error('Error acquiring position lock:', error)
    throw error
  }
}

/**
 * Update mapping with actual signal ID after signal is created
 */
async function updateMappingWithSignalId(positionId: string, signalId: string, profit?: number): Promise<void> {
  try {
    const mappingRef = doc(db, 'mt5_signal_mappings', positionId.toString())
    
    const updateData: any = {
      signalId,
      status: 'completed',
      updatedAt: Timestamp.now()
    }
    
    if (profit !== undefined) {
      updateData.lastKnownProfit = profit
    }
    
    await updateDoc(mappingRef, updateData)
    console.log(`✅ [ATOMIC-LOCK] Updated mapping with signal ID for position ${positionId}`)
  } catch (error) {
    console.error('Error updating mapping with signal ID:', error)
    throw error
  }
}

/**
 * Release lock if signal creation fails
 */
async function releaseLock(positionId: string): Promise<void> {
  try {
    const mappingRef = doc(db, 'mt5_signal_mappings', positionId.toString())
    await updateDoc(mappingRef, {
      status: 'failed',
      updatedAt: Timestamp.now()
    })
    console.log(`🔓 [ATOMIC-LOCK] Released lock for position ${positionId}`)
  } catch (error) {
    console.error('Error releasing lock:', error)
  }
}

/**
 * Get all active signal mappings
 */
async function getAllActiveSignalMappings(): Promise<PositionSignalMapping[]> {
  try {
    const q = query(collection(db, 'mt5_signal_mappings'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        positionId: data.positionId,
        signalId: data.signalId,
        pair: data.pair,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastKnownProfit: data.lastKnownProfit,
        closedAt: data.closedAt?.toDate()
      }
    })
  } catch (error) {
    console.error('Error getting active signal mappings:', error)
    return []
  }
}

/**
 * Convert MT5 position to signal format
 * Note: SL/TP may need to be retrieved from orders or calculated
 */
function convertMT5PositionToSignal(
  position: any,
  category: 'free' | 'vip' = 'vip',
  createdBy: string = 'system',
  createdByName: string = 'MT5 Auto Signal'
): Omit<Signal, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> {
  // Debug: Log raw MT5 position data
  console.log('🔍 [SIGNAL CREATE] RAW MT5 Position Object:', JSON.stringify({
    type: position.type,
    openPrice: position.openPrice,
    priceOpen: position.priceOpen,
    currentPrice: position.currentPrice,
    priceCurrent: position.priceCurrent,
    price: position.price,
    symbol: position.symbol,
    profit: position.profit,
    commission: position.commission,
    swap: position.swap,
    volume: position.volume,
    ticket: position.ticket
  }, null, 2))
  
  // Get entry price (openPrice is most reliable)
  const entryPrice = position.openPrice || position.priceOpen || 0
  
  // Get current price
  const currentPrice = position.currentPrice || position.priceCurrent || position.price || entryPrice
  
  // Get SL/TP from position
  let stopLoss = position.stopLoss || position.sl || 0
  let takeProfit1 = position.takeProfit || position.tp || 0
  
  // Determine signal type from MT5 position type (POSITION_TYPE_BUY/SELL)
  let signalType: 'BUY' | 'SELL' = 'BUY'
  const posType = position.type?.toString().toUpperCase() || ''

  console.log('🔍 [SIGNAL CREATE] Detecting position type from MT5:', {
    rawType: position.type,
    upperType: posType
  })

  // MT5 sends: POSITION_TYPE_BUY or POSITION_TYPE_SELL or numeric (0=BUY, 1=SELL)
  if (posType.includes('SELL')) {
    signalType = 'SELL'
  } else if (posType.includes('BUY')) {
    signalType = 'BUY'
  } else if (position.type === 1 || posType === '1') {
    // MT5 numeric: 1 = SELL
    signalType = 'SELL'
  } else if (position.type === 0 || posType === '0') {
    // MT5 numeric: 0 = BUY
    signalType = 'BUY'
  } else {
    console.error('⚠️ [SIGNAL CREATE] Unknown position type, defaulting to BUY')
  }

  console.log('✅ [SIGNAL CREATE] Detected type:', signalType)
  
  console.log('📊 [SIGNAL CREATE] Price data from MT5:', {
    openPrice: position.openPrice,
    priceOpen: position.priceOpen,
    currentPrice: position.currentPrice,
    price: position.price,
    extracted: { entryPrice, currentPrice, stopLoss, takeProfit1 }
  })

  // Validate prices
  if (!entryPrice || entryPrice === 0) {
    console.error('❌ [SIGNAL CREATE] Invalid entry price:', position)
    throw new Error('Cannot create signal: invalid entry price')
  }
  
  // If SL/TP are 0 or missing, calculate reasonable defaults based on entry price
  // Default: 50 pips for major pairs, or 0.5% of entry price
  const pipValue = entryPrice >= 1 ? 0.0001 : 0.00001 // Rough pip calculation
  const defaultPips = 50
  
  if (!stopLoss || stopLoss === 0) {
    if (signalType === 'BUY') {
      stopLoss = entryPrice - (defaultPips * pipValue)
    } else {
      stopLoss = entryPrice + (defaultPips * pipValue)
    }
  }
  
  if (!takeProfit1 || takeProfit1 === 0) {
    if (signalType === 'BUY') {
      takeProfit1 = entryPrice + (defaultPips * pipValue * 2) // 2:1 R:R
    } else {
      takeProfit1 = entryPrice - (defaultPips * pipValue * 2)
    }
  }
  
  // Format position time
  let positionTime: Date
  if (position.timeMsc) {
    positionTime = new Date(parseInt(position.timeMsc))
  } else if (position.timeUpdateMsc) {
    positionTime = new Date(parseInt(position.timeUpdateMsc))
  } else if (position.time) {
    positionTime = new Date(parseInt(position.time))
  } else {
    positionTime = new Date()
  }
  
  const positionId = position.ticket || position.id || position.positionId || 'unknown'
  const volume = position.volume || 0
  
  // Get profit (include commission and swap for accurate P/L)
  const baseProfit = position.profit || position.profitMsc || 0
  const commission = position.commission || 0
  const swap = position.swap || 0
  const totalProfit = baseProfit + commission + swap

  console.log('💰 [SIGNAL CREATE] Profit calculation:', {
    baseProfit,
    commission,
    swap,
    totalProfit
  })

  const profit = totalProfit
  
  const result = {
    title: `${position.symbol} ${signalType} Signal`,
    description: `Automated signal from MT5 position ${positionId}\nEntry: ${entryPrice.toFixed(5)} | Current: ${currentPrice.toFixed(5)}`,
    category,
    pair: position.symbol || 'UNKNOWN',
    type: signalType,
    entryPrice,
    stopLoss,
    takeProfit1,
    status: 'active' as const,
    postedAt: positionTime,
    createdBy,
    createdByName,
    notes: `MT5 Position ID: ${positionId}
Volume: ${volume} lots
Current Profit: ${baseProfit.toFixed(2)}
Commission: ${commission.toFixed(2)}
Swap: ${swap.toFixed(2)}
Total P/L: ${profit.toFixed(2)}
${position.comment || ''}`
  }
  
  console.log('✅ [SIGNAL CREATE] Converted signal data:', {
    type: result.type,
    entryPrice: result.entryPrice,
    currentPrice,
    stopLoss: result.stopLoss,
    takeProfit1: result.takeProfit1,
    profit
  })
  
  return result
}

/**
 * Create signal from MT5 position
 */
export async function createSignalFromMT5Position(
  position: any,
  category: 'free' | 'vip' = 'vip',
  createdBy: string = 'system',
  createdByName: string = 'MT5 Auto Signal'
): Promise<{ signalId: string; signal: Signal; alreadyExists: boolean }> {
  try {
    const positionId = position.ticket || position.id || position.positionId
    const pair = position.symbol || 'Unknown'
    
    // STEP 1: Acquire atomic lock FIRST (before creating anything)
    // This ensures only ONE event can process this position
    const lock = await acquireAtomicPositionLock(positionId, pair)
    
    if (lock.existed) {
      // Another event already acquired the lock
      console.log(`⚠️ [ATOMIC] Position ${positionId} already locked by concurrent event`)
      
      // If signal ID exists, return it
      if (lock.existingSignalId && lock.existingSignalId !== 'PENDING') {
        const signalDoc = await getDoc(doc(db, 'signals', lock.existingSignalId))
        if (signalDoc.exists()) {
          const signalData = signalDoc.data()
          const existingSignal = {
            id: lock.existingSignalId,
            ...signalData,
            postedAt: signalData.postedAt?.toDate() || new Date(),
            createdAt: signalData.createdAt?.toDate() || new Date(),
            updatedAt: signalData.updatedAt?.toDate() || new Date()
          } as Signal
          
          return {
            signalId: existingSignal.id,
            signal: existingSignal,
            alreadyExists: true
          }
        }
      }
      
      // Lock exists but signal not ready yet - wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 200))
      const mapping = await getSignalMappingByPosition(positionId)
      if (mapping && mapping.signalId !== 'PENDING') {
        const signalDoc = await getDoc(doc(db, 'signals', mapping.signalId))
        if (signalDoc.exists()) {
          const signalData = signalDoc.data()
          const existingSignal = {
            id: mapping.signalId,
            ...signalData,
            postedAt: signalData.postedAt?.toDate() || new Date(),
            createdAt: signalData.createdAt?.toDate() || new Date(),
            updatedAt: signalData.updatedAt?.toDate() || new Date()
          } as Signal
        
        // Convert position to signal format to compare TP/SL
        const newSignalData = convertMT5PositionToSignal(position, category, createdBy, createdByName)
        
        // Check if TP/SL changed
        const tpChanged = newSignalData.takeProfit1 !== existingSignal.takeProfit1
        const slChanged = newSignalData.stopLoss !== existingSignal.stopLoss
        const entryChanged = newSignalData.entryPrice !== existingSignal.entryPrice
        
        // If TP/SL/Entry changed, update the signal and Telegram message
        if (tpChanged || slChanged || entryChanged) {
          console.log(`TP/SL/Entry changed for existing signal. Updating...`)
          console.log('Changes:', { tpChanged, slChanged, entryChanged })
          
          const updateData: any = {}
          if (tpChanged) updateData.takeProfit1 = newSignalData.takeProfit1
          if (slChanged) updateData.stopLoss = newSignalData.stopLoss
          if (entryChanged) updateData.entryPrice = newSignalData.entryPrice
          
          try {
            const updatedSignal = await updateSignal(existingSignal.id, updateData)
            console.log('✅ Signal updated with new TP/SL values')
            
            // Log the update with clear message (accountId not available in this scope, will be added by caller if needed)
            await addStreamingLog({
              type: 'signal_updated',
              message: `MT5 Position TP/SL changed: ${updatedSignal.pair} ${updatedSignal.type} (Position: ${positionId})`,
              positionId: positionId.toString(),
              signalId: updatedSignal.id,
              success: true,
              details: {
                pair: updatedSignal.pair,
                category: updatedSignal.category,
                tpChanged,
                slChanged,
                entryChanged,
                oldTP: existingSignal.takeProfit1,
                newTP: updateData.takeProfit1 !== undefined ? updateData.takeProfit1 : existingSignal.takeProfit1,
                oldSL: existingSignal.stopLoss,
                newSL: updateData.stopLoss !== undefined ? updateData.stopLoss : existingSignal.stopLoss,
                oldEntry: existingSignal.entryPrice,
                newEntry: updateData.entryPrice !== undefined ? updateData.entryPrice : existingSignal.entryPrice,
                source: 'mt5_auto'
              }
            })
            
            return {
              signalId: updatedSignal.id,
              signal: updatedSignal,
              alreadyExists: true
            }
          } catch (updateError) {
            console.error('Error updating existing signal:', updateError)
            // Return existing signal even if update failed
          }
        }
        
        return {
          signalId: existingSignal.id,
          signal: existingSignal,
          alreadyExists: true
        }
      } // Close if (signalDoc.exists())
      } // Close if (mapping && mapping.signalId !== 'PENDING')
      
      // Signal not found - shouldn't happen, but handle gracefully
      console.warn(`⚠️ [ATOMIC] Lock exists for ${positionId} but signal not found, aborting`)
      throw new Error('Position locked but signal not accessible')
    } // Close the if (lock.existed) block
    
    // STEP 2: Lock acquired successfully - we are the ONLY event allowed to create signal
    console.log(`✅ [ATOMIC] Lock acquired for position ${positionId}, creating signal...`)
    
    // Convert position to signal format
    const signalData = convertMT5PositionToSignal(position, category, createdBy, createdByName)
    
    // Create signal (only this event reaches here due to atomic lock)
    const createdSignal = await createSignal(signalData)
    const signalId = createdSignal.id
    
    console.log(`✅ [ATOMIC] Signal created: ${signalId} for position ${positionId}`)
    
    // STEP 3: Update mapping with real signal ID (marks lock as completed)
    const positionProfit = position.profit || position.profitMsc || 0
    await updateMappingWithSignalId(positionId, signalId, positionProfit)
    
    // Return the created signal
    // Convert Timestamp to Date if needed (using type assertion for compatibility)
    const signal = {
      ...createdSignal,
      createdAt: createdSignal.createdAt instanceof Date ? createdSignal.createdAt : (createdSignal.createdAt as any).toDate?.() || new Date(),
      updatedAt: createdSignal.updatedAt instanceof Date ? createdSignal.updatedAt : (createdSignal.updatedAt as any).toDate?.() || new Date(),
      postedAt: createdSignal.postedAt instanceof Date ? createdSignal.postedAt : (createdSignal.postedAt as any).toDate?.() || new Date(),
    } as Signal
    
    return {
      signalId,
      signal,
      alreadyExists: false
    }
  } catch (error: any) {
    console.error('Error in createSignalFromMT5Position:', error)
    
    // Check for Firestore quota exceeded error
    if (error?.code === 'resource-exhausted' || 
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('Quota exceeded')) {
      console.error('❌ Firestore quota exceeded - cannot create signal')
      
      // Return a more user-friendly error
      throw new Error('Firestore quota exceeded. Please check your Firebase billing or wait for quota reset.')
    }
    
    throw error
  }
}

/**
 * Update signal for closed position
 */
export async function updateSignalForClosedPosition(
  signalId: string,
  positionId: string,
  profit?: number,
  closePrice?: number
): Promise<boolean> {
  try {
    console.log(`Updating signal ${signalId} for closed position ${positionId}`, { profit, closePrice })
    
    // Get signal to access pair and entry price for accurate pips calculation
    const signalDoc = await getDoc(doc(db, 'signals', signalId))
    if (!signalDoc.exists()) {
      console.error(`Signal ${signalId} not found`)
      return false
    }
    
    const signalData = signalDoc.data() as Signal
    const entryPrice = signalData.entryPrice
    const pair = signalData.pair
    const signalType = signalData.type
    
    // Calculate result in pips
    let result = 0
    
    if (closePrice && closePrice > 0) {
      // If we have close price, calculate pips accurately using currencyDatabase
      try {
        result = calculatePips(entryPrice, closePrice, pair)
        console.log(`Calculated ${result} pips from entry ${entryPrice} to close ${closePrice} for ${pair}`)
        
        // Adjust sign based on trade type
        // For BUY: positive if close > entry, negative if close < entry
        // For SELL: positive if close < entry, negative if close > entry
        if (signalType === 'SELL') {
          result = -result
        }
      } catch (error) {
        console.error('Error calculating pips from close price:', error)
        // Fall back to profit-based estimate if calculation fails
        if (profit !== undefined && profit !== 0) {
          result = Math.round(profit / 10) // Rough approximation
        }
      }
    } else if (profit !== undefined && profit !== 0) {
      // If no close price, estimate from profit
      // This is still rough without lot size, but better than nothing
      // For 1 lot standard forex, $10 profit ≈ 1 pip (for major pairs)
      // We'll use this as a baseline estimate
      result = Math.round(profit / 10) // Rough approximation: $10 per pip
      console.log(`Estimated ${result} pips from profit ${profit} (rough estimate)`)
    }
    
    // Update signal status with calculated result
    await updateSignalStatus(signalId, 'close_now', result, closePrice)
    
    // Mark mapping as closed
    const mapping = await getSignalMappingByPosition(positionId)
    if (mapping && mapping.id) {
      const mappingRef = doc(db, 'mt5_signal_mappings', mapping.id)
      await updateDoc(mappingRef, {
        closedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    }
    
    console.log(`✅ Signal ${signalId} updated for closed position ${positionId} with result: ${result} pips`)
    return true
  } catch (error) {
    console.error(`Error updating signal for closed position ${positionId}:`, error)
    return false
  }
}

/**
 * Detect and update closed positions
 */
async function detectAndUpdateClosedPositions(
  currentPositionIds: string[],
  accountId?: string,
  token?: string
): Promise<number> {
  try {
    console.log('🔍 Detecting closed positions...')
    
    // Get all active signal mappings
    const allMappings = await getAllActiveSignalMappings()
    console.log(`Found ${allMappings.length} signal mappings`)
    
    // Filter to only active mappings (not already closed)
    const activeMappings = allMappings.filter(m => !m.closedAt)
    console.log(`Found ${activeMappings.length} active signal mappings`)
    
    let signalsClosed = 0
    
    for (const mapping of activeMappings) {
      // Check if position still exists in current positions
      const positionStillExists = currentPositionIds.includes(mapping.positionId)
      
      if (!positionStillExists) {
        console.log(`📍 Position ${mapping.positionId} is no longer open - updating signal ${mapping.signalId}`)
        
        // Get last known profit from mapping
        const profit = mapping.lastKnownProfit || 0
        
        // Update signal
        const updated = await updateSignalForClosedPosition(
          mapping.signalId,
          mapping.positionId,
          profit,
          undefined // Close price not available from closed position
        )
        
        if (updated) {
          signalsClosed++
        }
      } else {
        // Position still exists, update profit if we can get it from current positions
        // This will be handled in the main sync loop
      }
    }
    
    console.log(`✅ Closed position detection completed: ${signalsClosed} signals closed`)
    return signalsClosed
  } catch (error) {
    console.error('Error detecting closed positions:', error)
    return 0
  }
}

/**
 * Sync signals from MT5 positions
 */
export async function syncSignalsFromMT5Positions(
  accountId?: string,
  category: 'free' | 'vip' = 'vip',
  token?: string
): Promise<{ success: boolean; signalsCreated: number; signalsUpdated: number; signalsClosed: number; errors: string[] }> {
  try {
    console.log('Starting signal sync from MT5 positions...', { accountId, category, hasToken: !!token })
    console.log('Using London endpoint by default')
    
    // Get positions - London endpoint will be used by default in getMT5Positions
    const { getMT5Positions: getMT5PositionsFunc } = await import('./mt5VipService')
    const positions = await getMT5PositionsFunc(accountId, token)
    
    console.log(`Processing ${positions.length} positions...`)
    
    // Extract position IDs for closed position detection
    const currentPositionIds = positions.map(p => p.ticket || p.id || p.positionId || 'unknown').filter(Boolean)
    
    let signalsCreated = 0
    let signalsUpdated = 0
    const errors: string[] = []
    
    // Process open positions (create/update signals)
    for (const position of positions) {
      try {
        const positionId = position.ticket || position.id || position.positionId || 'unknown'
        console.log(`Processing position: ${positionId}`)
        
        const result = await createSignalFromMT5Position(position, category)
        
        if (result.alreadyExists) {
          signalsUpdated++
          console.log(`Position ${positionId} already has signal`)
          
          // Update profit in mapping
          const positionProfit = position.profit || position.profitMsc || 0
          const mapping = await getSignalMappingByPosition(positionId)
          if (mapping && mapping.id) {
            const mappingRef = doc(db, 'mt5_signal_mappings', mapping.id)
            await updateDoc(mappingRef, {
              lastKnownProfit: positionProfit,
              updatedAt: Timestamp.now()
            })
          }
        } else {
          signalsCreated++
          console.log(`Created signal for position ${positionId}: ${result.signalId}`)
        }
      } catch (error) {
        const positionId = position.ticket || position.id || position.positionId || 'unknown'
        const errorMsg = `Error processing position ${positionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg, error)
      }
    }
    
    // Detect and update closed positions
    console.log('Checking for closed positions...')
    const signalsClosed = await detectAndUpdateClosedPositions(currentPositionIds, accountId, token)
    
    console.log(`Signal sync completed: ${signalsCreated} created, ${signalsUpdated} already existed, ${signalsClosed} closed, ${errors.length} errors`)
    
    return {
      success: errors.length === 0 || signalsCreated + signalsUpdated + signalsClosed > 0,
      signalsCreated,
      signalsUpdated,
      signalsClosed,
      errors
    }
  } catch (error) {
    console.error('Error syncing signals from MT5 positions:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    return {
      success: false,
      signalsCreated: 0,
      signalsUpdated: 0,
      signalsClosed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

