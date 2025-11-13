/**
 * CopyTrading Firestore Repository
 * Handles all database operations for CopyFactory data
 */

import { db } from './firebaseConfig'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  FieldValue
} from 'firebase/firestore'

export interface SymbolMappingPair {
  from: string
  to: string
}

export interface MasterStrategy {
  strategyId: string
  name: string
  description?: string
  accountId: string
  status: 'active' | 'inactive'
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
  tokenEnc?: string | null
  symbolMapping?: SymbolMappingPair[]
}

export interface UserCopyTradingAccount {
  accountId: string
  strategyId: string
  strategyName: string
  riskMultiplier: number
  status: 'active' | 'inactive' | 'error'
  broker: string
  server: string
  login: string
  platform: 'mt4' | 'mt5'
  createdAt: Date
  updatedAt: Date
  lastError?: string
  label?: string
  isLegacy?: boolean
  reverseTrading?: boolean
  symbolMapping?: Record<string, string>
  maxRiskPercent?: number
  // Auto-rebalancing fields
  autoRebalancingEnabled?: boolean
  originalRiskMultiplier?: number
  rebalancingRules?: {
    minMultiplier: number
    maxMultiplier: number
    adjustmentStep: number
  }
  lastRebalancedAt?: Date
  rebalancingHistory?: Array<{
    date: Date
    oldMultiplier: number
    newMultiplier: number
    reason: string
  }>
  // Auto-pause fields
  autoPauseEnabled?: boolean
  maxDrawdownPercent?: number
  autoPausedAt?: Date
  autoPauseReason?: string
  autoResumeEnabled?: boolean
  resumeDrawdownPercent?: number
  // Auto-disconnect fields
  autoDisconnectEnabled?: boolean
  maxConsecutiveErrors?: number
  errorWindowMinutes?: number
  consecutiveErrorCount?: number
  lastErrorAt?: Date
  autoDisconnectedAt?: Date
  autoDisconnectReason?: string
  // Trade alerts preferences
  tradeAlertsEnabled?: boolean
  alertTypes?: string[]
  minTradeSizeForAlert?: number
  minProfitForAlert?: number
  minLossForAlert?: number
  dailySummaryTime?: string
}

export interface WebhookEvent {
  eventId: string
  type: string
  subscriberAccountId?: string
  strategyId?: string
  data: Record<string, any>
  receivedAt: Date
}

/**
 * Firestore references
 */
function strategiesCollection() {
  return collection(db, 'admin', 'copyFactory', 'strategies')
}

function strategyDoc(strategyId: string) {
  return doc(db, 'admin', 'copyFactory', 'strategies', strategyId)
}

/**
 * Map Firestore data to MasterStrategy
 */
function normalizeSymbolMappingEntries(input: unknown): SymbolMappingPair[] {
  if (!input) return []

  let entries: Array<{ from?: unknown; to?: unknown }> = []

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      return normalizeSymbolMappingEntries(parsed)
    } catch {
      return []
    }
  }

  if (Array.isArray(input)) {
    entries = input as Array<{ from?: unknown; to?: unknown }>
  } else if (typeof input === 'object') {
    entries = Object.entries(input as Record<string, unknown>).map(([from, to]) => ({
      from,
      to
    }))
  }

  const cleaned: SymbolMappingPair[] = entries
    .map((entry) => {
      const from = typeof entry.from === 'string' ? entry.from.trim() : ''
      const to = typeof entry.to === 'string' ? entry.to.trim() : ''
      if (!from || !to) return null
      return { from, to }
    })
    .filter((entry): entry is SymbolMappingPair => entry !== null)

  return cleaned
}

export function normalizeSymbolMapping(input: unknown): SymbolMappingPair[] {
  return normalizeSymbolMappingEntries(input)
}

function parseSymbolMapping(input: unknown): SymbolMappingPair[] | undefined {
  const entries = normalizeSymbolMapping(input)
  return entries.length > 0 ? entries : undefined
}

