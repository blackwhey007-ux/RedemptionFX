import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { listMasterStrategies } from '@/lib/copyTradingRepo'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const strategies = await listMasterStrategies()

    return NextResponse.json({
      success: true,
      strategies: strategies.map((strategy) => {
        const { tokenEnc, ...rest } = strategy
        return {
          ...rest,
          hasToken: Boolean(tokenEnc)
        }
      })
    })
  } catch (error) {
    console.error('[MasterListEndpoint] Error listing master strategies:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to list master strategies'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}





