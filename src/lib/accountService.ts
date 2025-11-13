import { 
  doc, 
  updateDoc, 
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebaseConfig'

export interface LinkedAccount {
  id: string // unique ID for this account link
  mt5AccountId?: string
  copyTradingAccountId?: string
  accountName: string
  accountType: 'MT5' | 'COPY_TRADING'
  isActive: boolean
  linkedAt: Date | string
  lastSyncAt?: Date | string // Last successful sync timestamp for incremental syncing
}

/**
 * Get all linked accounts for a user
 */
export async function getUserLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
  try {
    const userDocRef = doc(db, 'users', userId)
    const userDocSnap = await getDoc(userDocRef)
    
    if (!userDocSnap.exists()) {
      return []
    }
    
    const userData = userDocSnap.data()
    const linkedAccounts = userData.linkedAccounts || []
    
    // Convert Firestore timestamps to Date objects
    return linkedAccounts.map((account: any) => ({
      ...account,
      linkedAt: account.linkedAt?.toDate?.() || account.linkedAt || new Date(),
      lastSyncAt: account.lastSyncAt?.toDate?.() || account.lastSyncAt || undefined
    }))
  } catch (error) {
    console.error('Error getting user linked accounts:', error)
    throw new Error('Failed to get linked accounts')
  }
}

/**
 * Get the currently active account for a user
 */
export async function getActiveAccount(userId: string): Promise<LinkedAccount | null> {
  try {
    const accounts = await getUserLinkedAccounts(userId)
    const userDocRef = doc(db, 'users', userId)
    const userDocSnap = await getDoc(userDocRef)
    
    if (!userDocSnap.exists()) {
      return null
    }
    
    const userData = userDocSnap.data()
    const activeAccountId = userData.activeAccountId
    
    if (activeAccountId) {
      const activeAccount = accounts.find(acc => acc.id === activeAccountId)
      if (activeAccount) {
        return activeAccount
      }
    }
    
    // If no active account set, return first account or null
    return accounts.length > 0 ? accounts[0] : null
  } catch (error) {
    console.error('Error getting active account:', error)
    throw new Error('Failed to get active account')
  }
}

/**
 * Link an MT5 account to a user
 */
export async function linkMT5Account(
  userId: string, 
  accountId: string, 
  accountName: string
): Promise<string> {
  try {
    const userDocRef = doc(db, 'users', userId)
    const userDocSnap = await getDoc(userDocRef)
    
    if (!userDocSnap.exists()) {
      throw new Error('User document not found')
    }
    
    const userData = userDocSnap.data()
    const linkedAccounts = userData.linkedAccounts || []
    
    // Check if account already linked
    const existingAccount = linkedAccounts.find(
      (acc: LinkedAccount) => acc.mt5AccountId === accountId
    )
    
    if (existingAccount) {
      throw new Error('Account already linked')
    }
    
    // Generate unique ID for this account link
    const accountLinkId = `mt5_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newAccount: LinkedAccount = {
      id: accountLinkId,
      mt5AccountId: accountId,
      accountName,
      accountType: 'MT5',
      isActive: linkedAccounts.length === 0, // First account is active by default
      linkedAt: new Date()
    }
    
    const updatedAccounts = [...linkedAccounts, newAccount]
    const updateData: any = {
      linkedAccounts: updatedAccounts,
      updatedAt: serverTimestamp()
    }
    
    // If this is the first account, set it as active
    if (linkedAccounts.length === 0) {
      updateData.activeAccountId = accountLinkId
    }
    
    await updateDoc(userDocRef, updateData)
    
    return accountLinkId
  } catch (error) {
    console.error('Error linking MT5 account:', error)
    throw error instanceof Error ? error : new Error('Failed to link MT5 account')
  }
}

/**
 * Link a copy trading account to a user
 */
export async function linkCopyTradingAccount(
  userId: string, 
  accountId: string, 
  accountName: string
): Promise<string> {
  try {
    const userDocRef = doc(db, 'users', userId)
    const userDocSnap = await getDoc(userDocRef)
    
    if (!userDocSnap.exists()) {
      throw new Error('User document not found')
    }
    
    const userData = userDocSnap.data()
    const linkedAccounts = userData.linkedAccounts || []
    
    // Check if account already linked
    const existingAccount = linkedAccounts.find(
      (acc: LinkedAccount) => acc.copyTradingAccountId === accountId
    )
    
    if (existingAccount) {
      throw new Error('Account already linked')
    }
    
    // Generate unique ID for this account link
    const accountLinkId = `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newAccount: LinkedAccount = {
      id: accountLinkId,
      copyTradingAccountId: accountId,
      accountName,
      accountType: 'COPY_TRADING',
      isActive: linkedAccounts.length === 0, // First account is active by default
      linkedAt: new Date()
    }
    
    const updatedAccounts = [...linkedAccounts, newAccount]
    const updateData: any = {
      linkedAccounts: updatedAccounts,
      updatedAt: serverTimestamp()
    }
    
    // If this is the first account, set it as active
    if (linkedAccounts.length === 0) {
      updateData.activeAccountId = accountLinkId
    }
    
    await updateDoc(userDocRef, updateData)
    
    return accountLinkId
  } catch (error) {
    console.error('Error linking copy trading account:', error)
    throw error instanceof Error ? error : new Error('Failed to link copy trading account')
  }
}

