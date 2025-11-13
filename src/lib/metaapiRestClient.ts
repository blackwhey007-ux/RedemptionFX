/**
 * MetaAPI REST API Client for server-side use
 * This replaces the browser-only SDK for server-side operations
 */

// SSL Certificate Bypass for Development
// Create a custom HTTPS agent that bypasses SSL certificate validation
// WARNING: This is insecure and should NEVER be used in production!
let httpsAgent: any = null
if (typeof window === 'undefined') {
  // Only run on server-side
  const https = require('https')
  
  // Always create HTTPS agent with SSL bypass for development
  // Check environment variable, but default to bypassing if not explicitly set to '1'
  const shouldBypassSSL = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '1'
  
  if (shouldBypassSSL) {
    // Set environment variable
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    
    // Create HTTPS agent with SSL bypass
    httpsAgent = new https.Agent({
      rejectUnauthorized: false
    })
    
    console.warn('⚠️ SSL certificate validation is DISABLED (development only)')
    console.log('🔧 HTTPS Agent created with SSL bypass')
  } else {
    console.log('✓ SSL certificate validation is ENABLED')
  }
}

// Custom fetch function that uses HTTPS agent with SSL bypass
async function customFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // If we have an HTTPS agent and URL is HTTPS, use Node's https module
  if (httpsAgent && url.startsWith('https://') && typeof window === 'undefined') {
    console.log(`🔧 Using custom HTTPS fetch with SSL bypass for: ${url}`)
    const https = require('https')
    const { URL } = require('url')
    
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(url)
        const requestOptions: any = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: options.method || 'GET',
          headers: options.headers as any || {},
          agent: httpsAgent,
          rejectUnauthorized: false
        }
        
        console.log(`📡 Making HTTPS request to: ${requestOptions.hostname}${requestOptions.path}`)
        
        const req = https.request(requestOptions, (res: any) => {
          console.log(`✅ Received response: ${res.statusCode} ${res.statusMessage}`)
        const chunks: Buffer[] = []
        
        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString()
          
          // Create a Response-like object that works with Node.js fetch API
          // Convert headers to Headers object format
          const headersObj: Record<string, string> = {}
          for (const key in res.headers) {
            const value = res.headers[key]
            if (Array.isArray(value)) {
              headersObj[key] = value.join(', ')
            } else if (value) {
              headersObj[key] = value
            }
          }
          
          // Create Response object
          const response = new Response(body, {
            status: res.statusCode || 200,
            statusText: res.statusMessage || 'OK',
            headers: headersObj
          })
          
          resolve(response)
        })
      })
      
      req.on('error', (error: Error) => {
        console.error(`❌ HTTPS request error for ${url}:`, error.message)
        console.error('Error details:', {
          code: (error as any).code,
          syscall: (error as any).syscall,
          hostname: (error as any).hostname,
          port: (error as any).port,
          stack: error.stack
        })
        reject(error)
      })
      
      // Set timeout
      req.setTimeout(30000, () => {
        req.destroy()
        reject(new Error(`Request timeout for ${url}`))
      })
      
      // Send request body if present
      if (options.body) {
        if (typeof options.body === 'string') {
          req.write(options.body)
        } else if (Buffer.isBuffer(options.body)) {
          req.write(options.body)
        } else {
          req.write(JSON.stringify(options.body))
        }
      }
      
      req.end()
      } catch (error) {
        console.error(`❌ Error setting up HTTPS request for ${url}:`, error)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }
  
  // Fallback to regular fetch
  console.log(`⚠️ Using regular fetch (httpsAgent not available or not HTTPS URL): ${url}`)
  return fetch(url, options)
}

interface MetaAPIPosition {
  id: string
  symbol: string
  type: 'BUY' | 'SELL'
  volume: number
  profit: number
  swap: number
  commission: number
  openPrice: number
  currentPrice: number
  stopLoss?: number
  takeProfit?: number
  time?: string
  timeUpdate?: string
  comment?: string
  ticket?: string
}

interface MetaAPIAccount {
  id: string
  login: number
  name: string
  server: string
  platform: string
  type: string
  state: string
  connectionStatus: string
  region?: string
  regionId?: string
  geographicalLocation?: string
  serverRegion?: string
  [key: string]: any // Allow other fields from MetaAPI
}

/**
 * Get MetaAPI REST API base URLs to try
 * MetaAPI REST API documentation: https://metaapi.cloud/docs/client/restApi/overview/
 * Default region: London (matches account configuration)
 */
const DEFAULT_LONDON_ENDPOINT = 'https://mt-client-api-v1.london.agiliumtrade.ai'
const FALLBACK_NEW_YORK_ENDPOINT = 'https://mt-client-api-v1.new-york.agiliumtrade.ai'
const MANAGEMENT_API_ENDPOINT = 'https://api.metaapi.cloud'

function getMetaAPIBaseUrls(regionUrl?: string, useManagementApi: boolean = false): string[] {
  // IMPORTANT: MetaAPI has TWO separate APIs:
  // 1. Management API (api.metaapi.cloud) - for account management, uses Bearer token
  // 2. Trading API (mt-client-api-v1.{region}.agiliumtrade.ai) - for positions/trades, uses auth-token header
  
  const urls: string[] = []
  
  // If we need Management API, add it first
  if (useManagementApi) {
    urls.push(MANAGEMENT_API_ENDPOINT)
  }
  
  // For Trading API, use region-specific endpoints:
  // 1. Use region URL from settings if provided (highest priority)
  // Safely handle regionUrl - ensure it's a string before calling .trim()
  if (regionUrl && typeof regionUrl === 'string' && regionUrl.trim()) {
    urls.push(regionUrl.trim())
  }
  
  // 2. Check environment variable
  if (process.env.METAAPI_REGION_URL) {
    urls.push(process.env.METAAPI_REGION_URL)
  }
  
  // 3. Default to London endpoint (default for this account)
  urls.push(DEFAULT_LONDON_ENDPOINT)
  
  // 4. Fallback to New York if London fails
  urls.push(FALLBACK_NEW_YORK_ENDPOINT)
  
  // 5. If not using Management API already, add it at the end as fallback
  if (!useManagementApi) {
    urls.push(MANAGEMENT_API_ENDPOINT)
  }
  
  // Remove duplicates
  return [...new Set(urls)]
}

/**
 * Make authenticated request to MetaAPI REST API
 * Tries multiple base URLs and authentication methods
 */
