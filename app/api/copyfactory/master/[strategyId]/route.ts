import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import {
  getMasterStrategy,
  updateMasterStrategy,
  deleteMasterStrategy,
  setActiveMasterStrategy,
  listMasterStrategies,
  normalizeSymbolMapping
} from '@/lib/copyTradingRepo'
import { encrypt, decrypt } from '@/lib/crypto'
import { updateCopyFactoryStrategy } from '@/lib/copyfactoryClient'

function sanitize(strategy: Awaited<ReturnType<typeof getMasterStrategy>>) {
  if (!strategy) return null
  const { tokenEnc, ...rest } = strategy
  return {
    ...rest,
    hasToken: Boolean(tokenEnc)
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ strategyId: string }> }
) {
  try {
    await requireAdmin(request)

    const { strategyId } = await context.params
    const strategy = await getMasterStrategy(strategyId)

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
      strategy: sanitize(strategy)
    })
  } catch (error) {
    console.error('[MasterStrategyEndpoint] Error fetching strategy:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch strategy'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ strategyId: string }> }
) {
  try {
    await requireAdmin(request)
    const { strategyId } = await context.params
    const rawBody = await request.json().catch(() => ({}))
    const body = rawBody && typeof rawBody === 'object' ? rawBody : {}

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
    } else if (body.setActive === false) {
      await updateMasterStrategy(strategyId, { status: 'inactive', isPrimary: false })
    }

    const strategy = await getMasterStrategy(strategyId)

    if (!strategy) {
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
          console.warn('[MasterStrategyEndpoint] Failed to decrypt stored master token', error)
        }
      }

      await updateCopyFactoryStrategy(
        {
          strategyId: strategyId,
          accountId: strategy.accountId,
          name: strategy.name,
          description: strategy.description,
          symbolMapping: symbolMappingProvided
            ? strategy.symbolMapping && strategy.symbolMapping.length > 0
              ? strategy.symbolMapping
              : null
            : undefined
        },
        { token: masterToken }
      )
    }

    return NextResponse.json({
      success: true,
      strategy: sanitize(strategy)
    })
  } catch (error) {
    console.error('[MasterStrategyEndpoint] Error updating strategy:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to update strategy'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ strategyId: string }> }
) {
  try {
    await requireAdmin(request)

    const { strategyId } = await context.params
    const strategy = await getMasterStrategy(strategyId)

    if (!strategy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Strategy not found'
        },
        { status: 404 }
      )
    }

    await deleteMasterStrategy(strategyId)

    if (strategy.isPrimary) {
      const remaining = (await listMasterStrategies()).filter(
        (s) => s.strategyId !== strategyId
      )
      if (remaining.length > 0) {
        await setActiveMasterStrategy(remaining[0].strategyId)
      }
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('[MasterStrategyEndpoint] Error deleting strategy:', error)
    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to delete strategy'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

