import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebaseConfig'

export interface Member {
  uid: string
  email: string
  displayName: string
  role: 'admin' | 'vip' | 'guest'
  status: 'active' | 'inactive' | 'pending'
  profileSettings: {
    displayName: string
    photoURL?: string
    discordUsername?: string
    telegramUsername?: string
  }
  paymentInfo?: {
    plan?: string // Payment plan name (e.g., "Monthly VIP", "Yearly Premium")
    amount: number
    currency: string
    cryptoWallet?: string
    txHash?: string
    paidAt: any
    expiresAt: any
  }
  createdAt: any
  lastLogin: any
}

// Get all members
export const getAllMembers = async (): Promise<Member[]> => {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as Member[]
  } catch (error) {
    console.error('Error getting members:', error)
    throw new Error('Failed to get members')
  }
}

// Update member role
export const updateMemberRole = async (userId: string, newRole: 'admin' | 'vip' | 'guest'): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      role: newRole,
      isAdmin: newRole === 'admin',
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating member role:', error)
    throw new Error('Failed to update member role')
  }
}

// Update member status
export const updateMemberStatus = async (userId: string, newStatus: 'active' | 'inactive' | 'pending'): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating member status:', error)
    throw new Error('Failed to update member status')
  }
}

// Update member payment information
export const updateMemberPayment = async (
  userId: string, 
  paymentData: {
    plan?: string
    amount: number
    currency: string
    paidAt: Date
    expiresAt: Date
  }
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      paymentInfo: {
        plan: paymentData.plan || '',
        amount: paymentData.amount,
        currency: paymentData.currency,
        paidAt: paymentData.paidAt,
        expiresAt: paymentData.expiresAt
      },
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating member payment:', error)
    throw new Error('Failed to update member payment')
  }
}

// Delete member
export const deleteMember = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId)
    await deleteDoc(userRef)
  } catch (error) {
    console.error('Error deleting member:', error)
    throw new Error('Failed to delete member')
  }
}

// Get recent members (last N days)
export const getRecentMembers = async (days: number = 7): Promise<Member[]> => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    // Get all recent users and filter for guests in memory to avoid Firestore index requirement
    const q = query(
      collection(db, 'users'),
      where('createdAt', '>=', cutoffDate)
    )
    
    const querySnapshot = await getDocs(q)
    const allRecentMembers = querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as Member[]
    
    // Filter for guest users only and sort by creation date
    return allRecentMembers
      .filter(member => member.role === 'guest')
      .sort((a, b) => b.createdAt?.toDate?.()?.getTime() - a.createdAt?.toDate?.()?.getTime())
  } catch (error) {
    console.error('Error getting recent members:', error)
    throw new Error('Failed to get recent members')
  }
}

// Get member statistics
export const getMemberStats = async (): Promise<{
  total: number
  admin: number
  vip: number
  guest: number
  new: number
  active: number
  inactive: number
  pending: number
}> => {
  try {
    const members = await getAllMembers()
    const recentMembers = await getRecentMembers(7)
    
    return {
      total: members.length,
      admin: members.filter(m => m.role === 'admin').length,
      vip: members.filter(m => m.role === 'vip').length,
      guest: members.filter(m => m.role === 'guest').length,
      new: recentMembers.length,
      active: members.filter(m => m.status === 'active').length,
      inactive: members.filter(m => m.status === 'inactive').length,
      pending: members.filter(m => m.status === 'pending').length
    }
  } catch (error) {
    console.error('Error getting member stats:', error)
    throw new Error('Failed to get member statistics')
  }
}

// Get single member by ID
export const getMember = async (userId: string): Promise<Member | null> => {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      return {
        uid: userSnap.id,
        ...userSnap.data()
      } as Member
    }
    
    return null
  } catch (error) {
    console.error('Error getting member:', error)
    throw new Error('Failed to get member')
  }
}