async function metaAPIRequest(
  endpoint: string,
  token: string,
  options: RequestInit = {},
  regionUrl?: string,
  preferManagementApi: boolean = false
): Promise<any> {
  // Determine which API to use based on endpoint and caller preference
  // IMPORTANT: Both APIs use /users/current/... paths, but different base URLs:
  // - Management API: api.metaapi.cloud (for account management)
  // - Trading API: mt-client-api-v1.{region}.agiliumtrade.ai (for positions, trades, etc.)
  // 
  // For positions endpoint: Always use Trading API (regional), even though path is /users/current/...
  // For account listing: Always use Management API
  // For other operations: Use preferManagementApi parameter to decide
  
  // Determine which API based on endpoint pattern and caller preference:
  // - Positions/trades endpoints: ALWAYS Trading API (regional)
  // - Account listing: Management API
  // - Otherwise: Use preferManagementApi parameter
  const isPositionsOrTrades = endpoint.includes('/positions') || endpoint.includes('/trades') || endpoint.includes('/account-information')
  
  let useManagementApi: boolean
  if (preferManagementApi === false) {
    // Explicitly requested Trading API
    useManagementApi = false
  } else if (isPositionsOrTrades) {
    // Positions/trades always use Trading API
    useManagementApi = false
  } else if (endpoint === '/users/current/accounts' || (endpoint.startsWith('/users/current/accounts/') && !isPositionsOrTrades && !endpoint.endsWith('/account-information'))) {
    // Account listing uses Management API
    useManagementApi = true
  } else {
    // Default to caller preference (or Management API if true)
    useManagementApi = preferManagementApi === true
  }
  
  const baseUrls = getMetaAPIBaseUrls(regionUrl, useManagementApi)
  
  // Try different authentication header formats
  // Management API uses: Authorization: Bearer {token}
  // Trading API uses: auth-token: {token} (per official API docs)
  const authHeaders = useManagementApi ? [
    { 'Authorization': `Bearer ${token}` }, // Management API - primary
    { 'X-API-Key': token }, // Management API alternative
    { 'Authorization': `Token ${token}` }, // Alternative format
  ] : [
    { 'auth-token': token }, // Trading API - CORRECT (per official docs)
    { 'X-Auth-Token': token }, // Trading API alternative
    { 'Authorization': `Bearer ${token}` }, // Fallback
  ]
  
  let lastError: Error | null = null
  let attemptNumber = 0
  const errorDetails: string[] = []
  
  // Try each base URL with each auth method
  for (const baseUrl of baseUrls) {
    for (const authHeader of authHeaders) {
      attemptNumber++
      const url = `${baseUrl}${endpoint}`
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      }
      
      try {
        console.log(`🔍 Attempt ${attemptNumber}: ${url}`)
        console.log(`   Auth header: ${Object.keys(authHeader)[0]}`)
        
        const response = await customFetch(url, {
          ...options,
          headers,
        })
        
        console.log(`   Response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Success with base URL: ${baseUrl}, auth: ${Object.keys(authHeader)[0]}`)
          return data
        }

        // Capture error details for diagnostics
        const errorText = await response.text()
        const errorDetail = `Status ${response.status}: ${errorText.substring(0, 200)}`
        errorDetails.push(errorDetail)
        
        // If 404, try next combination
        if (response.status === 404) {
          console.log(`❌ 404 with ${baseUrl}${endpoint}: ${errorDetail}`)
          continue // Try next base URL / auth combination
        }

        // For other errors (401, 403, etc.), this might be the right base URL but wrong auth
        // Try next auth method with same base URL
        if (response.status === 401 || response.status === 403) {
          console.log(`⚠️ Auth error (${response.status}) with ${baseUrl}: ${errorDetail}`)
          continue // Try next auth method
        }

        // For other errors, throw immediately
        let errorMessage = `MetaAPI request failed: ${response.status} ${response.statusText}`
        
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = `${errorMessage} - ${JSON.stringify(errorJson)}`
        } catch {
          errorMessage += ` - ${errorText}`
        }
        
        throw new Error(errorMessage)
        
      } catch (error) {
        // Network errors or other non-HTTP errors
        if (error instanceof Error && error.message.includes('MetaAPI request failed')) {
          throw error
        }
        // Store error and continue to next combination
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.log(`❌ Network/Error: ${errorMsg}`)
        errorDetails.push(`Network error: ${errorMsg}`)
        lastError = error instanceof Error ? error : new Error(String(error))
        continue
      }
    }
  }
  
  // If all combinations failed, throw helpful error with instructions
  const tried = `${baseUrls.length} base URLs × ${authHeaders.length} auth methods = ${baseUrls.length * authHeaders.length} combinations`
  
  // Build comprehensive error message with all error details
  let errorMessage = `MetaAPI request failed after trying ${tried}.\n\nAll attempts failed:\n`
  errorDetails.forEach((detail, idx) => {
    errorMessage += `${idx + 1}. ${detail}\n`
  })
  errorMessage += `\nTo fix this:\n1. Verify your MetaAPI token is valid and has required permissions\n2. Verify your Account ID is correct and exists in MetaAPI dashboard\n3. Check that your account is deployed and connected\n4. Verify token has 'trading-account-management-api' permissions\n\nLast error: ${lastError?.message || 'Unknown'}`
  
  throw new Error(errorMessage)
}

/**
 * Extract region URL from MetaAPI account object
 * Looks for various region-related fields and constructs the URL
 */
export function extractRegionUrlFromAccount(account: MetaAPIAccount): string | null {
  if (!account) {
    return null
  }

  // Try different possible region field names
  const regionValue = account.region || 
                     account.regionId || 
                     account.geographicalLocation || 
                     account.serverRegion ||
                     account.regionName ||
                     account.location

  if (!regionValue || typeof regionValue !== 'string') {
    return null
  }

  // Clean the region value (remove any URL prefixes or suffixes)
  const cleanRegion = regionValue
    .replace(/^https?:\/\//, '')
    .replace(/\.agiliumtrade\.ai.*/, '')
    .replace(/mt-client-api-v1\./, '')
    .replace(/^.*?\.(new-york|london|frankfurt|singapore|tokyo|sydney|mumbai|montreal|stockholm).*$/, '$1')
    .trim()

  if (!cleanRegion) {
    return null
  }

  // Construct region-specific URL
  const regionUrl = `https://mt-client-api-v1.${cleanRegion}.agiliumtrade.ai`
  
  console.log(`Extracted region from account: ${regionValue} -> ${cleanRegion} -> ${regionUrl}`)
  return regionUrl
}

/**
 * Get region URL from MetaAPI account by fetching account info
 */
export async function getRegionUrlFromAccount(accountId: string, token: string): Promise<string | null> {
  try {
    console.log(`Fetching account info to extract region URL for account: ${accountId}`)
    
    // SOLUTION 1: Try to get region from account list response (often has more complete data)
    // NOTE: Account listing causes 404 errors, so we skip it and go directly to account endpoints
    // This is optional - if needed, uncomment below, but it's not necessary for region detection
    /*
    try {
      console.log('Solution 1: Attempting to get region from account list...')
      const accounts = await listAccounts(token)
      console.log(`Found ${accounts.length} account(s) in list`)
      
      // Find the account in the list
      const foundAccount = accounts.find(acc => acc.id === accountId)
      if (foundAccount) {
        console.log('Account found in list, checking for region info...')
        console.log('Account list entry fields:', Object.keys(foundAccount))
        
        // Extract region from list entry
        const regionUrl = extractRegionUrlFromAccount(foundAccount)
        if (regionUrl) {
          console.log(`✓ Successfully detected region URL from account list: ${regionUrl}`)
          return regionUrl
        }
      }
    } catch (listError) {
      console.warn('Solution 1 (account list) failed:', listError instanceof Error ? listError.message : listError)
    }
    */
    
    // SOLUTION 2: Try account replica endpoints
    try {
      console.log('Solution 2: Attempting to get region from account replicas...')
      const managementApiUrl = 'https://api.metaapi.cloud'
      const authHeaders = [
        { 'Authorization': `Bearer ${token}` },
        { 'auth-token': token },
        { 'X-Auth-Token': token },
      ]
      
      const replicaEndpoints = [
        `/users/current/accounts/${accountId}/replicas`,
        `/v1/users/current/accounts/${accountId}/replicas`,
        `/v2/users/current/accounts/${accountId}/replicas`,
      ]
      
      for (const endpoint of replicaEndpoints) {
        for (const authHeader of authHeaders) {
          try {
            const url = `${managementApiUrl}${endpoint}`
            const response = await customFetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...authHeader
              }
            })
            
            if (response.ok) {
              const replicas = await response.json()
              console.log('Found replicas data:', replicas)
              
              // Check if replicas array or object with region info
              const replicaList = Array.isArray(replicas) ? replicas : (replicas.items || replicas.data || [])
              if (replicaList.length > 0 && replicaList[0]) {
                const regionUrl = extractRegionUrlFromAccount(replicaList[0] as MetaAPIAccount)
                if (regionUrl) {
                  console.log(`✓ Successfully detected region URL from replicas: ${regionUrl}`)
                  return regionUrl
                }
              }
            }
          } catch (fetchError) {
            continue
          }
        }
      }
    } catch (replicaError) {
      console.warn('Solution 2 (replicas) failed:', replicaError instanceof Error ? replicaError.message : replicaError)
    }
    
    // SOLUTION 3: Try API access settings endpoints
    try {
      console.log('Solution 3: Attempting to get region from API access settings...')
      const managementApiUrl = 'https://api.metaapi.cloud'
      const authHeaders = [
        { 'Authorization': `Bearer ${token}` },
        { 'auth-token': token },
        { 'X-Auth-Token': token },
      ]
      
      const apiAccessEndpoints = [
        `/users/current/accounts/${accountId}/api-access`,
        `/users/current/settings/api-access`,
        `/v1/users/current/settings/api-access`,
      ]
      
      for (const endpoint of apiAccessEndpoints) {
        for (const authHeader of authHeaders) {
          try {
            const url = `${managementApiUrl}${endpoint}`
            const response = await customFetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...authHeader
              }
            })
            
            if (response.ok) {
              const apiAccess = await response.json()
              console.log('Found API access data:', apiAccess)
              
              // Look for region URL or trading API URL in response
              if (apiAccess.regionUrl || apiAccess.tradingApiUrl || apiAccess.region) {
                const url = apiAccess.regionUrl || apiAccess.tradingApiUrl
                const region = apiAccess.region
                
                if (url && typeof url === 'string') {
                  console.log(`✓ Successfully found region URL from API access: ${url}`)
                  return url
                }
                
                if (region && typeof region === 'string') {
                  const regionUrl = `https://mt-client-api-v1.${region}.agiliumtrade.ai`
                  console.log(`✓ Successfully constructed region URL from API access: ${regionUrl}`)
                  return regionUrl
                }
              }
            }
          } catch (fetchError) {
            continue
          }
        }
      }
    } catch (apiAccessError) {
      console.warn('Solution 3 (API access) failed:', apiAccessError instanceof Error ? apiAccessError.message : apiAccessError)
    }
    
    // SOLUTION 4: Try direct Management API account query
    try {
      console.log('Solution 4: Attempting to get account info via Management API...')
      const managementApiUrl = 'https://api.metaapi.cloud'
      const authHeaders = [
        { 'Authorization': `Bearer ${token}` },
        { 'auth-token': token },
        { 'X-Auth-Token': token },
      ]
      
      const endpoints = [
        `/v1/users/current/accounts/${accountId}`,
        `/v2/users/current/accounts/${accountId}`,
        `/users/current/accounts/${accountId}`,
      ]
      
      let account: MetaAPIAccount | null = null
      
      for (const endpoint of endpoints) {
        for (const authHeader of authHeaders) {
          try {
            const url = `${managementApiUrl}${endpoint}`
            const response = await customFetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...authHeader
              }
            })
            
            if (response.ok) {
              account = await response.json()
              console.log(`✓ Successfully fetched account via Management API`)
              break
            }
          } catch (fetchError) {
            continue
          }
        }
        if (account) break
      }
      
      if (account) {
        console.log('Account response fields:', Object.keys(account))
        const regionUrl = extractRegionUrlFromAccount(account)
        if (regionUrl) {
          console.log(`✓ Successfully detected region URL: ${regionUrl}`)
          return regionUrl
        }
      }
    } catch (managementError) {
      console.warn('Solution 4 (direct account query) failed:', managementError instanceof Error ? managementError.message : managementError)
    }
    
    // All solutions failed - return null
    console.warn('All region detection methods failed. User will need to manually enter region URL.')
    return null
  } catch (error) {
    console.error('Error getting region URL from account:', error)
    return null
  }
}