function prepareSymbolMappingForStorage(input: unknown): SymbolMappingPair[] | null {
  const entries = normalizeSymbolMapping(input)
  return entries.length > 0 ? entries : null
}

function mapStrategy(docSnap: any): MasterStrategy {
  const data = docSnap.data()

  return {
    strategyId: data.strategyId || docSnap.id,
    name: data.name,
    description: data.description,
    accountId: data.accountId,
    status: data.status || 'inactive',
    isPrimary: Boolean(data.isPrimary),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    tokenEnc: data.tokenEnc || null,
    symbolMapping: parseSymbolMapping(data.symbolMapping)
  }
}

/**
 * List all master strategies
 */
export async function listMasterStrategies(): Promise<MasterStrategy[]> {
  try {
    const snapshot = await getDocs(query(strategiesCollection(), orderBy('createdAt', 'asc')))
    return snapshot.docs.map(mapStrategy)
  } catch (error) {
    console.error('[CopyTradingRepo] Error listing master strategies:', error)
    throw error
  }
}

/**
 * Get master strategy by id
 */
export async function getMasterStrategy(strategyId: string): Promise<MasterStrategy | null> {
  try {
    const docSnap = await getDoc(strategyDoc(strategyId))

    if (!docSnap.exists()) {
      return null
    }

    return mapStrategy(docSnap)
  } catch (error) {
    console.error('[CopyTradingRepo] Error getting master strategy:', error)
    throw error
  }
}

/**
 * Get active master strategy
 */
export async function getActiveMasterStrategy(): Promise<MasterStrategy | null> {
  try {
    const snapshot = await getDocs(
      query(strategiesCollection(), where('status', '==', 'active'), limit(1))
    )

    if (snapshot.empty) {
      return null
    }

    return mapStrategy(snapshot.docs[0])
  } catch (error) {
    console.error('[CopyTradingRepo] Error getting active master strategy:', error)
    throw error
  }
}

/**
 * Save master strategy (create or update)
 */
export async function saveMasterStrategy(
  strategy: Omit<MasterStrategy, 'createdAt' | 'updatedAt'>
): Promise<void> {
  try {
    const docRef = strategyDoc(strategy.strategyId)
    const existing = await getDoc(docRef)

    const data = {
      strategyId: strategy.strategyId,
      name: strategy.name,
      description: strategy.description || '',
      accountId: strategy.accountId,
      status: strategy.status,
      isPrimary: strategy.isPrimary,
      tokenEnc: strategy.tokenEnc || null,
      symbolMapping: prepareSymbolMappingForStorage(strategy.symbolMapping),
      updatedAt: serverTimestamp()
    }

    if (existing.exists()) {
      await updateDoc(docRef, data as any)
    } else {
      await setDoc(
        docRef,
        {
          ...data,
          createdAt: serverTimestamp()
        } as any
      )
    }

    console.log(`[CopyTradingRepo] Master strategy saved: ${strategy.strategyId}`)
  } catch (error) {
    console.error('[CopyTradingRepo] Error saving master strategy:', error)
    throw error
  }
}

/**
 * Update master strategy fields
 */
export async function updateMasterStrategy(
  strategyId: string,
  updates: Partial<Omit<MasterStrategy, 'strategyId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const docRef = strategyDoc(strategyId)

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp()
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'symbolMapping') {
        payload.symbolMapping = prepareSymbolMappingForStorage(value)
      } else {
        payload[key] = value as unknown
      }
    })

    await updateDoc(docRef, payload as any)

    console.log(`[CopyTradingRepo] Master strategy ${strategyId} updated`)
  } catch (error) {
    console.error('[CopyTradingRepo] Error updating master strategy:', error)
    throw error
  }
}

/**
 * Set active master strategy
 */
