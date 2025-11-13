import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { createMasterStrategy } from '@/lib/copyfactoryClient'
import {
  saveMasterStrategy,
  setActiveMasterStrategy,
  getMasterStrategy,
  normalizeSymbolMapping
} from '@/lib/copyTradingRepo'
import { getMT5Settings } from '@/lib/mt5SettingsService'
import { encrypt } from '@/lib/crypto'

function sanitizeStrategy(strategy: Awaited<ReturnType<typeof getMasterStrategy>>) {
  if (!strategy) return null
  const { tokenEnc, ...rest } = strategy
  return {
    ...rest,
    hasToken: Boolean(tokenEnc)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const rawBody = await request.json().catch(() => ({}))
    const body = rawBody && typeof rawBody === 'object' ? rawBody : {}

    let accountId: string | undefined =
      typeof body.accountId === 'string' && body.accountId.trim().length > 0
        ? body.accountId.trim()
        : undefined
    if (!accountId) {
      const mt5Settings = await getMT5Settings()
      if (!mt5Settings || !mt5Settings.accountId) {
        return NextResponse.json(
          {
            success: false,
            error:
              'MetaApi account not configured. Please provide accountId or configure MetaApi settings first.'
          },
          { status: 400 }
        )
      }
      accountId = mt5Settings.accountId
    }

    const name =
      typeof body.name === 'string' && body.name.trim().length > 0
        ? body.name.trim()
        : 'CopyFactory Strategy'
    const description =
      typeof body.description === 'string' && body.description.trim().length > 0
        ? body.description.trim()
        : ''
    const token =
      typeof body.token === 'string' && body.token.trim().length > 0
        ? body.token.trim()
        : undefined
    const setActive = body.setActive === true

    let symbolMapping: ReturnType<typeof normalizeSymbolMapping> | undefined
    if (Object.prototype.hasOwnProperty.call(body, 'symbolMapping')) {
      if (body.symbolMapping === null) {
        symbolMapping = []
      } else {
        symbolMapping = normalizeSymbolMapping(body.symbolMapping)
      }
    }

    const result = await createMasterStrategy(
      {
        accountId,
        name,
        description,
        symbolMapping
      },
      { token }
    )

    const existing = await getMasterStrategy(result.strategyId)

    const tokenEnc = token ? await encrypt(token) : existing?.tokenEnc || null

    await saveMasterStrategy({
      strategyId: result.strategyId,
      name,
      description,
      accountId,
      status: setActive ? 'active' : 'inactive',
      isPrimary: setActive,
      tokenEnc,
      symbolMapping: symbolMapping && symbolMapping.length > 0 ? symbolMapping : undefined
    })

    if (setActive) {
      await setActiveMasterStrategy(result.strategyId)
      
      // Auto-start copy trading streaming for active strategies
      try {
        const { startCopyTradingStream } = await import('@/lib/copyTradingStreamService')
        const streamingResult = await startCopyTradingStream(accountId, result.strategyId)
        if (streamingResult.success) {
          console.log(`[MasterCreateEndpoint] Auto-started copy trading streaming for new strategy ${result.strategyId}`)
        } else {
          console.warn(`[MasterCreateEndpoint] Failed to auto-start streaming: ${streamingResult.error}`)
        }
      } catch (streamingError) {
        console.warn('[MasterCreateEndpoint] Error auto-starting copy trading streaming (non-critical):', streamingError)
        // Don't fail the request if streaming fails
      }
    }

    const strategy = await getMasterStrategy(result.strategyId)

    return NextResponse.json({
      success: true,
      strategy: sanitizeStrategy(strategy)
    })
  } catch (error) {
    console.error('[MasterCreateEndpoint] Error creating master strategy:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to create master strategy'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

