import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { createSubscriberAccount, subscribeToStrategy } from '@/lib/copyfactoryClient'
import {
  getMasterStrategy,
  getActiveMasterStrategy,
  saveUserCopyTradingAccount,
  listUserCopyTradingAccounts,
  deleteUserCopyTradingAccount,
  migrateLegacyCopyTradingAccount,
  normalizeSymbolMapping
} from '@/lib/copyTradingRepo'
import { encrypt, decrypt } from '@/lib/crypto'
import { trackError } from '@/lib/copyTradingAutoDisconnectService'
import { z } from 'zod'

// Validation schema
const ConnectSchema = z.object({
  broker: z.string().min(1, 'Broker is required'),
  server: z.string().min(1, 'Server is required'),
  login: z.string().min(1, 'Login is required'),
  password: z.string().min(1, 'Password is required'),
  platform: z.enum(['mt4', 'mt5']),
  riskMultiplier: z.number().min(0.1).max(10),
  strategyId: z.string().min(1, 'Strategy is required'),
  label: z.string().max(60).optional(),
  reverseTrading: z.boolean().optional(),
  symbolMapping: z.string().optional(),
  maxRiskPercent: z.number().min(0).max(1).optional()
})

/**
 * POST /api/copyfactory/connect
 * Connect user's MT account and subscribe to master strategy
 */
