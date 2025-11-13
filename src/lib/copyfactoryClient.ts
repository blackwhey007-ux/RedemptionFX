/**
 * CopyFactory Client
 * Orchestrates MetaApi SDK and CopyFactory SDK operations
 */

import MetaApi, { CopyFactory as CopyFactoryClient } from 'metaapi.cloud-sdk'
import type { SymbolMappingPair } from './copyTradingRepo'

// Validate environment variables
const METAAPI_TOKEN = process.env.METAAPI_TOKEN

if (!METAAPI_TOKEN) {
  throw new Error('METAAPI_TOKEN environment variable is required')
}

function initializeMetaApi(token: string) {
  try {
    return new MetaApi(token)
  } catch (error) {
    console.error('[CopyFactory] Failed to initialize MetaApi SDK:', error)
    throw new Error('Unable to initialize MetaApi SDK with provided token.')
  }
}

function initializeCopyFactory(token: string) {
  try {
    return new CopyFactoryClient(token)
  } catch (error) {
    console.error('[CopyFactory] Failed to initialize CopyFactory SDK:', error)
    throw new Error('Unable to initialize CopyFactory SDK with provided token.')
  }
}

// Initialize default SDK instances using environment token
const metaApiSdk = initializeMetaApi(METAAPI_TOKEN)
const copyFactorySdk = initializeCopyFactory(METAAPI_TOKEN)

function getMetaApiClients(customToken?: string) {
  const token =
    typeof customToken === 'string' && customToken.trim().length > 0 ? customToken.trim() : undefined

  if (!token) {
    console.log('[CopyFactory] Using default token. Token length:', METAAPI_TOKEN?.length, 'Parts:', METAAPI_TOKEN?.split('.').length)
    return {
      metaApi: metaApiSdk,
      copyFactory: copyFactorySdk,
      configurationApi: copyFactorySdk.configurationApi
    }
  }

  console.log('[CopyFactory] Using custom token. Token length:', token.length, 'Parts:', token.split('.').length)
  const metaApiClient = initializeMetaApi(token)
  const copyFactoryClient = initializeCopyFactory(token)

  return {
    metaApi: metaApiClient,
    copyFactory: copyFactoryClient,
    configurationApi: copyFactoryClient.configurationApi
  }
}

interface CreateSubscriberAccountParams {
  name: string
  login: string
  password: string
  server: string
  broker: string
  platform: 'mt4' | 'mt5'
  magic?: number
}

interface SubscribeToStrategyParams {
  subscriberAccountId: string
  providerAccountId: string
  strategyId: string
  riskMultiplier: number
  closeOnly?: boolean
  reverseTrading?: boolean
  symbolMapping?: Record<string, string> | Array<{ from: string; to: string }>
  maxTradeRisk?: number
}

interface CreateMasterStrategyParams {
  accountId: string
  name: string
  description?: string
  symbolMapping?: SymbolMappingPair[] | null
  positionLifecycle?: 'hedging' | 'netting'
  connectionMode?: 'cloud' | 'rpc'
}

function buildSymbolMappingPayload(
  mapping?: SymbolMappingPair[] | null
): Array<{ from: string; to: string }> | undefined {
  if (mapping === undefined) return undefined
  if (mapping === null) return []

  const pairs = mapping
    .map((pair) => ({
      from: typeof pair.from === 'string' ? pair.from.trim() : '',
      to: typeof pair.to === 'string' ? pair.to.trim() : ''
    }))
    .filter((pair) => pair.from.length > 0 && pair.to.length > 0)

  return pairs.length > 0 ? pairs : []
}

/**
 * Create a new MetaApi cloud trading account (subscriber)
 */