export async function setActiveMasterStrategy(strategyId: string): Promise<void> {
  try {
    const strategies = await listMasterStrategies()

    for (const strategy of strategies) {
      const shouldActivate = strategy.strategyId === strategyId

      if (strategy.isPrimary !== shouldActivate || strategy.status !== (shouldActivate ? 'active' : 'inactive')) {
        await updateMasterStrategy(strategy.strategyId, {
          status: shouldActivate ? 'active' : 'inactive',
          isPrimary: shouldActivate
        })
      }
    }

    console.log(`[CopyTradingRepo] Active master strategy set to ${strategyId}`)
  } catch (error) {
    console.error('[CopyTradingRepo] Error setting active master strategy:', error)
    throw error
  }
}

/**
 * Delete master strategy
 */
export async function deleteMasterStrategy(strategyId: string): Promise<void> {
  try {
    await deleteDoc(strategyDoc(strategyId))
    console.log(`[CopyTradingRepo] Master strategy deleted: ${strategyId}`)
  } catch (error) {
    console.error('[CopyTradingRepo] Error deleting master strategy:', error)
    throw error
  }
}

/**
 * Firestore references for user accounts
 */
const legacyAccountDoc = (userId: string) => doc(db, 'users', userId, 'copyTrading', 'account')
const userAccountsCollection = (userId: string) =>
  collection(db, 'users', userId, 'copyTradingAccounts')
const userAccountDoc = (userId: string, accountId: string) =>
  doc(db, 'users', userId, 'copyTradingAccounts', accountId)

interface StoredCopyTradingAccount {
  accountId: string
  strategyId: string
  strategyName: string
  riskMultiplier: number
  status: 'active' | 'inactive' | 'error'
  broker: string
  server: string
  login: string
  platform: 'mt4' | 'mt5'
  passwordEnc?: string | null
  lastError?: string | null
  label?: string | null
  createdAt?: Timestamp | Date | FieldValue
  updatedAt?: Timestamp | Date | FieldValue
  reverseTrading?: boolean | null
  symbolMapping?: Record<string, string> | string | null
  maxRiskPercent?: number | null
  // Auto-rebalancing fields
  autoRebalancingEnabled?: boolean | null
  originalRiskMultiplier?: number | null
  rebalancingRules?: { minMultiplier: number; maxMultiplier: number; adjustmentStep: number } | null
  lastRebalancedAt?: Timestamp | Date | null
  rebalancingHistory?: Array<{ date: Date; oldMultiplier: number; newMultiplier: number; reason: string }> | null
  // Auto-pause fields
  autoPauseEnabled?: boolean | null
  maxDrawdownPercent?: number | null
  autoPausedAt?: Timestamp | Date | null
  autoPauseReason?: string | null
  autoResumeEnabled?: boolean | null
  resumeDrawdownPercent?: number | null
  // Auto-disconnect fields
  autoDisconnectEnabled?: boolean | null
  maxConsecutiveErrors?: number | null
  errorWindowMinutes?: number | null
  consecutiveErrorCount?: number | null
  lastErrorAt?: Timestamp | Date | null
  autoDisconnectedAt?: Timestamp | Date | null
  autoDisconnectReason?: string | null
  // Trade alerts preferences
  tradeAlertsEnabled?: boolean | null
  alertTypes?: string[] | null
  minTradeSizeForAlert?: number | null
  minProfitForAlert?: number | null
  minLossForAlert?: number | null
  dailySummaryTime?: string | null
}

interface AccountRecord {
  account: UserCopyTradingAccount
  passwordEnc?: string | null
}

// Helper function to convert Timestamp/Date to Date
const toDate = (value: Timestamp | Date | string | number | null | undefined): Date | undefined => {
  if (!value) return undefined
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') return new Date(value)
  return undefined
}