/**
 * Create a new MetaAPI account using SDK
 * Uses MetaAPI Node.js SDK's createAccount() method (same approach as other SaaS platforms)
 */
export async function createMetaAPIAccount(
  token: string,
  accountData: {
    login: string
    password: string
    server: string
    platform: 'mt4' | 'mt5'
    name?: string
    broker?: string
  }
): Promise<MetaAPIAccount> {
  try {
    console.log('[MetaAPI] Creating account via SDK...')
    console.log('[MetaAPI] Account data:', {
      login: accountData.login,
      server: accountData.server,
      platform: accountData.platform,
      name: accountData.name,
      broker: accountData.broker,
      hasPassword: !!accountData.password
    })

    // Use MetaAPI SDK instead of REST API
    // This is how other SaaS platforms create accounts programmatically
    const MetaApiModule = await import('metaapi.cloud-sdk')
    const MetaApi = MetaApiModule.default
    
    if (!MetaApi) {
      throw new Error('MetaAPI SDK not available. Please ensure metaapi.cloud-sdk is installed.')
    }

    // Create MetaAPI instance
    const api = new MetaApi(token)

    // Create account using SDK's createAccount method
    // SDK expects platform as lowercase 'mt4' or 'mt5'
    // SDK expects login as STRING (not number!)
    // SDK requires magic field (usually 0 for MT5)
    const loginString = String(accountData.login)
    
    const createAccountParams: any = {
      login: loginString, // SDK expects string, not number
      password: accountData.password,
      server: accountData.server,
      platform: accountData.platform.toLowerCase() as 'mt4' | 'mt5',
      name: accountData.name || `${accountData.login}@${accountData.server}`,
      magic: 0 // Required field - usually 0 for MT5 accounts
      // Note: broker field is not supported by SDK, so we omit it
    }
    
    console.log('[MetaAPI] Creating account with params:', {
      ...createAccountParams,
      password: '***',
      login: loginString
    })
    
    const account = await api.metatraderAccountApi.createAccount(createAccountParams)

    console.log('[MetaAPI] Account created successfully via SDK')
    console.log('[MetaAPI] Account ID:', account.id)
    console.log('[MetaAPI] Account details:', {
      id: account.id,
      name: account.name,
      login: account.login,
      server: account.server,
      state: account.state
    })

    // Normalize response to ensure it has the expected structure
    // SDK returns account with id as string, but our interface expects it
    const accountId = typeof account.id === 'string' ? account.id : String(account.id)
    const accountLogin = typeof account.login === 'number' ? account.login : Number(account.login) || Number(accountData.login)
    
    // Build response object matching MetaAPIAccount interface
    const response: MetaAPIAccount = {
      id: accountId,
      name: account.name || accountData.name || `${accountData.login}@${accountData.server}`,
      login: accountLogin,
      server: account.server || accountData.server,
      platform: accountData.platform.toLowerCase(),
      type: (account as any).type || 'cloud',
      state: String((account as any).state || ''),
      connectionStatus: String((account as any).connectionStatus || ''),
      // Include all other fields from SDK response
      ...(account as any)
    }
    
    return response
  } catch (error) {
    console.error('[MetaAPI] Error creating account via SDK:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('[MetaAPI] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      // Check if error has additional properties
      const errorAny = error as any
      if (errorAny.response) {
        console.error('[MetaAPI] Error response:', errorAny.response)
      }
      if (errorAny.body) {
        console.error('[MetaAPI] Error body:', errorAny.body)
      }
      if (errorAny.details) {
        console.error('[MetaAPI] Error details:', errorAny.details)
      }
    }
    
    // Provide specific error messages for common SDK errors
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid token')) {
      throw new Error('MetaAPI authentication failed. Please check your API token.')
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      throw new Error('You do not have permission to create MetaAPI accounts. Please contact support.')
    } else if (errorMessage.includes('Validation failed') || errorMessage.includes('validation')) {
      // Extract validation details if available
      let validationDetails = ''
      if (error instanceof Error) {
        const errorAny = error as any
        if (errorAny.details && Array.isArray(errorAny.details)) {
          // Format validation errors in a user-friendly way
          const errors = errorAny.details.map((err: any) => {
            if (err.parameter === 'magic') {
              return 'Magic field is required (this is handled automatically)'
            } else if (err.parameter === 'login') {
              return 'Login must be a string (account number as text)'
            } else if (err.parameter === 'broker') {
              return 'Broker field is not supported - please remove it'
            } else {
              return `${err.parameter}: ${err.message}`
            }
          })
          validationDetails = `: ${errors.join(', ')}`
        } else if (errorAny.message && errorAny.message.includes('[')) {
          // Try to parse validation errors from message
          try {
            const match = errorAny.message.match(/\[(.*)\]/)
            if (match) {
              const errors = JSON.parse(match[0])
              const formatted = errors.map((err: any) => {
                if (err.parameter === 'magic') return 'Magic field required'
                if (err.parameter === 'login') return 'Login must be a string'
                if (err.parameter === 'broker') return 'Broker field not supported'
                return `${err.parameter}: ${err.message}`
              })
              validationDetails = `: ${formatted.join(', ')}`
            }
          } catch {
            validationDetails = ': ' + errorAny.message
          }
        }
      }
      
      if (!validationDetails) {
        validationDetails = '. Please check that all required fields are provided and valid (login as string, password, server, platform).'
      }
      
      throw new Error(`Account validation failed${validationDetails}`)
    } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request') || errorMessage.includes('Invalid')) {
      throw new Error(`Invalid account credentials: ${errorMessage}`)
    } else if (errorMessage.includes('409') || errorMessage.includes('Conflict') || errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      throw new Error('An account with these credentials already exists in MetaAPI.')
    } else if (errorMessage.includes('server') || errorMessage.includes('Server')) {
      throw new Error(`Invalid server name: ${errorMessage}. Please check your MT5 server name.`)
    } else if (errorMessage.includes('login') || errorMessage.includes('Login')) {
      throw new Error(`Invalid login credentials: ${errorMessage}. Please check your MT5 account number and password.`)
    }
    
    throw new Error(`Failed to create MetaAPI account: ${errorMessage}`)
  }
}

