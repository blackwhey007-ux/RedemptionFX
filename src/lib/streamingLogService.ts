/**
 * Streaming Log Service
 * Stores and retrieves streaming logs for MT5 position detection and signal creation
 */

import { db } from './firebaseConfig'
import { collection, addDoc, getDocs, query, orderBy, limit, Timestamp, deleteDoc, doc, where, writeBatch } from 'firebase/firestore'
import { cacheManager } from './cacheManager'

export type StreamingLogType = 
  | 'position_detected' 
  | 'position_tp_sl_changed'
  | 'signal_created' 
  | 'signal_updated'
  | 'telegram_sent'
  | 'telegram_updated'
  | 'telegram_notification'
  | 'telegram_failed'
  | 'error'
  | 'position_closed'
  | 'streaming_started'
  | 'streaming_stopped'
  | 'connection_lost'
  | 'connection_restored'

export interface StreamingLog {
  id?: string
  type: StreamingLogType
  timestamp: Date
  message: string
  details?: any
  success?: boolean
  error?: string
  positionId?: string
  signalId?: string
  accountId?: string
}

const MAX_LOGS = 1000 // Keep last 1000 logs
const LOG_COLLECTION = 'streaming-logs'

/**
 * Sanitize details object to remove Error instances and other non-serializable data
 */
function sanitizeDetails(details: any): any {
  if (!details) return undefined
  
  // If details is an Error object, convert it to a plain object
  if (details instanceof Error) {
    return {
      error: {
        name: details.name,
        message: details.message,
        stack: details.stack
      }
    }
  }
  
  // If details is an object, sanitize each property
  if (typeof details === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(details)) {
      if (value instanceof Error) {
        sanitized[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack
        }
      } else if (value && typeof value === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeDetails(value)
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }
  
  return details
}

/**
 * Add a log entry to Firestore
 */
export async function addStreamingLog(log: Omit<StreamingLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    // Ensure db is available
    if (!db) {
      console.error('[STREAMING_LOG] ❌ Firestore db is not available')
      // Try to get db again
      try {
        const firebaseConfig = await import('./firebaseConfig')
        if (firebaseConfig.db) {
          // @ts-ignore - dynamically assign
          db = firebaseConfig.db
          console.log('[STREAMING_LOG] ✅ Retrieved db from firebaseConfig')
        } else {
          console.error('[STREAMING_LOG] ❌ db still not available after import')
          return
        }
      } catch (importError) {
        console.error('[STREAMING_LOG] ❌ Failed to import firebaseConfig:', importError)
        return
      }
    }
    
    // Sanitize log data - Firestore cannot store Error objects directly
    const sanitizedDetails = log.details ? sanitizeDetails(log.details) : undefined
    
    const logData = {
      ...log,
      details: sanitizedDetails,
      timestamp: Timestamp.now()
    }
    
    console.log('[STREAMING_LOG] 📝 Adding log:', log.type, '-', log.message.substring(0, 50))
    console.log('[STREAMING_LOG] DB status - available:', !!db, '| server:', typeof window === 'undefined')
    
    const docRef = await addDoc(collection(db, LOG_COLLECTION), logData)
    console.log('[STREAMING_LOG] ✅ Log added successfully with ID:', docRef.id)
    
    // Invalidate cache when new log is added
    cacheManager.invalidatePattern('streamingLogs')
    
    // Cleanup old logs periodically (keep last MAX_LOGS)
    // This is done asynchronously to not slow down logging
    // Reduced frequency: only cleanup every 100 writes to reduce reads
    if (Math.random() < 0.01) {  // 1% chance = ~1 in 100 writes
      cleanupOldLogs().catch(err => {
        console.error('Error cleaning up old logs:', err)
      })
    }
  } catch (error) {
    console.error('[STREAMING_LOG] Error adding streaming log:', error)
    console.error('[STREAMING_LOG] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined,
      logData: log
    })
    // Don't throw - logging should never break the main flow
  }
}

/**
 * Get recent streaming logs (with caching, reduced default limit from 500 to 50)
 */
