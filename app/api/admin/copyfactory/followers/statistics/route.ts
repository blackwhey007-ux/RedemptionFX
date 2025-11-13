import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { db } from '@/lib/firebaseConfig'
import { collectionGroup, getDoc, getDocs, query, doc } from 'firebase/firestore'
import { 
  getFollowerAccountInfo, 
  getFollowerPositions,
  getFollowerAccountInfoREST,
  getFollowerPositionsREST
} from '@/lib/copyfactoryClient'
import { getMasterStrategy } from '@/lib/copyTradingRepo'
import { decrypt } from '@/lib/crypto'
import {
  calculatePerformanceMetrics,
  calculateRiskMetrics,
  calculateTradingActivity,
  getAccountAge
} from '@/lib/statisticsUtils'
import {
  getCachedAccountInfo,
  setCachedAccountInfo,
  getCachedPositions,
  setCachedPositions
} from '@/lib/statisticsCache'
import { trackError } from '@/lib/copyTradingAutoDisconnectService'

interface FollowerAccountStats {
  userId: string
  email: string
  accountId: string
  strategyId: string
  strategyName: string
  balance: number
  equity: number
  margin: number
  freeMargin: number
  marginLevel: number
  currency: string
  login: string
  server: string
  platform: string
  status: 'success' | 'error'
  error?: string
  // New fields (non-breaking additions)
  profitLoss?: number
  openPositions?: number
  totalVolume?: number
  accountAge?: number
  createdAt?: Date | string
}

