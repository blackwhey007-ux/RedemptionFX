// Firebase Authentication helpers
import { getCurrentUser as getFirebaseUser, getUserData, isAdmin } from './firebaseAuth.js'

export async function getCurrentUser() {
  try {
    const user = getFirebaseUser()
    
    if (!user) {
      return null
    }

    // For now, return basic user data without Firestore lookup to avoid delays
    return {
      id: user.uid,
      email: user.email,
      displayName: user.displayName || 'Trader',
      photoURL: user.photoURL,
      role: 'user',
      subscription: 'free'
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  
  if (user.role !== 'admin') {
    throw new Error('Admin access required')
  }
  
  return user
}

export async function requireSubscription() {
  const user = await requireAuth()
  
  if (!user.subscription || user.subscription === 'free') {
    throw new Error('Active subscription required')
  }
  
  return user
}