/**
 * List all accounts to verify token and get account structure
 * This helps identify the correct endpoint format
 */
export async function listAccounts(token: string, regionUrl?: string): Promise<MetaAPIAccount[]> {
  // Account listing is ONLY available on Management API (api.metaapi.cloud), not Trading API
  // Management API endpoints for listing accounts
  const possibleListEndpoints = [
    `/users/current/accounts`, // Management API - most common
    `/v1/users/current/accounts`, // Management API v1
    `/v2/users/current/accounts`, // Management API v2
  ]
  
  let lastError: Error | null = null
  
  // Try REST API first
  for (const endpoint of possibleListEndpoints) {
    try {
      console.log(`[MetaAPI] Trying account list endpoint: ${endpoint} (Management API)`)
      const response = await metaAPIRequest(endpoint, token, { method: 'GET' }, regionUrl, true) // Force Management API for account listing
      console.log(`[MetaAPI] Success with account list endpoint: ${endpoint}`)
      
      // Response format may vary
      let accounts: MetaAPIAccount[] = []
      if (Array.isArray(response)) {
        accounts = response
      } else if (response.accounts) {
        accounts = Array.isArray(response.accounts) ? response.accounts : []
      } else if (response.data) {
        accounts = Array.isArray(response.data) ? response.data : []
      } else if (response.items) {
        accounts = Array.isArray(response.items) ? response.items : []
      }
      
      if (accounts.length > 0) {
        return accounts
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`[MetaAPI] Failed with account list endpoint ${endpoint}: ${errorMsg}`)
      lastError = error instanceof Error ? error : new Error(String(error))
      // Continue to next endpoint
    }
  }
  
  // If REST API failed, try SDK fallback
  // Note: MetaAPI SDK doesn't have a direct getAccounts() method
  // We can only get individual accounts by ID, so SDK fallback is limited
  try {
    console.log('[MetaAPI] REST API failed, SDK does not support listing all accounts directly')
    console.log('[MetaAPI] Note: MetaAPI SDK requires account IDs to fetch individual accounts')
    // SDK doesn't have getAccounts() method - we can only get accounts by ID
    // So we can't provide a full SDK fallback for listing
  } catch (sdkError) {
    console.warn('[MetaAPI] SDK check failed:', sdkError)
  }
  
  // If all methods failed, throw error
  throw new Error(`Failed to list accounts after trying ${possibleListEndpoints.length} REST endpoints and SDK fallback. Last error: ${lastError?.message}. Please verify:\n1. Token is valid\n2. Token has required permissions\n3. Check MetaAPI REST API documentation for correct endpoint format`)
}

/**
 * Get account information
 * Tries multiple possible endpoint formats, prioritizing the /account-information endpoint
 * Skips account listing to avoid 404 errors - goes directly to account endpoints
 */
export async function getAccountInfo(accountId: string, token: string, regionUrl?: string): Promise<MetaAPIAccount> {
  // Skip account listing step - it causes 404 errors and is not necessary.
  // We go directly to the account endpoints, starting with the most reliable one.
  // The /account-information endpoint works reliably and is what the admin section uses.
  
  // Try direct account access endpoints
  // Prioritize /account-information first as it's the most reliable endpoint (used by admin section)
  // Management API (api.metaapi.cloud) uses /users/current/accounts/{accountId}
  // Trading API (mt-client-api-v1.{region}.agiliumtrade.ai) uses /users/current/accounts/{accountId}/account-information
  const possibleEndpoints = [
    `/users/current/accounts/${accountId}/account-information`, // Trading API account info endpoint (most reliable - used by admin section)
    `/users/current/accounts/${accountId}`, // Both APIs use this format
    `/v1/users/current/accounts/${accountId}`, // Management API v1
    `/v2/users/current/accounts/${accountId}`, // Management API v2
  ]
  
  let lastError: Error | null = null
  
  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`Trying account endpoint: ${endpoint}`)
      // For account info, try both APIs
      // Management API: api.metaapi.cloud/users/current/accounts/{id}
      // Trading API: mt-client-api-v1.{region}.agiliumtrade.ai/users/current/accounts/{id}/account-information
      const isAccountInfoEndpoint = endpoint.includes('/account-information')
      const preferManagement = !isAccountInfoEndpoint
      const account = await metaAPIRequest(endpoint, token, {}, regionUrl, preferManagement)
      console.log(`Success with endpoint: ${endpoint}`)
      
      // Log region info if present
      if (account.region || account.regionId || account.geographicalLocation || account.serverRegion) {
        const regionInfo = account.region || account.regionId || account.geographicalLocation || account.serverRegion
        const detectedRegionUrl = extractRegionUrlFromAccount(account)
        if (detectedRegionUrl) {
          console.log(`✓ Detected region: ${regionInfo}, using URL: ${detectedRegionUrl}`)
        } else {
          console.log(`Found region field: ${regionInfo}, but could not construct URL`)
        }
      }
      
      return account
    } catch (error) {
      console.log(`Failed with endpoint ${endpoint}:`, error instanceof Error ? error.message : error)
      lastError = error instanceof Error ? error : new Error(String(error))
      // Continue to next endpoint
    }
  }
  
  // If all endpoints failed, throw the last error with helpful message
  throw new Error(`Failed to get account info after trying ${possibleEndpoints.length} endpoints. Last error: ${lastError?.message}. Please verify:\n1. Account ID is correct: ${accountId}\n2. Account exists in MetaAPI dashboard\n3. Account is deployed in MetaAPI\n4. Token is valid and has required permissions`)
}

/**
 * Get open positions from MT5 account using MetaAPI REST API
 * Note: This requires the account to be deployed and connected
 */
