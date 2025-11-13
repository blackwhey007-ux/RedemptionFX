import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore'
import { db } from './firebaseConfig'
import { cacheManager } from './cacheManager'
import { Promotion, PromotionType } from '@/types/promotion'

const PROMOTIONS_COLLECTION = 'promotions'

// Get all active promotions for a specific target audience (with caching)
export const getActivePromotions = async (targetAudience: 'vip' | 'guest'): Promise<Promotion[]> => {
  try {
    // Check cache first
    const cacheKey = `activePromotions:${targetAudience}`
    const cached = cacheManager.getTyped<Promotion[]>('promotions', cacheKey)
    
    if (cached) {
      console.log('🎁 Using cached active promotions for', targetAudience)
      return cached
    }

    console.log('🎁 Fetching active promotions from Firestore for', targetAudience)
    
    // Use Firestore query to filter active promotions instead of getting all
    const q = query(
      collection(db, PROMOTIONS_COLLECTION),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    )
    
    const querySnapshot = await getDocs(q)
    const allPromotions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as Promotion[]
    
    // Filter by target audience (can't do in Firestore query due to 'both' option)
    const filteredPromotions = allPromotions.filter(promo => 
      promo.targetAudience === targetAudience || promo.targetAudience === 'both'
    )
    
    // Cache the results
    cacheManager.setTyped('promotions', cacheKey, filteredPromotions)
    
    return filteredPromotions
  } catch (error) {
    console.error('Error getting active promotions:', error)
    throw new Error('Failed to get active promotions')
  }
}

// Get all promotions (for admin management) - with caching
export const getAllPromotions = async (): Promise<Promotion[]> => {
  try {
    // Check cache first
    const cacheKey = 'allPromotions'
    const cached = cacheManager.getTyped<Promotion[]>('promotions', cacheKey)
    
    if (cached) {
      console.log('🎁 Using cached all promotions')
      return cached
    }

    console.log('🎁 Fetching all promotions from Firestore')
    
    const q = query(
      collection(db, PROMOTIONS_COLLECTION),
      orderBy('displayOrder', 'asc')
    )
    
    const querySnapshot = await getDocs(q)
    const promotions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as Promotion[]
    
    // Cache the results
    cacheManager.setTyped('promotions', cacheKey, promotions)
    
    return promotions
  } catch (error) {
    console.error('Error getting all promotions:', error)
    throw new Error('Failed to get all promotions')
  }
}

// Create a new promotion
export const createPromotion = async (data: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, PROMOTIONS_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    console.log('Promotion created with ID:', docRef.id)
    
    // Invalidate promotion caches
    cacheManager.invalidatePattern('Promotions')
    
    return docRef.id
  } catch (error) {
    console.error('Error creating promotion:', error)
    throw new Error('Failed to create promotion')
  }
}

// Update a promotion
export const updatePromotion = async (id: string, data: Partial<Promotion>): Promise<void> => {
  try {
    const promotionRef = doc(db, PROMOTIONS_COLLECTION, id)
    await updateDoc(promotionRef, {
      ...data,
      updatedAt: serverTimestamp()
    })
    
    console.log('Promotion updated:', id)
    
    // Invalidate promotion caches
    cacheManager.invalidatePattern('Promotions')
  } catch (error) {
    console.error('Error updating promotion:', error)
    throw new Error('Failed to update promotion')
  }
}

// Delete a promotion
export const deletePromotion = async (id: string): Promise<void> => {
  try {
    const promotionRef = doc(db, PROMOTIONS_COLLECTION, id)
    await deleteDoc(promotionRef)
    
    console.log('Promotion deleted:', id)
    
    // Invalidate promotion caches
    cacheManager.invalidatePattern('Promotions')
  } catch (error) {
    console.error('Error deleting promotion:', error)
    throw new Error('Failed to delete promotion')
  }
}

// Toggle promotion active status
export const togglePromotionStatus = async (id: string, isActive: boolean): Promise<void> => {
  try {
    const promotionRef = doc(db, PROMOTIONS_COLLECTION, id)
    await updateDoc(promotionRef, {
      isActive,
      updatedAt: serverTimestamp()
    })
    
    console.log('Promotion status toggled:', id, isActive)
  } catch (error) {
    console.error('Error toggling promotion status:', error)
    throw new Error('Failed to toggle promotion status')
  }
}