/**
 * Unlink an account from a user
 */
export async function unlinkAccount(userId: string, accountLinkId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId)
    const userDocSnap = await getDoc(userDocRef)
    
    if (!userDocSnap.exists()) {
      throw new Error('User document not found')
    }
    
    const userData = userDocSnap.data()
    const linkedAccounts = userData.linkedAccounts || []
    
    // Find the account to remove
    const accountToRemove = linkedAccounts.find((acc: LinkedAccount) => acc.id === accountLinkId)
    
    if (!accountToRemove) {
      throw new Error('Account not found')
    }
    
    // Remove the account from the array
    const updatedAccounts = linkedAccounts.filter((acc: LinkedAccount) => acc.id !== accountLinkId)
    
    const updateData: any = {
      linkedAccounts: updatedAccounts,
      updatedAt: serverTimestamp()
    }
    
    // If we removed the active account, set another one as active (or null)
    if (userData.activeAccountId === accountLinkId) {
      updateData.activeAccountId = updatedAccounts.length > 0 ? updatedAccounts[0].id : null
    }
    
    await updateDoc(userDocRef, updateData)
  } catch (error) {
    console.error('Error unlinking account:', error)
    throw error instanceof Error ? error : new Error('Failed to unlink account')
  }
}

/**
 * Set the active account for a user
 */
export async function setActiveAccount(userId: string, accountLinkId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId)
    const userDocSnap = await getDoc(userDocRef)
    
    if (!userDocSnap.exists()) {
      throw new Error('User document not found')
    }
    
    const userData = userDocSnap.data()
    const linkedAccounts = userData.linkedAccounts || []
    
    // Verify the account exists
    const accountExists = linkedAccounts.some((acc: LinkedAccount) => acc.id === accountLinkId)
    
    if (!accountExists) {
      throw new Error('Account not found')
    }
    
    // Update all accounts to set isActive flag
    const updatedAccounts = linkedAccounts.map((acc: LinkedAccount) => ({
      ...acc,
      isActive: acc.id === accountLinkId
    }))
    
    await updateDoc(userDocRef, {
      linkedAccounts: updatedAccounts,
      activeAccountId: accountLinkId,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error setting active account:', error)
    throw error instanceof Error ? error : new Error('Failed to set active account')
  }
}

/**
 * Get account by link ID
 */
export async function getAccountByLinkId(userId: string, accountLinkId: string): Promise<LinkedAccount | null> {
  try {
    const accounts = await getUserLinkedAccounts(userId)
    return accounts.find(acc => acc.id === accountLinkId) || null
  } catch (error) {
    console.error('Error getting account by link ID:', error)
    throw new Error('Failed to get account')
  }
}

/**
 * Update last sync timestamp for an account
 */
export async function updateLastSyncAt(userId: string, accountLinkId: string, syncTime: Date = new Date()): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId)
    const userDocSnap = await getDoc(userDocRef)
    
    if (!userDocSnap.exists()) {
      throw new Error('User document not found')
    }
    
    const userData = userDocSnap.data()
    const linkedAccounts = userData.linkedAccounts || []
    
    // Find and update the account
    const updatedAccounts = linkedAccounts.map((acc: LinkedAccount) => {
      if (acc.id === accountLinkId) {
        return {
          ...acc,
          lastSyncAt: syncTime
        }
      }
      return acc
    })
    
    await updateDoc(userDocRef, {
      linkedAccounts: updatedAccounts,
      updatedAt: serverTimestamp()
    })
    
    console.log(`[AccountService] Updated lastSyncAt for account ${accountLinkId} to ${syncTime.toISOString()}`)
  } catch (error) {
    console.error('Error updating last sync timestamp:', error)
    throw error instanceof Error ? error : new Error('Failed to update last sync timestamp')
  }
}