const mapAccountData = (
  data: StoredCopyTradingAccount,
  fallbackId: string,
  legacy = false
): AccountRecord => {
  let symbolMapping: Record<string, string> | undefined
  if (data.symbolMapping) {
    if (typeof data.symbolMapping === 'string') {
      try {
        const parsed = JSON.parse(data.symbolMapping)
        if (parsed && typeof parsed === 'object') {
          symbolMapping = parsed as Record<string, string>
        }
      } catch (error) {
        console.warn('[CopyTradingRepo] Failed to parse symbolMapping string:', error)
      }
    } else {
      symbolMapping = data.symbolMapping || undefined
    }
  }

  const createdAt =
    data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : data.createdAt instanceof Date
      ? data.createdAt
      : typeof data.createdAt === 'string' || typeof data.createdAt === 'number'
      ? new Date(data.createdAt)
      : new Date()

  const updatedAt =
    data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate()
      : data.updatedAt instanceof Date
      ? data.updatedAt
      : typeof data.updatedAt === 'string' || typeof data.updatedAt === 'number'
      ? new Date(data.updatedAt)
      : new Date()

  return {
    account: {
      accountId: data.accountId || fallbackId,
      strategyId: data.strategyId,
      strategyName: data.strategyName || 'Master Strategy',
      riskMultiplier: data.riskMultiplier ?? 1,
      status: (data.status as UserCopyTradingAccount['status']) || 'inactive',
      broker: data.broker,
      server: data.server,
      login: data.login,
      platform: data.platform || 'mt5',
      lastError: data.lastError ?? undefined,
      label: data.label ?? undefined,
      reverseTrading:
        typeof data.reverseTrading === 'boolean' ? data.reverseTrading : undefined,
      symbolMapping,
      maxRiskPercent:
        typeof data.maxRiskPercent === 'number' ? data.maxRiskPercent : undefined,
      createdAt,
      updatedAt,
      isLegacy: legacy,
      // Auto-rebalancing fields
      autoRebalancingEnabled:
        typeof data.autoRebalancingEnabled === 'boolean' ? data.autoRebalancingEnabled : undefined,
      originalRiskMultiplier:
        typeof data.originalRiskMultiplier === 'number' ? data.originalRiskMultiplier : undefined,
      rebalancingRules: data.rebalancingRules ?? undefined,
      lastRebalancedAt: toDate(data.lastRebalancedAt),
      rebalancingHistory: data.rebalancingHistory ?? undefined,
      // Auto-pause fields
      autoPauseEnabled:
        typeof data.autoPauseEnabled === 'boolean' ? data.autoPauseEnabled : undefined,
      maxDrawdownPercent:
        typeof data.maxDrawdownPercent === 'number' ? data.maxDrawdownPercent : undefined,
      autoPausedAt: toDate(data.autoPausedAt),
      autoPauseReason: data.autoPauseReason ?? undefined,
      autoResumeEnabled:
        typeof data.autoResumeEnabled === 'boolean' ? data.autoResumeEnabled : undefined,
      resumeDrawdownPercent:
        typeof data.resumeDrawdownPercent === 'number' ? data.resumeDrawdownPercent : undefined,
      // Auto-disconnect fields
      autoDisconnectEnabled:
        typeof data.autoDisconnectEnabled === 'boolean' ? data.autoDisconnectEnabled : undefined,
      maxConsecutiveErrors:
        typeof data.maxConsecutiveErrors === 'number' ? data.maxConsecutiveErrors : undefined,
      errorWindowMinutes:
        typeof data.errorWindowMinutes === 'number' ? data.errorWindowMinutes : undefined,
      consecutiveErrorCount:
        typeof data.consecutiveErrorCount === 'number' ? data.consecutiveErrorCount : undefined,
      lastErrorAt: toDate(data.lastErrorAt),
      autoDisconnectedAt: toDate(data.autoDisconnectedAt),
      autoDisconnectReason: data.autoDisconnectReason ?? undefined,
      // Trade alerts preferences
      tradeAlertsEnabled:
        typeof data.tradeAlertsEnabled === 'boolean' ? data.tradeAlertsEnabled : undefined,
      alertTypes: Array.isArray(data.alertTypes) ? data.alertTypes : undefined,
      minTradeSizeForAlert:
        typeof data.minTradeSizeForAlert === 'number' ? data.minTradeSizeForAlert : undefined,
      minProfitForAlert:
        typeof data.minProfitForAlert === 'number' ? data.minProfitForAlert : undefined,
      minLossForAlert:
        typeof data.minLossForAlert === 'number' ? data.minLossForAlert : undefined,
      dailySummaryTime: data.dailySummaryTime ?? undefined
    },
    passwordEnc: data.passwordEnc ?? null
  }
}

