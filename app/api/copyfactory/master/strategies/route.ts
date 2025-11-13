import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { getMasterStrategy, getActiveMasterStrategy } from '@/lib/copyTradingRepo'
import { decrypt } from '@/lib/crypto'
import { getStrategiesByAccount } from '@/lib/copyfactoryClient'

/**
 * POST /api/copyfactory/master/strategies
 * Fetch strategies for a given account ID (admin)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const rawBody = await request.json()
    const body = rawBody && typeof rawBody === 'object' ? rawBody : {}
    const accountId =
      typeof body.accountId === 'string' && body.accountId.trim().length > 0
        ? body.accountId.trim()
        : undefined
    const strategyId =
      typeof body.strategyId === 'string' && body.strategyId.trim().length > 0
        ? body.strategyId.trim()
        : undefined
    const token =
      typeof body.token === 'string' && body.token.trim().length > 0
        ? body.token.trim()
        : undefined

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'accountId is required'
        },
        { status: 400 }
      )
    }

    let tokenToUse = token

    if (!tokenToUse) {
      const master = strategyId
        ? await getMasterStrategy(strategyId)
        : await getActiveMasterStrategy()
      if (master?.tokenEnc) {
        tokenToUse = await decrypt(master.tokenEnc)
      }
    }

    const strategies = await getStrategiesByAccount(accountId, {
      token: tokenToUse
    })

    return NextResponse.json({
      success: true,
      strategies
    })
  } catch (error) {
    console.error('[MasterStrategiesEndpoint] Error fetching strategies:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch strategies'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

