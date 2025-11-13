import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { listMasterStrategies } from '@/lib/copyTradingRepo'

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)

    const strategies = await listMasterStrategies()

    const activeStrategies = strategies
      .filter((strategy) => strategy.status === 'active' || strategy.isPrimary)
      .map((strategy) => {
        const { tokenEnc, ...rest } = strategy
        return {
          id: strategy.strategyId,
          name: strategy.name,
          description: strategy.description,
          accountId: strategy.accountId,
          isPrimary: strategy.isPrimary,
          updatedAt: strategy.updatedAt,
          createdAt: strategy.createdAt,
          symbolMapping: rest.symbolMapping && rest.symbolMapping.length > 0 ? rest.symbolMapping : []
        }
      })

    return NextResponse.json({
      success: true,
      strategies: activeStrategies
    })
  } catch (error) {
    console.error('[UserStrategiesEndpoint] Error loading strategies:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to load strategies'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}