export async function getPositions(accountId: string, token: string, regionUrl?: string): Promise<MetaAPIPosition[]> {
  try {
    let correctRegionUrl = regionUrl
    
    // If no region URL provided, try to detect it
    if (!correctRegionUrl) {
      console.log('No region URL provided, detecting region from account info...')
      try {
        const accountInfo = await getAccountInfo(accountId, token)
        correctRegionUrl = extractRegionUrlFromAccount(accountInfo)
        
        if (correctRegionUrl) {
          console.log(`✓ Detected region: ${correctRegionUrl}`)
          console.log(`Account deployed in: ${accountInfo.region || accountInfo.regionId || accountInfo.geographicalLocation || 'unknown'}`)
        }
      } catch (detectError) {
        console.warn('Failed to auto-detect region, will try default regions:', detectError instanceof Error ? detectError.message : detectError)
      }
    }
    
    // If still no region, try with the endpoint that tries all regions
    if (!correctRegionUrl) {
      console.log('Using region detection via multi-region endpoint attempt')
      correctRegionUrl = undefined // Will trigger fallback logic in getMetaAPIBaseUrls
    }
    
    console.log(`Fetching positions with region: ${correctRegionUrl || 'auto-detect'}`)
    
    // Use the endpoint - will try multiple regions if correctRegionUrl is undefined
    const endpoint = `/users/current/accounts/${accountId}/positions`
    
    try {
      // Force Trading API (false) - don't use Management API
      const response = await metaAPIRequest(endpoint, token, { method: 'GET' }, correctRegionUrl, false)
      console.log(`✅ Success with positions endpoint: ${endpoint}`)
      
      // Response format may vary - handle both array and object responses
      if (Array.isArray(response)) {
        console.log(`Found ${response.length} positions via REST API`)
        return response
      } else if (response.positions) {
        const positions = Array.isArray(response.positions) ? response.positions : []
        console.log(`Found ${positions.length} positions in response.positions`)
        return positions
      } else if (response.data) {
        const positions = Array.isArray(response.data) ? response.data : []
        console.log(`Found ${positions.length} positions in response.data`)
        return positions
      } else if (response.result) {
        const positions = Array.isArray(response.result) ? response.result : []
        console.log(`Found ${positions.length} positions in response.result`)
        return positions
      } else if (response.items) {
        const positions = Array.isArray(response.items) ? response.items : []
        console.log(`Found ${positions.length} positions in response.items`)
        return positions
      }
      
      // If response is an object but no positions found, return empty
      console.log('Response received but no positions array found, returning empty array')
      return []
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`Failed to get positions: ${errorMsg}`)
      throw error
    }
  } catch (error) {
    console.error('Error getting positions via REST API:', error)
    throw error
  }
}

/**
 * Get deal history from MT5 account using MetaAPI REST API
 * This can be used to get close prices for closed positions
 */
export async function getDeals(
  accountId: string, 
  token: string, 
  regionUrl?: string,
  startTime?: Date,
  endTime?: Date,
  positionId?: string
): Promise<any[]> {
  // Ensure regionUrlToUse is always a string
  const regionUrlToUse = (regionUrl && typeof regionUrl === 'string') ? regionUrl : DEFAULT_LONDON_ENDPOINT
  
  try {
    console.log('Fetching deals/history from MetaAPI...', { accountId, positionId, startTime, endTime })
    
    // MetaAPI History API endpoint format:
    // GET /users/current/accounts/:accountId/history-deals/time/:startTime/:endTime
    // Dates should be in ISO format or Unix timestamp
    
    // Try multiple endpoint patterns (correct one first)
    const possibleEndpoints: string[] = []
    
    // 1. Correct MetaAPI History API endpoint (time range)
    if (startTime && endTime) {
      // Format dates as ISO strings (URL encoded)
      const startTimeStr = encodeURIComponent(startTime.toISOString())
      const endTimeStr = encodeURIComponent(endTime.toISOString())
      possibleEndpoints.push(`/users/current/accounts/${accountId}/history-deals/time/${startTimeStr}/${endTimeStr}`)
      
      // Also try with Unix timestamps
      const startUnix = Math.floor(startTime.getTime() / 1000)
      const endUnix = Math.floor(endTime.getTime() / 1000)
      possibleEndpoints.push(`/users/current/accounts/${accountId}/history-deals/time/${startUnix}/${endUnix}`)
    }
    
    // 2. History deals endpoint without time range
    possibleEndpoints.push(`/users/current/accounts/${accountId}/history-deals`)
    
    // 3. Legacy endpoints (for backward compatibility)
    if (startTime && endTime) {
      const queryParams = `?startTime=${encodeURIComponent(startTime.toISOString())}&endTime=${encodeURIComponent(endTime.toISOString())}`
      possibleEndpoints.push(`/users/current/accounts/${accountId}/history${queryParams}`)
    }
    possibleEndpoints.push(`/users/current/accounts/${accountId}/deals`)
    possibleEndpoints.push(`/users/current/accounts/${accountId}/history/deals`)
    possibleEndpoints.push(`/accounts/${accountId}/deals`)
    possibleEndpoints.push(`/accounts/${accountId}/history`)
    
    let lastError: Error | null = null
    
    for (const ep of possibleEndpoints) {
      try {
        console.log(`Trying deals/history endpoint: ${ep}`)
        // Deals/history are on Trading API (regional)
        const response = await metaAPIRequest(ep, token, { method: 'GET' }, regionUrlToUse, false)
        console.log(`Success with deals endpoint: ${ep}`)
        
        // Response format may vary
        if (Array.isArray(response)) {
          console.log(`Found ${response.length} deals via REST API`)
          return response
        } else if (response.deals) {
          const deals = Array.isArray(response.deals) ? response.deals : []
          console.log(`Found ${deals.length} deals in response.deals`)
          return deals
        } else if (response.data) {
          const deals = Array.isArray(response.data) ? response.data : []
          console.log(`Found ${deals.length} deals in response.data`)
          return deals
        } else if (response.items) {
          const deals = Array.isArray(response.items) ? response.items : []
          console.log(`Found ${deals.length} deals in response.items`)
          return deals
        } else if (response.history) {
          const deals = Array.isArray(response.history) ? response.history : []
          console.log(`Found ${deals.length} deals in response.history`)
          return deals
        }
        
        // If response is an object but no deals found, return empty
        console.log('Response received but no deals array found, returning empty array')
        return []
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.log(`Failed with endpoint ${ep}: ${errorMsg}`)
        lastError = error instanceof Error ? error : new Error(String(error))
        // Continue to next endpoint
      }
    }
    
    // If all endpoints failed, log warning but don't throw (deals might not be available)
    console.warn(`Could not fetch deals from MetaAPI. Last error: ${lastError?.message}`)
    return []
  } catch (error) {
    console.error('Error getting deals via REST API:', error)
    // Don't throw - deals might not be available, fallback to other methods
    return []
  }
}

/**
 * Get order history from MT5 account using MetaAPI REST API
 * Orders contain SL/TP information for closed positions
 */
export async function getHistoryOrders(
  accountId: string,
  token: string,
  regionUrl?: string,
  startTime?: Date,
  endTime?: Date
): Promise<any[]> {
  const regionUrlToUse = (regionUrl && typeof regionUrl === 'string') ? regionUrl : DEFAULT_LONDON_ENDPOINT
  
  try {
    console.log('Fetching order history from MetaAPI...', { accountId, startTime, endTime })
    
    const possibleEndpoints: string[] = []
    
    // MetaAPI History Orders API endpoint format
    if (startTime && endTime) {
      const startTimeStr = encodeURIComponent(startTime.toISOString())
      const endTimeStr = encodeURIComponent(endTime.toISOString())
      possibleEndpoints.push(`/users/current/accounts/${accountId}/history-orders/time/${startTimeStr}/${endTimeStr}`)
      
      const startUnix = Math.floor(startTime.getTime() / 1000)
      const endUnix = Math.floor(endTime.getTime() / 1000)
      possibleEndpoints.push(`/users/current/accounts/${accountId}/history-orders/time/${startUnix}/${endUnix}`)
    }
    
    possibleEndpoints.push(`/users/current/accounts/${accountId}/history-orders`)
    possibleEndpoints.push(`/users/current/accounts/${accountId}/orders`)
    
    for (const endpoint of possibleEndpoints) {
      try {
        const response = await metaAPIRequest(endpoint, token, { method: 'GET' }, regionUrlToUse, false)
        
        if (Array.isArray(response)) {
          console.log(`✅ Successfully fetched ${response.length} orders via ${endpoint}`)
          return response
        } else if (response.orders || response.items || response.data) {
          const orders = response.orders || response.items || response.data
          if (Array.isArray(orders)) {
            console.log(`✅ Successfully fetched ${orders.length} orders via ${endpoint}`)
            return orders
          }
        }
      } catch (error) {
        // Continue to next endpoint
        continue
      }
    }
    
    console.warn('⚠️ Could not fetch order history via REST API')
    return []
  } catch (error) {
    console.error('Error getting order history:', error)
    return []
  }
}