// Reorder promotions (batch update displayOrder)
export const reorderPromotions = async (promotions: {id: string, displayOrder: number}[]): Promise<void> => {
  try {
    const batch = writeBatch(db)
    
    promotions.forEach(promo => {
      const promotionRef = doc(db, PROMOTIONS_COLLECTION, promo.id)
      batch.update(promotionRef, {
        displayOrder: promo.displayOrder,
        updatedAt: serverTimestamp()
      })
    })
    
    await batch.commit()
    console.log('Promotions reordered successfully')
  } catch (error) {
    console.error('Error reordering promotions:', error)
    throw new Error('Failed to reorder promotions')
  }
}

// Get next display order number
export const getNextDisplayOrder = async (): Promise<number> => {
  try {
    const q = query(collection(db, PROMOTIONS_COLLECTION))
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return 1
    }
    
    const promotions = querySnapshot.docs.map(doc => doc.data())
    const maxOrder = Math.max(...promotions.map(p => p.displayOrder || 0))
    return maxOrder + 1
  } catch (error) {
    console.error('Error getting next display order:', error)
    return 1
  }
}

// Track promotion interaction (impression, click, conversion)
export const trackPromotionInteraction = async (
  promotionId: string, 
  action: 'impression' | 'click' | 'conversion'
): Promise<void> => {
  try {
    const promotionRef = doc(db, PROMOTIONS_COLLECTION, promotionId)
    
    const updateData: any = {
      lastViewed: serverTimestamp()
    }
    
    switch (action) {
      case 'impression':
        updateData.impressions = increment(1)
        break
      case 'click':
        updateData.clicks = increment(1)
        break
      case 'conversion':
        updateData.conversions = increment(1)
        break
    }
    
    await updateDoc(promotionRef, updateData)
  } catch (error) {
    console.error('Error tracking promotion interaction:', error)
    // Don't throw error to avoid breaking user experience
  }
}

// Get promotion analytics
export const getPromotionAnalytics = async (promotionId?: string): Promise<any> => {
  try {
    let q = query(collection(db, PROMOTIONS_COLLECTION))

    if (promotionId) {
      q = query(collection(db, PROMOTIONS_COLLECTION), where('id', '==', promotionId))
    }

    const querySnapshot = await getDocs(q)
    const promotions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Promotion[]

    // Calculate analytics
    const totalImpressions = promotions.reduce((sum, p) => sum + (p.impressions || 0), 0)
    const totalClicks = promotions.reduce((sum, p) => sum + (p.clicks || 0), 0)
    const totalConversions = promotions.reduce((sum, p) => sum + (p.conversions || 0), 0)
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    return {
      totalImpressions,
      totalClicks,
      totalConversions,
      averageCTR,
      promotions
    }
  } catch (error) {
    console.error('Error getting promotion analytics:', error)
    throw new Error('Failed to get promotion analytics')
  }
}

// Subscribe to active promotions in real-time
export const subscribeToActivePromotions = (
  callback: (promotions: Promotion[]) => void,
  placement?: string
) => {
  try {
    let q = query(
      collection(db, PROMOTIONS_COLLECTION),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    )

    return onSnapshot(q, (querySnapshot) => {
      const promotions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Promotion[]

      // Filter by placement if specified
      let filteredPromotions = promotions
      if (placement) {
        filteredPromotions = promotions.filter(promo => 
          promo.placement?.includes(placement as any) || 
          promo.placement?.includes('all-pages')
        )
      }

      // Filter by date range
      const now = new Date()
      filteredPromotions = filteredPromotions.filter(promo => {
        const startDate = promo.startDate ? new Date(promo.startDate) : null
        const endDate = promo.endDate ? new Date(promo.endDate) : null
        
        if (startDate && now < startDate) return false
        if (endDate && now > endDate) return false
        
        return true
      })

      callback(filteredPromotions)
    })
  } catch (error) {
    console.error('Error subscribing to promotions:', error)
    callback([])
  }
}
