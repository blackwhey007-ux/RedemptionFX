import { db } from './firebaseConfig'
import { collection, addDoc, getDocs, query, where, limit, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore'

export interface MT5Settings {
  id?: string
  enabled: boolean
  accountId: string
  token: string
  regionUrl?: string // Region-specific URL (defaults to London if not provided)
  lastSync?: Date
  status?: 'connected' | 'disconnected' | 'error'
  createdAt?: Date
  updatedAt?: Date
}

// Default London endpoint (matches account configuration)
const DEFAULT_LONDON_ENDPOINT = 'https://mt-client-api-v1.london.agiliumtrade.ai'

// Get MT5 settings from Firestore
export const getMT5Settings = async (): Promise<MT5Settings | null> => {
  try {
    const q = query(collection(db, 'mt5Settings'), orderBy('createdAt', 'desc'), limit(1))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0]
    const data = doc.data()
    
    return {
      id: doc.id,
      enabled: data.enabled || false,
      accountId: data.accountId || '',
      token: data.token || '',
      regionUrl: data.regionUrl || DEFAULT_LONDON_ENDPOINT, // Default to London if not set
      status: data.status || 'disconnected',
      lastSync: data.lastSync?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as MT5Settings
  } catch (error) {
    console.error('Error getting MT5 settings:', error)
    return null
  }
}

// Save MT5 settings to Firestore
export const saveMT5Settings = async (settings: Omit<MT5Settings, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Check if settings already exist
    const existingSettings = await getMT5Settings()
    
    if (existingSettings && existingSettings.id) {
      // Update existing settings
      const settingsRef = doc(db, 'mt5Settings', existingSettings.id)
      
      const updateData: any = {
        enabled: settings.enabled,
        accountId: settings.accountId,
        token: settings.token,
        regionUrl: settings.regionUrl || DEFAULT_LONDON_ENDPOINT, // Auto-set London if not provided
        status: settings.status || 'disconnected',
        updatedAt: Timestamp.now()
      }
      
      if (settings.lastSync) {
        updateData.lastSync = Timestamp.fromDate(new Date(settings.lastSync))
      }
      
      await updateDoc(settingsRef, updateData)
      return existingSettings.id
    } else {
      // Create new settings
      const settingsData = {
        enabled: settings.enabled,
        accountId: settings.accountId,
        token: settings.token,
        regionUrl: settings.regionUrl || DEFAULT_LONDON_ENDPOINT, // Auto-set London if not provided
        status: settings.status || 'disconnected',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
      
      // Note: lastSync property removed from MT5Settings type
      // if (settings.lastSync) {
      //   settingsData.lastSync = Timestamp.fromDate(new Date(settings.lastSync))
      // }
      
      const docRef = await addDoc(collection(db, 'mt5Settings'), settingsData)
      return docRef.id
    }
  } catch (error) {
    console.error('Error saving MT5 settings:', error)
    throw error
  }
}