/**
 * Get current orders from MT5 account using MetaAPI REST API
 */
export async function getOrders(
  accountId: string,
  token: string,
  regionUrl?: string
): Promise<any[]> {
  const regionUrlToUse = (regionUrl && typeof regionUrl === 'string') ? regionUrl : DEFAULT_LONDON_ENDPOINT
  
  try {
    console.log('Fetching orders from MetaAPI...', { accountId })
    
    const possibleEndpoints = [
      `/users/current/accounts/${accountId}/orders`,
      `/users/current/accounts/${accountId}/pending-orders`,
      `/accounts/${accountId}/orders`
    ]
    
    for (const endpoint of possibleEndpoints) {
      try {
        const response = await metaAPIRequest(endpoint, token, { method: 'GET' }, regionUrlToUse, false)
        
        if (Array.isArray(response)) {
          console.log(`✅ Successfully fetched ${response.length} orders via ${endpoint}`)
          return response
        } else if (response.orders || response.items || response.data) {
          const orders = response.orders || response.items || response.data
          if (Array.isArray(orders)) {
            console.log(`✅ Successfully fetched ${orders.length} orders via ${endpoint}`)
            return orders
          }
        }
      } catch (error) {
        // Continue to next endpoint
        continue
      }
    }
    
    console.warn('⚠️ Could not fetch orders via REST API')
    return []
  } catch (error) {
    console.error('Error getting orders:', error)
    return []
  }
}

/**
 * Ensure account is deployed and connected
 */
async function ensureAccountDeployed(accountId: string, token: string): Promise<void> {
  try {
    const account = await getAccountInfo(accountId, token)
    
    // Deploy account if not deployed
    if (account.state !== 'DEPLOYED') {
      await metaAPIRequest(
        `/users/current/accounts/${accountId}/deploy`,
        token,
        { method: 'POST' }
      )
      
      // Wait for deployment (with timeout)
      let attempts = 0
      const maxAttempts = 30 // 30 seconds max wait
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const updatedAccount = await getAccountInfo(accountId, token)
        
        if (updatedAccount.state === 'DEPLOYED' && updatedAccount.connectionStatus === 'CONNECTED') {
          return
        }
        attempts++
      }
      
      throw new Error('Account deployment timeout')
    }
    
    // Wait for connection if not connected
    if (account.connectionStatus !== 'CONNECTED') {
      let attempts = 0
      const maxAttempts = 30
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const updatedAccount = await getAccountInfo(accountId, token)
        
        if (updatedAccount.connectionStatus === 'CONNECTED') {
          return
        }
        attempts++
      }
      
      throw new Error('Account connection timeout')
    }
  } catch (error) {
    console.error('Error ensuring account deployed:', error)
    throw error
  }
}

/**
 * Verify MetaAPI token has correct permissions
 */
