import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import {
  getMasterStrategy,
  getActiveMasterStrategy,
  updateMasterStrategy,
  setActiveMasterStrategy,
  normalizeSymbolMapping
} from '@/lib/copyTradingRepo'
import { encrypt, decrypt } from '@/lib/crypto'
import { updateCopyFactoryStrategy } from '@/lib/copyfactoryClient'

function sanitizeStrategy(strategy: Awaited<ReturnType<typeof getMasterStrategy>>) {
  if (!strategy) return null
  const { tokenEnc, ...rest } = strategy
  return {
    ...rest,
    status: strategy.status,
    isPrimary: strategy.isPrimary,
    hasToken: Boolean(tokenEnc)
  }
}

/**
 * GET /api/copyfactory/master
 * Get the current master strategy configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategyId')
    const active = searchParams.get('active') === 'true'

    let strategy = null

    if (strategyId) {
      strategy = await getMasterStrategy(strategyId)
    } else if (active) {
      strategy = await getActiveMasterStrategy()
    } else {
      strategy = await getActiveMasterStrategy()
    }

    if (!strategy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Strategy not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      strategy: sanitizeStrategy(strategy)
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
 * PATCH /api/copyfactory/master
 * Update master strategy configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request)
    const rawBody = await request.json().catch(() => ({}))
    const body = rawBody && typeof rawBody === 'object' ? rawBody : {}

    const strategyId =
      typeof body.strategyId === 'string' && body.strategyId.trim().length > 0
        ? body.strategyId.trim()
        : null

    if (!strategyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'strategyId is required'
        },
        { status: 400 }
      )
    }

    const existingStrategy = await getMasterStrategy(strategyId)

    if (!existingStrategy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Strategy not found'
        },
        { status: 404 }
      )
    }

    const updates: Record<string, any> = {}
    let copyFactoryNeedsUpdate = false
    let symbolMappingProvided = false

    if (typeof body.name === 'string' && body.name.trim().length > 0) {
      updates.name = body.name.trim()
      copyFactoryNeedsUpdate = true
    }
    if (typeof body.description === 'string') {
      updates.description = body.description.trim()
      copyFactoryNeedsUpdate = true
    }
    if (typeof body.accountId === 'string' && body.accountId.trim().length > 0) {
      updates.accountId = body.accountId.trim()
      copyFactoryNeedsUpdate = true
    }
    if (typeof body.status === 'string') updates.status = body.status
    if (typeof body.isPrimary === 'boolean') updates.isPrimary = body.isPrimary

    if (typeof body.token === 'string') {
      const trimmedToken = body.token.trim()
      if (trimmedToken.length > 0) {
        updates.tokenEnc = await encrypt(trimmedToken)
        copyFactoryNeedsUpdate = true
      } else {
        updates.tokenEnc = null
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'symbolMapping')) {
      symbolMappingProvided = true
      const normalized =
        body.symbolMapping === null ? [] : normalizeSymbolMapping(body.symbolMapping)
      updates.symbolMapping = normalized
      copyFactoryNeedsUpdate = true
    }

    if (Object.keys(updates).length > 0) {
      await updateMasterStrategy(strategyId, updates)
    }

    if (body.setActive === true) {
      await setActiveMasterStrategy(strategyId)
      
      // Auto-start copy trading streaming for active strategies
      try {
        const { startCopyTradingStream } = await import('@/lib/copyTradingStreamService')
        const accountIdForStreaming = updates.accountId || existingStrategy.accountId
        if (accountIdForStreaming) {
          const streamingResult = await startCopyTradingStream(accountIdForStreaming, strategyId)
          if (streamingResult.success) {
            console.log(`[MasterEndpoint] Auto-started copy trading streaming for strategy ${strategyId}, account ${accountIdForStreaming}`)
          } else {
            console.warn(`[MasterEndpoint] Failed to auto-start streaming: ${streamingResult.error}`)
          }
        }
      } catch (streamingError) {
        console.warn('[MasterEndpoint] Error auto-starting copy trading streaming (non-critical):', streamingError)
        // Don't fail the request if streaming fails
      }
    } else if (body.setActive === false) {
      const accountIdForStreaming = updates.accountId || existingStrategy.accountId
      await updateMasterStrategy(strategyId, { status: 'inactive', isPrimary: false })
      
      // Stop copy trading streaming for inactive strategies
      try {
        if (accountIdForStreaming) {
          const { stopCopyTradingStream } = await import('@/lib/copyTradingStreamService')
          await stopCopyTradingStream(accountIdForStreaming)
          console.log(`[MasterEndpoint] Stopped copy trading streaming for strategy ${strategyId}`)
        }
      } catch (streamingError) {
        console.warn('[MasterEndpoint] Error stopping copy trading streaming (non-critical):', streamingError)
      }
    }

    const updated = await getMasterStrategy(strategyId)

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Strategy not found after update'
        },
        { status: 404 }
      )
    }

    if (copyFactoryNeedsUpdate) {
      let masterToken: string | undefined

      if (typeof body.token === 'string' && body.token.trim().length > 0) {
        masterToken = body.token.trim()
      } else if (existingStrategy.tokenEnc) {
        try {
          const decrypted = await decrypt(existingStrategy.tokenEnc)
          if (typeof decrypted === 'string' && decrypted.trim().length > 0) {
            masterToken = decrypted.trim()
          }
        } catch (error) {
          console.warn('[MasterEndpoint] Failed to decrypt stored master token', error)
        }
      }

      await updateCopyFactoryStrategy(
        {
          strategyId,
          accountId: updated.accountId,
          name: updated.name,
          description: updated.description,
          symbolMapping: symbolMappingProvided
            ? updated.symbolMapping && updated.symbolMapping.length > 0
              ? updated.symbolMapping
              : null
            : undefined
        },
        { token: masterToken }
      )
    }

    return NextResponse.json({
      success: true,
      strategy: sanitizeStrategy(updated)
    })
  } catch (error) {
    console.error('[MasterEndpoint] Error updating master strategy:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to update master strategy'

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
 * POST /api/copyfactory/master
 * Unsupported - use /api/copyfactory/master/create
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Use /api/copyfactory/master/create to create a strategy'
    },
    { status: 405 }
  )
}

