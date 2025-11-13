import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { 
  getCPUCreditUsage, 
  getAccountQuota, 
  getBillingInfo, 
  listAccounts,
  getAccountInfoViaSDK,
  getAccountMetadata
} from '@/lib/metaapiRestClient'

/**
 * GET /api/admin/metaapi/usage
 * Get MetaAPI credit usage, quota, and billing information (admin only)
 * Works independently - doesn't require account listing to function
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const token = process.env.METAAPI_TOKEN
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'METAAPI_TOKEN not configured'
        },
        { status: 500 }
      )
    }

    // Get account ID from query params or environment (for credit usage)
    const { searchParams } = new URL(request.url)
    let accountId = searchParams.get('accountId') || process.env.MT5_ACCOUNT_ID

    // Fetch all data independently with error handling
    // Each fetch is wrapped in try-catch so one failure doesn't break the others
    const results: {
      credits: any
      quota: any
      billing: any
      accounts: any
      accountMetadata: any
      diagnostics: any
      errors: string[]
      autoSelectedAccountId?: string
    } = {
      credits: null,
      quota: null,
      billing: null,
      accounts: null,
      accountMetadata: null,
      diagnostics: {
        endpointsTried: [],
        sdkAvailable: false,
        restApiAvailable: false
      },
      errors: []
    }

    // If no account ID provided, try to get one from the account list
    if (!accountId) {
      try {
        console.log('[MetaAPIUsageEndpoint] No account ID provided, attempting to fetch account list to auto-select...')
        // Try REST API first (SDK doesn't have getAccounts() method)
        try {
          const restAccounts = await listAccounts(token)
          if (restAccounts && restAccounts.length > 0) {
            accountId = restAccounts[0].id
            results.autoSelectedAccountId = accountId
            console.log(`[MetaAPIUsageEndpoint] Auto-selected account ID from REST API: ${accountId}`)
          }
        } catch (restError) {
          console.warn('[MetaAPIUsageEndpoint] Could not auto-select account - REST API failed:', restError instanceof Error ? restError.message : restError)
          // Note: SDK doesn't support listing all accounts, only getting individual accounts by ID
          // So we can't use SDK as a fallback for account listing
        }
      } catch (error) {
        console.warn('[MetaAPIUsageEndpoint] Error during account auto-selection:', error)
      }
    }

    // Fetch account metadata via SDK (this works and gives us account info)
    if (accountId) {
      try {
        console.log('[MetaAPIUsageEndpoint] Fetching account metadata via SDK...')
        results.accountMetadata = await getAccountInfoViaSDK(accountId, token)
        if (results.accountMetadata) {
          results.diagnostics.sdkAvailable = true
          console.log('[MetaAPIUsageEndpoint] SDK account metadata retrieved successfully')
        }
      } catch (error) {
        console.warn('[MetaAPIUsageEndpoint] SDK account metadata fetch failed:', error)
      }
    }

    // Fetch credit usage (if account ID available)
    if (accountId) {
      try {
        console.log('[MetaAPIUsageEndpoint] Attempting to fetch CPU credit usage...')
        const creditEndpoints = [
          `/users/current/accounts/${accountId}/credits`,
          `/users/current/credits`,
          `/users/current/usage/credits`,
          `/users/current/accounts/${accountId}/usage/credits`
        ]
        results.diagnostics.endpointsTried.push({
          type: 'credits',
          endpoints: creditEndpoints,
          timestamp: new Date().toISOString()
        })
        results.credits = await getCPUCreditUsage(accountId, token)
        if (!results.credits) {
          results.errors.push('Credit usage endpoint returned no data after trying multiple endpoints')
          console.warn('[MetaAPIUsageEndpoint] Credit usage endpoint returned null')
        } else {
          console.log('[MetaAPIUsageEndpoint] Credit usage retrieved:', results.credits)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.warn('[MetaAPIUsageEndpoint] Error fetching credit usage:', errorMsg)
        results.errors.push(`Failed to fetch credit usage: ${errorMsg}`)
        results.diagnostics.endpointsTried.push({
          type: 'credits',
          error: errorMsg,
          timestamp: new Date().toISOString()
        })
      }
    } else {
      results.errors.push('No account ID provided - cannot fetch credit usage')
    }

    // Fetch quota information (independent of account listing)
    try {
      console.log('[MetaAPIUsageEndpoint] Attempting to fetch account quota...')
      const quotaEndpoints = [
        '/users/current/quota',
        '/users/current/account-quota',
        '/users/current/quotas',
        '/users/current/limits',
        '/users/current/subscription/limits'
      ]
      results.diagnostics.endpointsTried.push({
        type: 'quota',
        endpoints: quotaEndpoints,
        timestamp: new Date().toISOString()
      })
      results.quota = await getAccountQuota(token)
      if (!results.quota) {
        results.errors.push('Quota information not available - endpoints may not exist or SDK fallback failed')
        console.warn('[MetaAPIUsageEndpoint] Quota endpoint returned null')
      } else {
        console.log('[MetaAPIUsageEndpoint] Quota retrieved:', results.quota)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.warn('[MetaAPIUsageEndpoint] Error fetching quota:', errorMsg)
      results.errors.push(`Failed to fetch quota: ${errorMsg}`)
      results.diagnostics.endpointsTried.push({
        type: 'quota',
        error: errorMsg,
        timestamp: new Date().toISOString()
      })
    }

    // Fetch billing information (if available)
    try {
      console.log('[MetaAPIUsageEndpoint] Attempting to fetch billing information...')
      const billingEndpoints = [
        '/users/current/billing',
        '/users/current/usage',
        '/users/current/subscription',
        '/users/current/billing/summary',
        '/users/current/usage/summary',
        '/users/current/subscription/info'
      ]
      results.diagnostics.endpointsTried.push({
        type: 'billing',
        endpoints: billingEndpoints,
        timestamp: new Date().toISOString()
      })
      results.billing = await getBillingInfo(token)
      if (results.billing) {
        console.log('[MetaAPIUsageEndpoint] Billing information retrieved')
      } else {
        console.log('[MetaAPIUsageEndpoint] Billing information not available (this is normal for some plans)')
        results.diagnostics.endpointsTried.push({
          type: 'billing',
          note: 'Billing endpoints not available (normal for some plans)',
          timestamp: new Date().toISOString()
        })
      }
      // Billing might not be available in all plans, so don't add error if null
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.warn('[MetaAPIUsageEndpoint] Error fetching billing:', errorMsg)
      results.diagnostics.endpointsTried.push({
        type: 'billing',
        error: errorMsg,
        note: 'Billing is optional and may not be available',
        timestamp: new Date().toISOString()
      })
      // Don't add to errors - billing is optional
    }

    // Try to fetch account list (optional - nice to have but not required)
    // This will try REST API first, then SDK fallback
    try {
      console.log('[MetaAPIUsageEndpoint] Attempting to list accounts...')
      const accountEndpoints = [
        '/users/current/accounts',
        '/v1/users/current/accounts',
        '/v2/users/current/accounts'
      ]
      results.diagnostics.endpointsTried.push({
        type: 'listAccounts',
        endpoints: accountEndpoints,
        note: 'Will try SDK fallback if REST API fails',
        timestamp: new Date().toISOString()
      })
      
      let accounts: any[] = []
      try {
        accounts = await listAccounts(token)
      } catch (restError) {
        // REST API failed - SDK doesn't support listing all accounts
        // Note: MetaAPI SDK only supports getting individual accounts by ID, not listing all
        console.warn('[MetaAPIUsageEndpoint] REST API failed, SDK does not support listing all accounts')
        results.diagnostics.endpointsTried.push({
          type: 'listAccounts',
          error: `REST API: ${restError instanceof Error ? restError.message : 'Unknown'}. Note: SDK does not have getAccounts() method`,
          timestamp: new Date().toISOString()
        })
      }
      
      if (accounts && accounts.length > 0) {
        results.diagnostics.restApiAvailable = true
        results.accounts = {
          total: accounts.length,
          list: accounts.map((acc) => ({
            id: acc.id,
            name: acc.name,
            login: acc.login,
            server: acc.server,
            state: acc.state,
            connectionStatus: acc.connectionStatus
          }))
        }
        console.log(`[MetaAPIUsageEndpoint] Successfully listed ${accounts.length} accounts`)

        // If we got accounts and no credit usage yet, try to aggregate from accounts
        if (!results.credits && accounts.length > 0) {
          try {
            console.log('[MetaAPIUsageEndpoint] Attempting to aggregate credits from accounts...')
            const creditPromises = accounts.slice(0, 5).map((acc) => 
              getCPUCreditUsage(acc.id, token).catch(() => null)
            )
            const creditResults = await Promise.allSettled(creditPromises)
            
            const validCredits = creditResults
              .filter((result) => result.status === 'fulfilled' && result.value !== null)
              .map((result) => (result as PromiseFulfilledResult<any>).value)

            if (validCredits.length > 0) {
              results.credits = {
                used: validCredits.reduce((sum, c) => sum + (c.used || 0), 0),
                available: validCredits[0]?.available || 0,
                remaining: validCredits.reduce((sum, c) => sum + (c.remaining || 0), 0),
                percentage: validCredits.reduce((sum, c) => sum + (c.percentage || 0), 0) / validCredits.length
              }
              console.log('[MetaAPIUsageEndpoint] Aggregated credits from accounts')
            }
          } catch (error) {
            console.warn('[MetaAPIUsageEndpoint] Error aggregating credits from accounts:', error)
          }
        }
      } else {
        console.log('[MetaAPIUsageEndpoint] Account list returned empty or null')
        results.accounts = {
          total: 0,
          list: []
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.warn('[MetaAPIUsageEndpoint] Account listing not available (this is optional):', errorMsg)
      results.diagnostics.endpointsTried.push({
        type: 'listAccounts',
        error: errorMsg,
        timestamp: new Date().toISOString()
      })
      // Don't add to errors - account listing is optional
      results.accounts = {
        total: 0,
        list: []
      }
    }

    // Return partial success - show what we have even if some endpoints failed
    return NextResponse.json({
      success: true,
      data: {
        credits: results.credits,
        quota: results.quota,
        billing: results.billing,
        accounts: results.accounts || {
          total: 0,
          list: []
        },
        accountMetadata: results.accountMetadata,
        diagnostics: results.diagnostics,
        autoSelectedAccountId: results.autoSelectedAccountId,
        lastUpdated: new Date().toISOString(),
        warnings: results.errors.length > 0 ? results.errors : undefined
      }
    })
  } catch (error) {
    console.error('[MetaAPIUsageEndpoint] Error fetching usage data:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch usage data'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