export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>> | null = null
  let data: z.infer<typeof ConnectSchema> | null = null
  
  try {
    // Require authentication
    user = await requireAuth(request)

    // Parse and validate request body
    const body = await request.json()
    const validation = ConnectSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    data = validation.data

    const masterStrategy = await getMasterStrategy(data.strategyId)

    if (!masterStrategy || masterStrategy.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Selected strategy is not available. Please choose another strategy.'
        },
        { status: 400 }
      )
    }

    const strategyId = masterStrategy.strategyId

    // Advanced copy settings
    const reverseTrading = data.reverseTrading ?? false

    let symbolMapping: Record<string, string> | undefined
    let userProvidedSymbolMapping = false
    if (typeof data.symbolMapping === 'string') {
      const trimmedMapping = data.symbolMapping.trim()
      if (trimmedMapping.length > 0) {
        userProvidedSymbolMapping = true
        try {
          const normalizedPairs = normalizeSymbolMapping(trimmedMapping)
          if (normalizedPairs.length === 0) {
            throw new Error(
              'Provide at least one { "from": "...", "to": "..." } pair or leave the field blank.'
            )
          }
          symbolMapping = normalizedPairs.reduce<Record<string, string>>((acc, pair) => {
            acc[pair.from] = pair.to
            return acc
          }, {})
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error:
                error instanceof Error
                  ? `Invalid symbol mapping: ${error.message}`
                  : 'Invalid symbol mapping JSON.'
            },
            { status: 400 }
          )
        }
      }
    }

    if (!userProvidedSymbolMapping && masterStrategy.symbolMapping?.length) {
      symbolMapping = masterStrategy.symbolMapping.reduce<Record<string, string>>((acc, pair) => {
        acc[pair.from] = pair.to
        return acc
      }, {})
    }

    const maxRiskPercent =
      typeof data.maxRiskPercent === 'number' && !Number.isNaN(data.maxRiskPercent)
        ? data.maxRiskPercent
        : undefined

    // Determine custom token if stored
    let masterToken: string | undefined
    if (masterStrategy?.tokenEnc) {
      try {
        masterToken = await decrypt(masterStrategy.tokenEnc)
        if (typeof masterToken === 'string' && masterToken.trim().length === 0) {
          masterToken = undefined
        } else if (typeof masterToken === 'string') {
          masterToken = masterToken.trim()
        }
      } catch (decryptError) {
        console.warn('[ConnectEndpoint] Failed to decrypt master token, falling back to env token')
        masterToken = undefined
      }
    }

    console.log(`[ConnectEndpoint] Creating subscriber account for user ${user.uid}`)

    // Step 1: Create MetaApi cloud account (subscriber)
    const accountResult = await createSubscriberAccount(
      {
        name: `${user.email || user.uid}-subscriber`,
        login: data.login,
        password: data.password,
        server: data.server,
        broker: data.broker,
        platform: data.platform
      },
      { token: masterToken }
    )

    console.log(`[ConnectEndpoint] Account created: ${accountResult.accountId}`)

    // Step 2: Subscribe to master strategy
    await subscribeToStrategy(
      {
        subscriberAccountId: accountResult.accountId,
        providerAccountId: masterStrategy.accountId,
        strategyId,
        riskMultiplier: data.riskMultiplier,
        closeOnly: false,
        reverseTrading,
        symbolMapping,
        maxTradeRisk: maxRiskPercent
      },
      { token: masterToken }
    )

    console.log(
      `[ConnectEndpoint] Subscribed to strategy ${strategyId} with multiplier ${data.riskMultiplier}`
    )

    // Step 3: Encrypt password
    const passwordEnc = await encrypt(data.password)

    // Step 4: Save to Firestore
    await saveUserCopyTradingAccount(user.uid, {
      accountId: accountResult.accountId,
      strategyId,
      strategyName: masterStrategy.name,
      riskMultiplier: data.riskMultiplier,
      status: 'active',
      broker: data.broker,
      server: data.server,
      login: data.login,
      passwordEnc,
      platform: data.platform,
      label: data.label?.trim() || undefined,
      reverseTrading,
      symbolMapping,
      maxRiskPercent
    })

    // Step 5: Migrate legacy account if present
    await migrateLegacyCopyTradingAccount(user.uid).catch((error) => {
      console.warn('[ConnectEndpoint] Legacy account migration failed:', error)
    })

    console.log(`[ConnectEndpoint] Copy trading account saved for user ${user.uid}`)

    return NextResponse.json({
      success: true,
      accountId: accountResult.accountId,
      strategyId,
      strategyName: masterStrategy.name,
      message: 'Successfully connected to copy trading'
    })
  } catch (error) {
    console.error('[ConnectEndpoint] Error connecting copy trading:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to connect copy trading account'

    // Track error if we have an accountId (account was created but subscription failed)
    // Note: We can't track errors for account creation failures since we don't have accountId yet
    try {
      // Try to get accountId from error context or check if account was created
      // This is a best-effort attempt - if accountId is not available, skip tracking
      // Note: user might not be available in catch block, so check first
      if (user?.uid && data?.login && data?.server) {
        const accounts = await listUserCopyTradingAccounts(user.uid)
        const existingAccount = accounts.find((acc) => acc.login === data.login && acc.server === data.server)
        if (existingAccount?.accountId) {
          await trackError(user.uid, existingAccount.accountId, message).catch((trackError) => {
            console.warn('[ConnectEndpoint] Failed to track error:', trackError)
          })
        }
      }
    } catch (trackError) {
      // Silently fail - error tracking is non-critical
      console.warn('[ConnectEndpoint] Could not track error:', trackError)
    }

    if (message.includes('mapped to the same trading account')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This MetaTrader account is already subscribed to the selected strategy. Disconnect the existing follower first, or contact support for cleanup.'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

/**
 * GET /api/copyfactory/connect
 * Get user's copy trading account status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const accounts = await listUserCopyTradingAccounts(user.uid)

    return NextResponse.json({
      success: true,
      accounts
    })
  } catch (error) {
    const authError = handleAuthError(error)
    return NextResponse.json(
      {
        success: false,
        error: authError.message
      },
      { status: authError.status }
    )
  }
}

/**
 * DELETE /api/copyfactory/connect
 * Disconnect user's copy trading account
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const url = new URL(request.url)
    const accountId = url.searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'accountId query parameter is required'
        },
        { status: 400 }
      )
    }

    await deleteUserCopyTradingAccount(user.uid, accountId)

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected copy trading account',
      accountId
    })
  } catch (error) {
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to disconnect account'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