export async function verifyTokenPermissions(token: string): Promise<{
  valid: boolean
  permissions: string[]
  userId?: string
  email?: string
  error?: string
}> {
  const managementEndpoints = [
    '/users/current',
    '/v1/users/current',
    '/users/current/profile'
  ]

  let lastError: string | undefined

  for (const endpoint of managementEndpoints) {
    try {
      console.log(`Verifying MetaAPI token via Management API endpoint: ${endpoint}`)
      const response = await metaAPIRequest(endpoint, token, { method: 'GET' }, undefined, true)

      if (!response || typeof response !== 'object') {
        throw new Error('Unexpected response while verifying token')
      }

      const permissionsCandidate =
        (Array.isArray(response.permissions) && response.permissions) ||
        (Array.isArray(response.scopes) && response.scopes) ||
        (Array.isArray(response.roles) && response.roles) ||
        (response.token && Array.isArray(response.token?.scopes) ? response.token.scopes : []) ||
        []

      const permissions = permissionsCandidate.filter((value: unknown): value is string => typeof value === 'string')

      return {
        valid: true,
        permissions,
        userId: typeof response.id === 'string' ? response.id : undefined,
        email: typeof response.email === 'string' ? response.email : undefined
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(`Token verification attempt failed for ${endpoint}: ${errorMsg}`)
      lastError = errorMsg
      continue
    }
  }

  console.error('Token verification failed:', lastError)
  return {
    valid: false,
    permissions: [],
    error: lastError ?? 'Unknown error verifying MetaAPI token'
  }
}

/**
 * Test MetaAPI connection with comprehensive diagnostics
 */
export async function testMetaAPIConnection(accountId: string, token: string, regionUrl?: string): Promise<{
  managementApiWorks: boolean
  tradingApiWorks: boolean
  accountExists: boolean
  accountDeployed: boolean
  accountConnected: boolean
  regionUrl: string | null
  errors: string[]
}> {
  const result = {
    managementApiWorks: false,
    tradingApiWorks: false,
    accountExists: false,
    accountDeployed: false,
    accountConnected: false,
    regionUrl: null as string | null,
    errors: [] as string[]
  }
  
  try {
    let accountInfoFromManagement: MetaAPIAccount | null = null
    
    console.log('🔍 Starting MetaAPI connection diagnostics...')
    
    // Test 1: Verify token
    console.log('Test 1: Verifying token...')
    const tokenCheck = await verifyTokenPermissions(token)
    if (!tokenCheck.valid) {
      result.errors.push(`Token verification failed: ${tokenCheck.error}`)
      return result
    }
    console.log('✓ Token is valid')
    
    // Test 2: Check Management API connectivity
    console.log('Test 2: Testing Management API connectivity...')
    try {
      const accounts = await listAccounts(token)
      result.managementApiWorks = true
      console.log('✓ Management API is working')
      
      const matchingAccount = accounts.find(acc => acc.id === accountId)
      if (matchingAccount) {
        accountInfoFromManagement = matchingAccount
        result.accountExists = true
        if (typeof matchingAccount.state === 'string') {
          result.accountDeployed = matchingAccount.state.toUpperCase() === 'DEPLOYED'
        }
        if (typeof matchingAccount.connectionStatus === 'string') {
          result.accountConnected = matchingAccount.connectionStatus.toUpperCase() === 'CONNECTED'
        }
        const detectedRegion = extractRegionUrlFromAccount(matchingAccount)
        if (detectedRegion) {
          result.regionUrl = detectedRegion
        }
        console.log(`✓ Account ${accountId} located via Management API list`)
      } else {
        result.errors.push(`Account ${accountId} not found in Management API account list`)
        console.warn(`Account ${accountId} was not returned by listAccounts`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(`Management API failed: ${errorMsg}`)
      console.log('✗ Management API failed')
    }
    
    // Test 3: Check if account exists
    console.log('Test 3: Checking if account exists...')
    try {
      const detailedAccountInfo =
        accountInfoFromManagement && accountInfoFromManagement.state && accountInfoFromManagement.connectionStatus
          ? accountInfoFromManagement
          : await getAccountInfo(accountId, token)
      
      result.accountExists = true
      result.accountDeployed = detailedAccountInfo.state === 'DEPLOYED'
      result.accountConnected = detailedAccountInfo.connectionStatus === 'CONNECTED'
      
      // Extract region URL
      result.regionUrl = extractRegionUrlFromAccount(detailedAccountInfo) || result.regionUrl || regionUrl || null
      
      console.log(`✓ Account exists: ${accountId}`)
      console.log(`  State: ${detailedAccountInfo.state}`)
      console.log(`  Connection: ${detailedAccountInfo.connectionStatus}`)
      console.log(`  Region URL: ${result.regionUrl || 'Not found'}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(`Account check failed: ${errorMsg}`)
      console.log('✗ Account check failed')
    }
    
    // Test 4: Test Trading API connectivity with positions endpoint
    console.log('Test 4: Testing Trading API connectivity...')
    if (result.accountExists) {
      try {
        const regionToUse = result.regionUrl || regionUrl
        if (!regionToUse) {
          throw new Error('Region URL not available for Trading API test')
        }
        // Just try to access the endpoint, don't worry about results
        await metaAPIRequest(`/users/current/accounts/${accountId}/positions`, token, { method: 'GET' }, regionToUse, false)
        result.tradingApiWorks = true
        console.log('✓ Trading API is working')
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        result.errors.push(`Trading API positions test failed: ${errorMsg}`)
        console.log('✗ Trading API failed')
      }
    } else {
      result.errors.push('Cannot test Trading API: account info not available')
    }
    
    console.log('🔍 Diagnostics complete')
    console.log('Results:', result)
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.errors.push(`Diagnostic error: ${errorMsg}`)
    console.error('Error during diagnostics:', error)
  }
  
  return result
}

/**
 * Get CPU credit usage for a MetaAPI account
 * Tries Management API first, then alternative endpoints
 */
export async function getCPUCreditUsage(
  accountId: string,
  token: string,
  regionUrl?: string
): Promise<{
  used: number
  available: number
  remaining: number
  percentage: number
} | null> {
  try {
    console.log(`[MetaAPI] Fetching CPU credit usage for account ${accountId}`)
    
    // Try multiple endpoints - credits are typically on Management API
    const possibleEndpoints = [
      `/users/current/accounts/${accountId}/credits`, // Account-specific credits
      `/users/current/credits`, // User-level credits
      `/users/current/usage/credits`, // Alternative format
      `/users/current/accounts/${accountId}/usage/credits`, // Account usage credits
    ]
    
    // Ensure regionUrlToUse is always a string
    const regionUrlToUse = (regionUrl && typeof regionUrl === 'string') ? regionUrl : DEFAULT_LONDON_ENDPOINT
    let lastError: Error | null = null
    
    // Try Management API first (preferManagementApi: true)
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`[MetaAPI] Trying credits endpoint: ${endpoint} (Management API)`)
        const response = await metaAPIRequest(endpoint, token, { method: 'GET' }, regionUrlToUse, true)
        
        // Handle different response formats
        const used = response.used || response.usedCredits || response.cpuCreditsUsed || response.creditsUsed || 0
        const available = response.available || response.availableCredits || response.cpuCreditsAvailable || response.creditsAvailable || 0
        const remaining = response.remaining || response.remainingCredits || (available - used)
        const percentage = available > 0 ? (used / available) * 100 : 0
        
        if (available > 0 || used > 0) {
          console.log(`[MetaAPI] Successfully fetched credits from ${endpoint}`)
          return {
            used,
            available,
            remaining,
            percentage: Math.round(percentage * 100) / 100
          }
        }
      } catch (error) {
        console.log(`[MetaAPI] Endpoint ${endpoint} failed:`, error instanceof Error ? error.message : error)
        lastError = error instanceof Error ? error : new Error(String(error))
        continue
      }
    }
    
    // If Management API failed, try Trading API as fallback
    try {
      console.log(`[MetaAPI] Trying Trading API for credits...`)
      const endpoint = `/users/current/accounts/${accountId}/credits`
      const response = await metaAPIRequest(endpoint, token, { method: 'GET' }, regionUrlToUse, false)
      
      const used = response.used || response.usedCredits || response.cpuCreditsUsed || 0
      const available = response.available || response.availableCredits || response.cpuCreditsAvailable || 0
      const remaining = response.remaining || response.remainingCredits || (available - used)
      const percentage = available > 0 ? (used / available) * 100 : 0
      
      if (available > 0 || used > 0) {
        return {
          used,
          available,
          remaining,
          percentage: Math.round(percentage * 100) / 100
        }
      }
    } catch (error) {
      console.log(`[MetaAPI] Trading API credits endpoint also failed`)
    }
    
    console.warn(`[MetaAPI] All credit endpoints failed. Last error: ${lastError?.message}`)
    return null
  } catch (error) {
    console.error(`[MetaAPI] Error fetching CPU credit usage for ${accountId}:`, error)
    return null
  }
}

/**
 * Get account quota information
 * Tries Management API endpoints, with SDK fallback
 */
export async function getAccountQuota(
  token: string,
  regionUrl?: string
): Promise<{
  accounts: { max: number; used: number }
  subscriptionSlots: { max: number; used: number }
  provisioningProfiles: { max: number; used: number }
} | null> {
  try {
    console.log('[MetaAPI] Fetching account quota information')
    
    // Try multiple possible endpoints (all on Management API)
    const possibleEndpoints = [
      '/users/current/quota',
      '/users/current/account-quota',
      '/users/current/quotas',
      '/users/current/limits',
      '/users/current/subscription/limits'
    ]
    
    // Ensure regionUrlToUse is always a string
    const regionUrlToUse = (regionUrl && typeof regionUrl === 'string') ? regionUrl : DEFAULT_LONDON_ENDPOINT
    let quotaData: any = null
    let lastError: Error | null = null
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`[MetaAPI] Trying quota endpoint: ${endpoint} (Management API)`)
        quotaData = await metaAPIRequest(endpoint, token, { method: 'GET' }, regionUrlToUse, true)
        if (quotaData) {
          console.log(`[MetaAPI] Successfully fetched quota from ${endpoint}`)
          break
        }
      } catch (error) {
        console.log(`[MetaAPI] Endpoint ${endpoint} failed:`, error instanceof Error ? error.message : error)
        lastError = error instanceof Error ? error : new Error(String(error))
        continue
      }
    }
    
    // If REST API failed, we can't use SDK fallback for quota
    // Note: SDK doesn't have getAccounts() method, so we can't get account count
    if (!quotaData) {
      console.log('[MetaAPI] Quota endpoints not available, SDK cannot provide account count (no getAccounts() method)')
    }
    
    if (!quotaData) {
      // Final fallback: return default quotas
      console.log('[MetaAPI] All quota endpoints failed, returning default quotas')
      return {
        accounts: {
          max: 100, // Default max
          used: 0 // Cannot determine
        },
        subscriptionSlots: {
          max: 25, // Default max
          used: 0 // Cannot determine
        },
        provisioningProfiles: {
          max: 100, // Default max
          used: 0 // Cannot determine
        }
      }
    }
    
    // Extract quota information from response
    return {
      accounts: {
        max: quotaData.accounts?.max || quotaData.maxAccounts || quotaData.accountLimit || 100,
        used: quotaData.accounts?.used || quotaData.usedAccounts || quotaData.accountCount || 0
      },
      subscriptionSlots: {
        max: quotaData.subscriptionSlots?.max || quotaData.maxSubscriptionSlots || quotaData.subscriptionLimit || 25,
        used: quotaData.subscriptionSlots?.used || quotaData.usedSubscriptionSlots || quotaData.subscriptionCount || 0
      },
      provisioningProfiles: {
        max: quotaData.provisioningProfiles?.max || quotaData.maxProvisioningProfiles || quotaData.profileLimit || 100,
        used: quotaData.provisioningProfiles?.used || quotaData.usedProvisioningProfiles || quotaData.profileCount || 0
      }
    }
  } catch (error) {
    console.error('[MetaAPI] Error fetching account quota:', error)
    return null
  }
}

/**
 * Get billing/usage summary information
 * This may not be available in all MetaAPI plans
 * Tries multiple endpoints with better error logging
 */
export async function getBillingInfo(
  token: string,
  regionUrl?: string
): Promise<{
  currentPeriod: {
    startDate: string
    endDate: string
    creditsUsed: number
    apiCalls: number
  }
  subscription: {
    plan: string
    status: string
  }
} | null> {
  try {
    console.log('[MetaAPI] Fetching billing information')
    
    // Try multiple billing endpoints (all on Management API)
    const possibleEndpoints = [
      '/users/current/billing',
      '/users/current/usage',
      '/users/current/subscription',
      '/users/current/billing/summary',
      '/users/current/usage/summary',
      '/users/current/subscription/info'
    ]
    
    // Ensure regionUrlToUse is always a string
    const regionUrlToUse = (regionUrl && typeof regionUrl === 'string') ? regionUrl : DEFAULT_LONDON_ENDPOINT
    let lastError: Error | null = null
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`[MetaAPI] Trying billing endpoint: ${endpoint} (Management API)`)
        const billingData = await metaAPIRequest(endpoint, token, { method: 'GET' }, regionUrlToUse, true)
        if (billingData) {
          // Extract billing information with multiple possible formats
          const result = {
            currentPeriod: {
              startDate: billingData.currentPeriod?.startDate || billingData.periodStart || billingData.startDate || billingData.billingPeriod?.startDate || '',
              endDate: billingData.currentPeriod?.endDate || billingData.periodEnd || billingData.endDate || billingData.billingPeriod?.endDate || '',
              creditsUsed: billingData.currentPeriod?.creditsUsed || billingData.creditsUsed || billingData.cpuCreditsUsed || billingData.totalCreditsUsed || 0,
              apiCalls: billingData.currentPeriod?.apiCalls || billingData.apiCalls || billingData.totalApiCalls || billingData.requests || 0
            },
            subscription: {
              plan: billingData.subscription?.plan || billingData.plan || billingData.subscriptionPlan || billingData.tier || 'Unknown',
              status: billingData.subscription?.status || billingData.status || billingData.subscriptionStatus || 'Unknown'
            }
          }
          
          // Only return if we got at least some meaningful data
          if (result.subscription.plan !== 'Unknown' || result.currentPeriod.startDate || result.currentPeriod.creditsUsed > 0) {
            console.log(`[MetaAPI] Successfully fetched billing info from ${endpoint}`)
            return result
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.log(`[MetaAPI] Endpoint ${endpoint} failed: ${errorMsg}`)
        lastError = error instanceof Error ? error : new Error(String(error))
        continue
      }
    }
    
    // If no billing endpoint available, return null (this is normal for some plans)
    console.log(`[MetaAPI] Billing information not available (tried ${possibleEndpoints.length} endpoints). Last error: ${lastError?.message || 'None'}`)
    return null
  } catch (error) {
    console.error('[MetaAPI] Error fetching billing information:', error)
    return null
  }
}

/**
 * Safely extract plain properties from an object, avoiding circular references
 */
function extractPlainProperties(obj: any, maxDepth: number = 2, visited: WeakSet<any> = new WeakSet()): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj
  }

  // Avoid circular references
  if (visited.has(obj)) {
    return '[Circular Reference]'
  }

  // Don't go too deep
  if (maxDepth <= 0) {
    return '[Max Depth Reached]'
  }

  visited.add(obj)

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => extractPlainProperties(item, maxDepth - 1, visited))
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString()
  }

  // Skip functions and SDK internal objects
  if (typeof obj === 'function') {
    return undefined
  }

  // Check for SDK internal objects (they often have specific constructor names)
  const constructorName = obj.constructor?.name || ''
  if (
    constructorName.includes('Manager') ||
    constructorName.includes('Tree') ||
    constructorName.includes('Connection') ||
    constructorName.includes('Hash') ||
    constructorName.includes('Reference')
  ) {
    return undefined
  }

  // Extract plain properties
  const result: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      try {
        const value = obj[key]
        // Skip functions
        if (typeof value === 'function') {
          continue
        }
        // Skip private properties (starting with _)
        if (key.startsWith('_')) {
          continue
        }
        // Recursively extract
        const extracted = extractPlainProperties(value, maxDepth - 1, visited)
        if (extracted !== undefined) {
          result[key] = extracted
        }
      } catch (error) {
        // Skip properties that cause errors
        continue
      }
    }
  }

  return result
}

/**
 * Get account information via SDK (fallback when REST API doesn't work)
 * Uses the MetaAPI SDK which we already have working
 * Extracts only plain data to avoid circular reference errors
 */
export async function getAccountInfoViaSDK(
  accountId: string,
  token: string
): Promise<{
  id: string
  name: string
  login: number
  server: string
  platform: string
  state: string
  connectionStatus: string
  region?: string
  regionId?: string
  [key: string]: any
} | null> {
  try {
    console.log(`[MetaAPI] Fetching account info via SDK for ${accountId}`)
    
    // Import MetaAPI SDK
    const MetaApiModule = await import('metaapi.cloud-sdk')
    // Handle different export formats
    let MetaApi: any
    if (MetaApiModule.default) {
      MetaApi = MetaApiModule.default
    } else if (typeof MetaApiModule === 'function') {
      MetaApi = MetaApiModule
    } else {
      // Try to find the constructor
      MetaApi = (MetaApiModule as any).MetaApi || MetaApiModule
    }
    
    // Create SDK instance
    const metaApi = new MetaApi(token)
    
    // Get account via SDK
    const account = await metaApi.metatraderAccountApi.getAccount(accountId)
    
    // Extract only plain, serializable properties (avoid circular references)
    // Manually extract known safe properties first
    const plainAccount: any = {
      id: account.id || accountId,
      name: account.name || account.accountName || '',
      login: account.login || 0,
      server: account.server || '',
      platform: account.platform || account.type || '',
      state: account.state || account.accountState || 'UNKNOWN',
      connectionStatus: account.connectionStatus || account.state || 'UNKNOWN',
      region: account.region,
      regionId: account.regionId
    }

    // Try to extract additional safe properties (but avoid SDK internal objects)
    try {
      const additionalProps = extractPlainProperties(account, 1)
      // Merge additional properties, but prioritize our manually extracted ones
      for (const key in additionalProps) {
        if (!plainAccount.hasOwnProperty(key) && typeof additionalProps[key] !== 'object') {
          // Only add primitive types to avoid circular references
          if (
            typeof additionalProps[key] === 'string' ||
            typeof additionalProps[key] === 'number' ||
            typeof additionalProps[key] === 'boolean'
          ) {
            plainAccount[key] = additionalProps[key]
          }
        }
      }
    } catch (extractError) {
      console.warn('[MetaAPI] Could not extract additional properties, using base properties only:', extractError)
      // Continue with just the manually extracted properties
    }
    
    return plainAccount
  } catch (error) {
    console.error(`[MetaAPI] Error fetching account info via SDK for ${accountId}:`, error)
    return null
  }
}

/**
 * Get account metadata which may include quota/usage information
 */
export async function getAccountMetadata(
  accountId: string,
  token: string
): Promise<any> {
  try {
    // Try SDK first (more reliable)
    const sdkInfo = await getAccountInfoViaSDK(accountId, token)
    if (sdkInfo) {
      return sdkInfo
    }
    
    // Fallback to REST API
    return await getAccountInfo(accountId, token)
  } catch (error) {
    console.error(`[MetaAPI] Error fetching account metadata for ${accountId}:`, error)
    return null
  }
}