export async function getStreamingLogs(
  limitCount: number = 50,
  logType?: StreamingLogType
): Promise<StreamingLog[]> {
  try {
    // Check cache first
    const cacheKey = `streamingLogs:${limitCount}:${logType || 'all'}`
    const cached = cacheManager.getTyped<StreamingLog[]>('streamingLogs', cacheKey)
    
    if (cached) {
      console.log('[STREAMING_LOG] Using cached logs')
      return cached
    }

    console.log('[STREAMING_LOG] Fetching logs from Firestore, limit:', limitCount, 'type:', logType || 'all')
    
    let q = query(
      collection(db, LOG_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    
    if (logType) {
      q = query(
        collection(db, LOG_COLLECTION),
        where('type', '==', logType),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )
    }
    
    const snapshot = await getDocs(q)
    console.log('[STREAMING_LOG] Found', snapshot.size, 'logs')
    
    const logs: StreamingLog[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      logs.push({
        id: doc.id,
        type: data.type,
        timestamp: data.timestamp?.toDate() || new Date(),
        message: data.message || '',
        details: data.details,
        success: data.success,
        error: data.error,
        positionId: data.positionId,
        signalId: data.signalId,
        accountId: data.accountId
      })
    })
    
    // Cache the results
    cacheManager.setTyped('streamingLogs', cacheKey, logs)
    
    console.log('[STREAMING_LOG] Returning', logs.length, 'processed logs')
    return logs
  } catch (error) {
    console.error('[STREAMING_LOG] Error getting streaming logs:', error)
    console.error('[STREAMING_LOG] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    })
    return []
  }
}

/**
 * Delete old logs, keeping only the most recent MAX_LOGS
 */
async function cleanupOldLogs(): Promise<void> {
  try {
    // Get total count first
    const allLogsQuery = query(
      collection(db, LOG_COLLECTION),
      orderBy('timestamp', 'desc')
    )
    
    const allSnapshot = await getDocs(allLogsQuery)
    const totalLogs = allSnapshot.size
    
    if (totalLogs <= MAX_LOGS) {
      return // No cleanup needed
    }
    
    // Get logs to delete (oldest ones beyond MAX_LOGS)
    const logsToDelete = totalLogs - MAX_LOGS
    const deleteQuery = query(
      collection(db, LOG_COLLECTION),
      orderBy('timestamp', 'asc'),
      limit(logsToDelete)
    )
    
    const deleteSnapshot = await getDocs(deleteQuery)
    
    // Delete in batches of 500 (Firestore limit)
    const batch = writeBatch(db)
    let batchCount = 0
    
    deleteSnapshot.forEach((docSnapshot) => {
      if (batchCount < 500) {
        batch.delete(docSnapshot.ref)
        batchCount++
      } else {
        // Commit current batch and start new one
        batch.commit().catch(console.error)
        batchCount = 0
      }
    })
    
    if (batchCount > 0) {
      await batch.commit()
    }
    
    console.log(`Cleaned up ${logsToDelete} old streaming logs`)
  } catch (error) {
    console.error('Error cleaning up old logs:', error)
  }
}

/**
 * Clear all logs (for admin use)
 */
export async function clearAllLogs(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, LOG_COLLECTION))
    
    const batch = writeBatch(db)
    let batchCount = 0
    
    snapshot.forEach((docSnapshot) => {
      if (batchCount < 500) {
        batch.delete(docSnapshot.ref)
        batchCount++
      } else {
        batch.commit().catch(console.error)
        batchCount = 0
      }
    })
    
    if (batchCount > 0) {
      await batch.commit()
    }
    
    console.log('All streaming logs cleared')
  } catch (error) {
    console.error('Error clearing logs:', error)
    throw error
  }
}

/**
 * Delete all streaming logs with detailed status (for admin UI)
 */
export async function deleteAllStreamingLogs(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const logsRef = collection(db, LOG_COLLECTION)
    const snapshot = await getDocs(logsRef)
    
    let deleted = 0
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(docSnapshot.ref)
      deleted++
    }
    
    // Invalidate cache after deletion
    cacheManager.invalidatePattern('streamingLogs')
    
    console.log(`Deleted ${deleted} streaming logs`)
    return { success: true, deletedCount: deleted }
  } catch (error: any) {
    console.error('Error deleting streaming logs:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

