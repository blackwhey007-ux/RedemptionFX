import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { startCopyTradingStream, stopCopyTradingStream, getStreamingStatus } from '@/lib/copyTradingStreamService'
import { listMasterStrategies } from '@/lib/copyTradingRepo'

/**
 * POST /api/admin/copyfactory/streaming
 * Start streaming for a master account
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const { masterAccountId, strategyId } = body

    if (!masterAccountId) {
      return NextResponse.json(
        { success: false, error: 'masterAccountId is required' },
        { status: 400 }
      )
    }

    console.log(`[CopyTradingStreaming] Starting stream for master account ${masterAccountId}, strategy ${strategyId || 'auto'}`)

    const result = await startCopyTradingStream(masterAccountId, strategyId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to start streaming' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Copy trading streaming started successfully',
      accountId: masterAccountId,
      strategyId: strategyId
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleAuthError()
    }

    console.error('[CopyTradingStreaming] Error starting stream:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start streaming'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/copyfactory/streaming
 * Stop streaming for a master account
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const masterAccountId = searchParams.get('masterAccountId')

    if (!masterAccountId) {
      return NextResponse.json(
        { success: false, error: 'masterAccountId query parameter is required' },
        { status: 400 }
      )
    }

    console.log(`[CopyTradingStreaming] Stopping stream for master account ${masterAccountId}`)

    const result = await stopCopyTradingStream(masterAccountId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to stop streaming' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Copy trading streaming stopped successfully',
      accountId: masterAccountId
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleAuthError()
    }

    console.error('[CopyTradingStreaming] Error stopping stream:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop streaming'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/copyfactory/streaming/status
 * Get streaming status for all master accounts
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    // Get all master strategies
    const strategies = await listMasterStrategies()
    const activeStrategies = strategies.filter(s => s.status === 'active')

    // Get streaming status for each active strategy
    const statuses = await Promise.all(
      activeStrategies.map(async (strategy) => {
        const status = await getStreamingStatus(strategy.accountId)
        return {
          accountId: strategy.accountId,
          strategyId: strategy.strategyId,
          strategyName: strategy.name,
          isStreaming: status?.isActive || false,
          lastEvent: status?.lastEvent
        }
      })
    )

    return NextResponse.json({
      success: true,
      statuses
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleAuthError()
    }

    console.error('[CopyTradingStreaming] Error getting status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get streaming status'
      },
      { status: 500 }
    )
  }
}