export async function createSubscriberAccount(
  params: CreateSubscriberAccountParams,
  options?: { token?: string }
): Promise<{ accountId: string; state: string }> {
  try {
    console.log(`[CopyFactory] Creating subscriber account: ${params.name}`)

    const { metaApi } = getMetaApiClients(options?.token)

    const account = await metaApi.metatraderAccountApi.createAccount({
      name: params.name,
      type: 'cloud-g2',
      login: params.login,
      password: params.password,
      server: params.server,
      platform: params.platform,
      magic: params.magic || 0,
      copyFactoryRoles: ['SUBSCRIBER']
    })

    console.log(`[CopyFactory] Subscriber account created: ${account.id}`)

    // Deploy the account
    await account.deploy()
    console.log(`[CopyFactory] Account deployed: ${account.id}`)

    // Wait for deployment (with timeout)
    await account.waitDeployed(1, 30)
    console.log(`[CopyFactory] Account deployment confirmed: ${account.id}`)

    return {
      accountId: account.id,
      state: account.state
    }
  } catch (error) {
    console.error('[CopyFactory] Error creating subscriber account:', error)
    throw new Error(
      `Failed to create subscriber account: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Subscribe a subscriber account to a master strategy
 */
export async function subscribeToStrategy(
  params: SubscribeToStrategyParams,
  options?: { token?: string }
): Promise<{ subscriptionId: string }> {
  try {
    console.log(
      `[CopyFactory] Subscribing account ${params.subscriberAccountId} to strategy ${params.strategyId}`
    )

    // Get the subscriber configuration API
    const { configurationApi } = getMetaApiClients(options?.token)

    const subscription: Record<string, any> = {
      strategyId: params.strategyId,
      multiplier: params.riskMultiplier
    }

    if (params.reverseTrading) {
      subscription.reverse = true
    }

    if (params.symbolMapping) {
      if (Array.isArray(params.symbolMapping)) {
        if (params.symbolMapping.length > 0) {
          subscription.symbolMapping = params.symbolMapping
        }
      } else {
        const mappingEntries = Object.entries(params.symbolMapping).filter(
          ([from, to]) => from && to
        )
        if (mappingEntries.length > 0) {
          subscription.symbolMapping = mappingEntries.map(([from, to]) => ({
            from,
            to
          }))
        }
      }
    }

    if (typeof params.maxTradeRisk === 'number' && !Number.isNaN(params.maxTradeRisk)) {
      subscription.maxTradeRisk = params.maxTradeRisk
    }

    await configurationApi.updateSubscriber(params.subscriberAccountId, {
      name: params.subscriberAccountId,
      subscriptions: [subscription as any]
    } as any)

    console.log(
      `[CopyFactory] Subscription created for account ${params.subscriberAccountId} with multiplier ${params.riskMultiplier}`
    )

    return {
      subscriptionId: `${params.subscriberAccountId}:${params.strategyId}`
    }
  } catch (error) {
    console.error('[CopyFactory] Error subscribing to strategy:', error)
    if (error && typeof error === 'object' && 'details' in error) {
      console.error('[CopyFactory] Subscription error details:', (error as any).details)
    }
    throw new Error(
      `Failed to subscribe to strategy: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Create or update a master strategy
 */
export async function createMasterStrategy(
  params: CreateMasterStrategyParams,
  options?: { token?: string }
): Promise<{ strategyId: string }> {
  try {
    console.log(`[CopyFactory] Creating/updating master strategy: ${params.name}`)

    const { configurationApi } = getMetaApiClients(options?.token)

    // Check if strategy already exists
    const strategies =
      (await configurationApi.getStrategiesWithInfiniteScrollPagination({
        limit: 1000
      })) || []
    const existingStrategy = strategies.find((s) => s.name === params.name)

    if (existingStrategy) {
      console.log(`[CopyFactory] Master strategy already exists: ${existingStrategy._id}`)

      const updatePayload: Record<string, any> = {
        name: params.name,
        description: params.description || existingStrategy.description || '',
        accountId: params.accountId
      }

      const symbolMappingPayload = buildSymbolMappingPayload(params.symbolMapping)
      if (symbolMappingPayload !== undefined) {
        updatePayload.symbolMapping = symbolMappingPayload
      }

      await configurationApi.updateStrategy(existingStrategy._id, updatePayload as any)

      return {
        strategyId: existingStrategy._id
      }
    }

    // Generate a new strategy ID (must be 4 characters, alphanumeric)
    const strategyIdResult = await configurationApi.generateStrategyId()
    const strategyId = strategyIdResult.id

    console.log(`[CopyFactory] Generated strategy ID: ${strategyId}`)

    // Create new strategy
    const payload: Record<string, any> = {
      name: params.name,
      description: params.description || `Master strategy for ${params.name}`,
      accountId: params.accountId
    }

    const symbolMappingPayload = buildSymbolMappingPayload(params.symbolMapping)
    if (symbolMappingPayload !== undefined) {
      payload.symbolMapping = symbolMappingPayload
    }

    await configurationApi.updateStrategy(strategyId, payload as any)

    console.log(`[CopyFactory] Master strategy created: ${strategyId}`)

    return {
      strategyId
    }
  } catch (error) {
    console.error('[CopyFactory] Error creating master strategy:', error)
    
    // Log full error details for debugging
    if (error && typeof error === 'object') {
      console.error('[CopyFactory] Error details:', JSON.stringify(error, null, 2))
    }
    
    const errorMessage = error instanceof Error ? error.message : 
                        (error && typeof error === 'object' && 'message' in error) ? String(error.message) :
                        'Unknown error'
    
    throw new Error(`Failed to create master strategy: ${errorMessage}`)
  }
}

export async function updateCopyFactoryStrategy(
  params: {
    strategyId: string
    accountId: string
    name?: string
    description?: string
    symbolMapping?: SymbolMappingPair[] | null
  },
  options?: { token?: string }
): Promise<void> {
  try {
    const { configurationApi } = getMetaApiClients(options?.token)

    const payload: Record<string, any> = {
      accountId: params.accountId
    }

    if (params.name !== undefined) {
      payload.name = params.name
    }

    if (params.description !== undefined) {
      payload.description = params.description
    }

    const symbolMappingPayload = buildSymbolMappingPayload(params.symbolMapping)
    if (symbolMappingPayload !== undefined) {
      payload.symbolMapping = symbolMappingPayload
    }

    await configurationApi.updateStrategy(params.strategyId, payload as any)
  } catch (error) {
    console.error('[CopyFactory] Error updating master strategy config:', error)
    throw new Error(
      `Failed to update master strategy in CopyFactory: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

/**
 * Get all available strategies
 */
export async function getStrategies(options?: { token?: string }): Promise<
  Array<{
    id: string
    name: string
    description?: string
    accountId: string
  }>
> {
  try {
    console.log('[CopyFactory] Fetching available strategies')

    const { configurationApi } = getMetaApiClients(options?.token)
    const strategies =
      (await configurationApi.getStrategiesWithInfiniteScrollPagination({
        limit: 1000
      })) || []

    const formattedStrategies = strategies.map((s) => ({
      id: s._id,
      name: s.name,
      description: s.description,
      accountId: s.accountId
    }))

    console.log(`[CopyFactory] Found ${formattedStrategies.length} strategies`)

    return formattedStrategies
  } catch (error) {
    console.error('[CopyFactory] Error fetching strategies:', error)
    throw new Error(
      `Failed to fetch strategies: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get subscriber status and subscriptions
 */
export async function getSubscriberStatus(subscriberAccountId: string): Promise<{
  subscriptions: any[]
}> {
  try {
    console.log(`[CopyFactory] Fetching subscriber status for ${subscriberAccountId}`)

    const { configurationApi } = getMetaApiClients()
    const subscriber = await configurationApi.getSubscriber(subscriberAccountId)

    return {
      subscriptions: subscriber.subscriptions || []
    }
  } catch (error) {
    console.error('[CopyFactory] Error fetching subscriber status:', error)
    throw new Error(
      `Failed to fetch subscriber status: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get strategies for a specific MetaApi account
 */
export async function getStrategiesByAccount(
  accountId: string,
  options?: { token?: string }
): Promise<
  Array<{
    id: string
    name: string
    description?: string
    accountId: string
  }>
> {
  const strategies = await getStrategies(options)
  return strategies.filter((strategy) => strategy.accountId === accountId)
}

/**
 * Remove subscriber subscription
 */
export async function unsubscribeFromStrategy(
  subscriberAccountId: string,
  strategyId: string,
  options?: { token?: string }
): Promise<void> {
  try {
    console.log(
      `[CopyFactory] Unsubscribing account ${subscriberAccountId} from strategy ${strategyId}`
    )

    const { configurationApi } = getMetaApiClients(options?.token)
    const subscriber = await configurationApi.getSubscriber(subscriberAccountId)

    // Remove the specific subscription
    const updatedSubscriptions = (subscriber.subscriptions || []).filter(
      (sub) => sub.strategyId !== strategyId
    )

    await configurationApi.updateSubscriber(subscriberAccountId, {
      name: subscriber.name,
      subscriptions: updatedSubscriptions
    })

    console.log(`[CopyFactory] Successfully unsubscribed from strategy ${strategyId}`)
  } catch (error) {
    console.error('[CopyFactory] Error unsubscribing from strategy:', error)
    throw new Error(
      `Failed to unsubscribe from strategy: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Delete a subscriber account
 */
export async function deleteSubscriberAccount(accountId: string): Promise<void> {
  try {
    console.log(`[CopyFactory] Deleting subscriber account ${accountId}`)

    const { metaApi } = getMetaApiClients()
    const account = await metaApi.metatraderAccountApi.getAccount(accountId)

    // Undeploy first
    await account.undeploy()
    console.log(`[CopyFactory] Account undeployed: ${accountId}`)

    // Delete the account
    await account.remove()
    console.log(`[CopyFactory] Account deleted: ${accountId}`)
  } catch (error) {
    console.error('[CopyFactory] Error deleting subscriber account:', error)
    throw new Error(
      `Failed to delete subscriber account: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Remove subscriber configuration entirely
 */
export async function removeSubscriber(subscriberAccountId: string): Promise<void> {
  try {
    console.log(`[CopyFactory] Removing subscriber ${subscriberAccountId}`)
    const { configurationApi } = getMetaApiClients()
    await configurationApi.removeSubscriber(subscriberAccountId)
    console.log(`[CopyFactory] Subscriber ${subscriberAccountId} removed`)
  } catch (error) {
    console.error('[CopyFactory] Error removing subscriber:', error)
    throw new Error(
      `Failed to remove subscriber: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get follower account information from MetaAPI
 */
export async function getFollowerAccountInfo(
  accountId: string,
  token?: string
): Promise<{
  balance: number
  equity: number
  margin: number
  freeMargin: number
  marginLevel: number
  currency: string
  login: string
  server: string
  platform: string
} | null> {
  try {
    console.log(`[CopyFactory] Fetching account info for ${accountId}`)

    const { metaApi } = getMetaApiClients(token)
    const account = await metaApi.metatraderAccountApi.getAccount(accountId)

    // Get RPC connection
    const connection = account.getRPCConnection()

    // Connect if not already connected
    try {
      await connection.connect()
      // Wait a bit for connection to stabilize
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (connectError) {
      // Connection might already be established, continue
      console.log('[CopyFactory] Connection may already be established')
    }

    // Get account information
    const accountInfo = await connection.getAccountInformation()

    return {
      balance: accountInfo.balance || 0,
      equity: accountInfo.equity || 0,
      margin: accountInfo.margin || 0,
      freeMargin: accountInfo.freeMargin || 0,
      marginLevel: accountInfo.marginLevel || 0,
      currency: accountInfo.currency || 'USD',
      login: accountInfo.login?.toString() || '',
      server: accountInfo.server || '',
      platform: accountInfo.platform || ''
    }
  } catch (error) {
    console.error(`[CopyFactory] Error fetching account info for ${accountId}:`, error)
    return null
  }
}

/**
 * Get follower account positions from MetaAPI
 */
export async function getFollowerPositions(
  accountId: string,
  token?: string
): Promise<Array<{
  id: string
  symbol: string
  type: string
  volume: number
  profit: number
  swap: number
  commission: number
}>> {
  try {
    const { metaApi } = getMetaApiClients(token)
    const account = await metaApi.metatraderAccountApi.getAccount(accountId)

    const connection = account.getRPCConnection()

    try {
      await connection.connect()
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (connectError) {
      // Connection might already be established, continue
      console.log('[CopyFactory] Connection may already be established')
    }

    const positions = await connection.getPositions()

    return (positions || []).map((pos: any) => ({
      id: pos.id || pos.ticket || '',
      symbol: pos.symbol || '',
      type: pos.type || '',
      volume: pos.volume || 0,
      profit: pos.profit || 0,
      swap: pos.swap || 0,
      commission: pos.commission || 0
    }))
  } catch (error) {
    console.error(`[CopyFactory] Error fetching positions for ${accountId}:`, error)
    return []
  }
}

/**
 * Get follower account information from MetaAPI using REST API (no subscription slots)
 * This is an alternative to getFollowerAccountInfo() that uses REST API instead of RPC
 */
export async function getFollowerAccountInfoREST(
  accountId: string,
  token?: string
): Promise<{
  balance: number
  equity: number
  margin: number
  freeMargin: number
  marginLevel: number
  currency: string
  login: string
  server: string
  platform: string
} | null> {
  try {
    console.log(`[CopyFactory] Fetching account info via REST API for ${accountId}`)

    if (!token) {
      console.warn('[CopyFactory] No token provided for REST API call')
      return null
    }

    // Import REST API client
    const { getAccountInfo } = await import('./metaapiRestClient')

    // Get account info via REST API
    // Note: getAccountInfo tries multiple endpoints including /account-information
    const accountMeta = await getAccountInfo(accountId, token)
    
    // Extract account information from metadata
    // Note: Some fields may not be available in account metadata
    // For real-time balance/equity, we may need to use RPC as fallback
    return {
      balance: accountMeta.balance || 0,
      equity: accountMeta.equity || accountMeta.balance || 0,
      margin: accountMeta.margin || 0,
      freeMargin: accountMeta.freeMargin || 0,
      marginLevel: accountMeta.marginLevel || 0,
      currency: accountMeta.currency || 'USD',
      login: accountMeta.login?.toString() || '',
      server: accountMeta.server || '',
      platform: accountMeta.platform || ''
    }
  } catch (error) {
    console.error(`[CopyFactory] Error fetching account info via REST API for ${accountId}:`, error)
    return null
  }
}

/**
 * Get follower account positions from MetaAPI using REST API (no subscription slots)
 * This is an alternative to getFollowerPositions() that uses REST API instead of RPC
 */
export async function getFollowerPositionsREST(
  accountId: string,
  token?: string
): Promise<Array<{
  id: string
  symbol: string
  type: string
  volume: number
  profit: number
  swap: number
  commission: number
}>> {
  try {
    if (!token) {
      console.warn('[CopyFactory] No token provided for REST API call')
      return []
    }

    // Import REST API client
    const { getPositions } = await import('./metaapiRestClient')

    // Get positions via REST API
    const positions = await getPositions(accountId, token)

    // Transform to match RPC format
    return (positions || []).map((pos: any) => ({
      id: pos.id || pos.ticket || pos.positionId || '',
      symbol: pos.symbol || '',
      type: pos.type || pos.tradeType || '',
      volume: pos.volume || pos.lots || 0,
      profit: pos.profit || pos.unrealizedProfit || 0,
      swap: pos.swap || 0,
      commission: pos.commission || 0
    }))
  } catch (error) {
    console.error(`[CopyFactory] Error fetching positions via REST API for ${accountId}:`, error)
    return []
  }
}

export { metaApiSdk, copyFactorySdk as copyFactory }