/**
 * GET /api/admin/copyfactory/followers/statistics
 * Get account statistics for all followers (admin only)
 * 
 * Query parameters (optional, non-breaking):
 * - strategyId: Filter by strategy ID
 * - includePositions: Include open positions data (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    // Get optional query parameters (backward compatible - all optional)
    const { searchParams } = new URL(request.url)
    const filterStrategyId = searchParams.get('strategyId')
    const includePositions = searchParams.get('includePositions') !== 'false'

    // Get all followers
    const copyTradingQuery = query(collectionGroup(db, 'copyTradingAccounts'))
    const snapshot = await getDocs(copyTradingQuery)

    const followers: any[] = []

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data()

      if (docSnapshot.ref.parent.id !== 'copyTradingAccounts') continue

      const userDocRef = docSnapshot.ref.parent.parent
      if (!userDocRef) continue

      const userId = userDocRef.id

      const userSnapshot = await getDoc(doc(db, 'users', userId))
      const userEmail = userSnapshot.exists() ? userSnapshot.data()?.email : null

      // Apply optional filter
      if (filterStrategyId && data.strategyId !== filterStrategyId) {
        continue
      }

      followers.push({
        userId,
        email: userEmail,
        accountId: data.accountId || docSnapshot.id,
        strategyId: data.strategyId,
        strategyName: data.strategyName || 'Master Strategy',
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date()
      })
    }

    console.log(`[StatisticsEndpoint] Fetching stats for ${followers.length} followers`)

    // Get master strategy token if available
    let masterToken: string | undefined
    if (followers.length > 0) {
      try {
        const firstStrategy = await getMasterStrategy(followers[0].strategyId)
        if (firstStrategy?.tokenEnc) {
          masterToken = await decrypt(firstStrategy.tokenEnc)
          if (typeof masterToken === 'string' && masterToken.trim().length === 0) {
            masterToken = undefined
          }
        }
      } catch (error) {
        console.warn('[StatisticsEndpoint] Could not get master token:', error)
      }
    }

    // Fetch account info for each follower
    const stats: FollowerAccountStats[] = []
    const errors: string[] = []
    let totalPositions = 0
    let totalVolume = 0

    // Process accounts in batches of 10 for better performance
    const BATCH_SIZE = 10
    const BATCH_DELAY_MS = 50

    for (let i = 0; i < followers.length; i += BATCH_SIZE) {
      const batch = followers.slice(i, i + BATCH_SIZE)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (follower) => {
        try {
          // Check cache first
          let accountInfo: {
            balance: number
            equity: number
            margin: number
            freeMargin: number
            marginLevel: number
            currency: string
            login: string
            server: string
            platform: string
          } | null = getCachedAccountInfo(follower.accountId) as any
          let positions: Array<{ volume: number; profit: number }> = []
          let openPositionsCount = 0
          let accountVolume = 0

          // Fetch account info if not cached
          if (!accountInfo) {
            try {
              // Try REST API first (no subscription slots)
              const restAccountInfo = await getFollowerAccountInfoREST(follower.accountId, masterToken)
              
              // If REST API fails or returns incomplete data, fallback to RPC
              if (!restAccountInfo || (restAccountInfo.balance === 0 && restAccountInfo.equity === 0)) {
                console.log(`[StatisticsEndpoint] REST API returned incomplete data for ${follower.accountId}, trying RPC fallback`)
                accountInfo = await getFollowerAccountInfo(follower.accountId, masterToken)
              } else {
                accountInfo = restAccountInfo
              }
              
              // Cache successful result
              if (accountInfo) {
                setCachedAccountInfo(follower.accountId, accountInfo)
              }
            } catch (restError) {
              console.warn(`[StatisticsEndpoint] REST API failed for ${follower.accountId}, trying RPC fallback:`, restError)
              // Fallback to RPC if REST fails
              try {
                accountInfo = await getFollowerAccountInfo(follower.accountId, masterToken)
                if (accountInfo) {
                  setCachedAccountInfo(follower.accountId, accountInfo)
                }
              } catch (rpcError) {
                console.error(`[StatisticsEndpoint] Both REST and RPC failed for ${follower.accountId}:`, rpcError)
                accountInfo = null
                // Track error for auto-disconnect
                const errorMsg = rpcError instanceof Error ? rpcError.message : 'Failed to fetch account info'
                await trackError(follower.userId, follower.accountId, errorMsg).catch((trackErr) => {
                  console.warn(`[StatisticsEndpoint] Failed to track error for ${follower.accountId}:`, trackErr)
                })
              }
            }
          }

          // Fetch positions if enabled
          if (includePositions && accountInfo) {
            // Check cache first
            const cachedPositions = getCachedPositions(follower.accountId)
            
            if (cachedPositions) {
              positions = cachedPositions as Array<{ volume: number; profit: number }>
            } else {
              try {
                // Try REST API first
                positions = await getFollowerPositionsREST(follower.accountId, masterToken)
                
                // If REST API fails, fallback to RPC
                if (!positions || positions.length === 0) {
                  try {
                    positions = await getFollowerPositions(follower.accountId, masterToken)
                  } catch (rpcError) {
                    console.warn(`[StatisticsEndpoint] Could not fetch positions for ${follower.accountId}:`, rpcError)
                    positions = []
                  }
                }
                
                // Cache successful result
                if (positions) {
                  setCachedPositions(follower.accountId, positions)
                }
              } catch (posError) {
                console.warn(`[StatisticsEndpoint] Could not fetch positions for ${follower.accountId}:`, posError)
                positions = []
              }
            }
            
            openPositionsCount = positions.length
            accountVolume = positions.reduce((sum, pos) => sum + (pos.volume || 0), 0)
          }

          if (accountInfo) {
            const profitLoss = accountInfo.equity - accountInfo.balance
            const accountAge = getAccountAge(follower.createdAt || new Date())

            return {
              userId: follower.userId,
              email: follower.email || 'N/A',
              accountId: follower.accountId,
              strategyId: follower.strategyId,
              strategyName: follower.strategyName,
              balance: accountInfo.balance,
              equity: accountInfo.equity,
              margin: accountInfo.margin,
              freeMargin: accountInfo.freeMargin,
              marginLevel: accountInfo.marginLevel,
              currency: accountInfo.currency,
              login: accountInfo.login,
              server: accountInfo.server,
              platform: accountInfo.platform,
              status: 'success' as const,
              // New fields (non-breaking additions)
              profitLoss,
              openPositions: openPositionsCount,
              totalVolume: accountVolume,
              accountAge,
              createdAt: follower.createdAt
            }
          } else {
            errors.push(`Failed to fetch stats for ${follower.accountId}`)
            return {
              userId: follower.userId,
              email: follower.email || 'N/A',
              accountId: follower.accountId,
              strategyId: follower.strategyId,
              strategyName: follower.strategyName,
              balance: 0,
              equity: 0,
              margin: 0,
              freeMargin: 0,
              marginLevel: 0,
              currency: 'USD',
              login: '',
              server: '',
              platform: '',
              status: 'error' as const,
              error: 'Failed to fetch account information',
              // New fields with defaults
              profitLoss: 0,
              openPositions: 0,
              totalVolume: 0,
              accountAge: getAccountAge(follower.createdAt || new Date()),
              createdAt: follower.createdAt
            }
          }
        } catch (error) {
          console.error(`[StatisticsEndpoint] Error fetching stats for ${follower.accountId}:`, error)
          errors.push(`Error for ${follower.accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          return {
            userId: follower.userId,
            email: follower.email || 'N/A',
            accountId: follower.accountId,
            strategyId: follower.strategyId,
            strategyName: follower.strategyName,
            balance: 0,
            equity: 0,
            margin: 0,
            freeMargin: 0,
            marginLevel: 0,
            currency: 'USD',
            login: '',
            server: '',
            platform: '',
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
            // New fields with defaults
            profitLoss: 0,
            openPositions: 0,
            totalVolume: 0,
            accountAge: getAccountAge(follower.createdAt || new Date()),
            createdAt: follower.createdAt
          }
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      stats.push(...batchResults)

      // Calculate totals from batch results
      batchResults.forEach((result) => {
        if (result.status === 'success') {
          totalPositions += result.openPositions || 0
          totalVolume += result.totalVolume || 0
        }
      })

      // Rate limiting: delay between batches (except for last batch)
      if (i + BATCH_SIZE < followers.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    // Calculate aggregates (existing fields - unchanged)
    const totals = {
      totalCapital: stats.reduce((sum, s) => sum + s.balance, 0),
      totalEquity: stats.reduce((sum, s) => sum + s.equity, 0),
      totalMargin: stats.reduce((sum, s) => sum + s.margin, 0),
      totalFreeMargin: stats.reduce((sum, s) => sum + s.freeMargin, 0),
      averageMarginLevel: stats.length > 0
        ? stats.reduce((sum, s) => sum + s.marginLevel, 0) / stats.length
        : 0,
      successfulFetches: stats.filter((s) => s.status === 'success').length,
      failedFetches: stats.filter((s) => s.status === 'error').length
    }

    // Calculate new metrics (non-breaking additions)
    const performanceMetrics = calculatePerformanceMetrics(stats)
    const riskMetrics = calculateRiskMetrics(stats)
    const tradingActivity = calculateTradingActivity(stats, totalPositions, totalVolume)

    return NextResponse.json({
      success: true,
      totals,
      followers: stats,
      count: stats.length,
      errors: errors.length > 0 ? errors : undefined,
      // New fields (non-breaking additions)
      performance: performanceMetrics,
      risk: riskMetrics,
      trading: tradingActivity,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('[StatisticsEndpoint] Error fetching statistics:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch statistics'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

