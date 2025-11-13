import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  setDoc,
  deleteField
} from 'firebase/firestore'
import { db } from './firebaseConfig'
import { TradingProfile, UserRole } from '@/types/profile'

const PROFILES_COLLECTION = 'profiles'
const USERS_COLLECTION = 'users'

// Create a new trading profile
export const createProfile = async (profile: Omit<TradingProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const profileData = {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    const docRef = await addDoc(collection(db, PROFILES_COLLECTION), profileData)
    return docRef.id
  } catch (error) {
    console.error('Error creating profile:', error)
    throw new Error('Failed to create profile')
  }
}

// Update an existing profile
export const updateProfile = async (profileId: string, updates: Partial<Omit<TradingProfile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const profileRef = doc(db, PROFILES_COLLECTION, profileId)
    await updateDoc(profileRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    throw new Error('Failed to update profile')
  }
}

// Delete a profile
export const deleteProfile = async (profileId: string): Promise<void> => {
  try {
    const profileRef = doc(db, PROFILES_COLLECTION, profileId)
    await deleteDoc(profileRef)
  } catch (error) {
    console.error('Error deleting profile:', error)
    throw new Error('Failed to delete profile')
  }
}

// Get all profiles for a specific user
export const getProfilesByUser = async (userId: string): Promise<TradingProfile[]> => {
  try {
    const q = query(
      collection(db, PROFILES_COLLECTION),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    const profiles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as TradingProfile[]
    
    // Sort by createdAt in memory to avoid composite index requirement
    return profiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.error('Error getting user profiles:', error)
    throw new Error('Failed to get user profiles')
  }
}

// Get all public profiles (for VIP/Guest to view admin profiles)
export const getPublicProfiles = async (): Promise<TradingProfile[]> => {
  try {
    // Only get profiles that are marked as public
    // This should only include admin-created profiles that are meant to be shared
    const q = query(
      collection(db, PROFILES_COLLECTION),
      where('isPublic', '==', true)
    )
    
    const querySnapshot = await getDocs(q)
    const publicProfiles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as TradingProfile[]
    
    // Sort by createdAt in memory to avoid composite index requirement
    return publicProfiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.error('Error getting public profiles:', error)
    throw new Error('Failed to get public profiles')
  }
}

// Get a specific profile by ID
export const getProfileById = async (profileId: string): Promise<TradingProfile | null> => {
  try {
    const profileRef = doc(db, PROFILES_COLLECTION, profileId)
    const profileSnap = await getDoc(profileRef)
    
    if (profileSnap.exists()) {
      const data = profileSnap.data()
      return {
        id: profileSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as TradingProfile
    }
    
    return null
  } catch (error) {
    console.error('Error getting profile by ID:', error)
    throw new Error('Failed to get profile')
  }
}

// Get user role from Firestore
export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      const data = userSnap.data()
      return {
        userId: userSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString()
      } as UserRole
    }
    
    return null
  } catch (error) {
    console.error('Error getting user role:', error)
    throw new Error('Failed to get user role')
  }
}

// Create or update user role
export const setUserRole = async (userRole: Omit<UserRole, 'createdAt' | 'lastLoginAt'>): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userRole.userId)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        ...userRole,
        lastLoginAt: serverTimestamp()
      })
    } else {
      // Create new user
      await setDoc(userRef, {
        ...userRole,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error setting user role:', error)
    throw new Error('Failed to set user role')
  }
}

// Get all profiles that a user can view (own + public)
export const getViewableProfiles = async (userId: string, userRole: string): Promise<TradingProfile[]> => {
  try {
    if (userRole === 'admin') {
      // Admin can see all profiles
      const q = query(
        collection(db, PROFILES_COLLECTION),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as TradingProfile[]
    } else {
      // VIP/Guest can see public profiles + their own
      const [ownProfiles, publicProfiles] = await Promise.all([
        getProfilesByUser(userId),
        getPublicProfiles()
      ])
      
      // Combine and deduplicate
      const allProfiles = [...ownProfiles, ...publicProfiles]
      const uniqueProfiles = allProfiles.filter((profile, index, self) => 
        index === self.findIndex(p => p.id === profile.id)
      )
      
      return uniqueProfiles
    }
  } catch (error) {
    console.error('Error getting viewable profiles:', error)
    throw new Error('Failed to get viewable profiles')
  }
}

// Check if user can edit a profile
export const canEditProfile = (profile: TradingProfile, userId: string, userRole: string): boolean => {
  return userRole === 'admin' || profile.userId === userId
}

// Check if user can view a profile
export const canViewProfile = (profile: TradingProfile, userId: string, userRole: string): boolean => {
  return profile.isPublic || profile.userId === userId || userRole === 'admin'
}