const fetchLegacyAccount = async (userId: string): Promise<AccountRecord | null> => {
  const legacySnap = await getDoc(legacyAccountDoc(userId))
  if (!legacySnap.exists()) {
    return null
  }

  const legacyData = legacySnap.data() as StoredCopyTradingAccount
  return mapAccountData(legacyData, legacyData.accountId || 'legacy', true)
}

export async function listUserCopyTradingAccounts(userId: string): Promise<UserCopyTradingAccount[]> {
  try {
    const snapshot = await getDocs(userAccountsCollection(userId))
    const accounts = snapshot.docs.map((docSnap) =>
      mapAccountData(docSnap.data() as StoredCopyTradingAccount, docSnap.id)
    )

    const legacyAccount = await fetchLegacyAccount(userId)
    const merged = legacyAccount ? [...accounts, legacyAccount] : accounts

    return merged
      .map((record) => record.account)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch (error) {
    console.error('[CopyTradingRepo] Error listing user accounts:', error)
    throw error
  }
}

interface SaveUserAccountInput {
  accountId: string
  strategyId: string
  strategyName: string
  riskMultiplier: number
  status: 'active' | 'inactive' | 'error'
  broker: string
  server: string
  login: string
  platform: 'mt4' | 'mt5'
  passwordEnc: string
  lastError?: string
  label?: string
  reverseTrading?: boolean
  symbolMapping?: Record<string, string>
  maxRiskPercent?: number
}

export async function saveUserCopyTradingAccount(
  userId: string,
  account: SaveUserAccountInput
): Promise<void> {
  try {
    const docRef = userAccountDoc(userId, account.accountId)
    const existing = await getDoc(docRef)

    const data: StoredCopyTradingAccount = {
      accountId: account.accountId,
      strategyId: account.strategyId,
      strategyName: account.strategyName,
      riskMultiplier: account.riskMultiplier,
      status: account.status,
      broker: account.broker,
      server: account.server,
      login: account.login,
      platform: account.platform,
      passwordEnc: account.passwordEnc,
      lastError: account.lastError ?? null,
      label: account.label ?? null,
      reverseTrading:
        typeof account.reverseTrading === 'boolean' ? account.reverseTrading : null,
      symbolMapping: account.symbolMapping ?? null,
      maxRiskPercent:
        typeof account.maxRiskPercent === 'number' ? account.maxRiskPercent : null,
      updatedAt: serverTimestamp()
    }

    if (existing.exists()) {
      await updateDoc(docRef, data as any)
    } else {
      await setDoc(
        docRef,
        {
          ...data,
          createdAt: serverTimestamp()
        } as any
      )
    }

    console.log(`[CopyTradingRepo] User account saved for user ${userId}`)
  } catch (error) {
    console.error('[CopyTradingRepo] Error saving user account:', error)
    throw error
  }
}

export async function deleteUserCopyTradingAccount(userId: string, accountId: string): Promise<void> {
  try {
    await deleteDoc(userAccountDoc(userId, accountId))
    console.log(`[CopyTradingRepo] User account deleted: ${accountId}`)
  } catch (error) {
    console.error('[CopyTradingRepo] Error deleting user account:', error)
    throw error
  }
}

export async function updateUserCopyTradingAccountStatus(
  userId: string,
  accountId: string,
  status: 'active' | 'inactive' | 'error',
  lastError?: string,
  additionalFields?: Partial<UserCopyTradingAccount>
): Promise<void> {
  try {
    const updateData: any = {
      status,
      lastError: lastError ?? null,
      updatedAt: serverTimestamp()
    }

    // Merge additional fields if provided
    if (additionalFields) {
      Object.assign(updateData, additionalFields)
    }

    await updateDoc(userAccountDoc(userId, accountId), updateData)
    console.log(
      `[CopyTradingRepo] User account status updated to ${status} for user ${userId}, account ${accountId}`
    )
  } catch (error) {
    console.error('[CopyTradingRepo] Error updating user account status:', error)
    throw error
  }
}

export async function migrateLegacyCopyTradingAccount(userId: string): Promise<UserCopyTradingAccount | null> {
  try {
    const legacyRecord = await fetchLegacyAccount(userId)
    if (!legacyRecord) {
      return null
    }

    const {
      account: {
        accountId,
        strategyId,
        riskMultiplier,
        status,
        broker,
        server,
        login,
        platform,
        lastError,
        label,
        reverseTrading,
        symbolMapping,
        maxRiskPercent
      },
      passwordEnc
    } = legacyRecord

    if (!accountId || !passwordEnc) {
      console.warn('[CopyTradingRepo] Legacy account missing required fields, skipping migration')
      return legacyRecord.account
    }

    await saveUserCopyTradingAccount(userId, {
      accountId,
      strategyId,
      strategyName: legacyRecord.account.strategyName || 'Legacy Strategy',
      riskMultiplier,
      status,
      broker,
      server,
      login,
      platform,
      passwordEnc,
      lastError,
      label,
      reverseTrading,
      symbolMapping,
      maxRiskPercent
    })

    await deleteDoc(legacyAccountDoc(userId))

    return (
      await listUserCopyTradingAccounts(userId)
    ).find((account) => account.accountId === accountId) || null
  } catch (error) {
    console.error('[CopyTradingRepo] Error migrating legacy account:', error)
    throw error
  }
}

/**
 * Legacy helper retained for backwards compatibility.
 * Returns the first available account or the legacy account if present.
 */
export async function getCopyTradingAccount(userId: string): Promise<UserCopyTradingAccount | null> {
  const accounts = await listUserCopyTradingAccounts(userId)
  return accounts[0] ?? null
}

export async function saveCopyTradingAccount(
  userId: string,
  account: Omit<SaveUserAccountInput, 'strategyName' | 'passwordEnc'>
): Promise<void> {
  throw new Error(
    'saveCopyTradingAccount legacy helper is no longer supported. Use saveUserCopyTradingAccount instead.'
  )
}

export async function updateCopyTradingAccountStatus(
  userId: string,
  status: 'active' | 'inactive' | 'error',
  lastError?: string
): Promise<void> {
  const accounts = await listUserCopyTradingAccounts(userId)
  if (accounts.length === 0) {
    return
  }
  await updateUserCopyTradingAccountStatus(userId, accounts[0].accountId, status, lastError)
}

export async function deleteCopyTradingAccount(userId: string): Promise<void> {
  const accounts = await listUserCopyTradingAccounts(userId)
  for (const account of accounts) {
    if (account.isLegacy) {
      await deleteDoc(legacyAccountDoc(userId))
    } else {
      await deleteUserCopyTradingAccount(userId, account.accountId)
    }
  }
}

/**
 * Log webhook event
 */
export async function logWebhookEvent(event: Omit<WebhookEvent, 'receivedAt'>): Promise<void> {
  try {
    const docRef = doc(db, 'copyfactory', 'webhookEvents', event.eventId)

    await setDoc(docRef, {
      ...event,
      receivedAt: serverTimestamp()
    })

    console.log(`[CopyTradingRepo] Webhook event logged: ${event.eventId}`)
  } catch (error) {
    console.error('[CopyTradingRepo] Error logging webhook event:', error)
    // Don't throw - webhook logging shouldn't break the main flow
  }
}

