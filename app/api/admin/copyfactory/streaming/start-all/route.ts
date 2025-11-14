import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { startCopyTradingStream } from '@/lib/copyTradingStreamService'
import { listMasterStrategies } from '@/lib/copyTradingRepo'

/**
 * POST /api/admin/copyfactory/streaming/start-all
 * Start streaming for all active master strategies
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    console.log('[CopyTradingStreaming] Starting streaming for all active strategies')

    // Get all active master strategies
    const strategies = await listMasterStrategies()
    const activeStrategies = strategies.filter(s => s.status === 'active')

    if (activeStrategies.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active strategies found',
        started: 0,
        failed: 0
      })
    }

    const results = await Promise.allSettled(
      activeStrategies.map(async (strategy) => {
        if (!strategy.tokenEnc) {
          throw new Error(`Strategy ${strategy.strategyId} has no token configured`)
        }
        return await startCopyTradingStream(strategy.accountId, strategy.strategyId)
      })
    )

    const started = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - started

    const errors = results
      .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
      .map((r, i) => {
        if (r.status === 'rejected') {
          return `Strategy ${activeStrategies[i].strategyId}: ${r.reason?.message || 'Unknown error'}`
        } else {
          return `Strategy ${activeStrategies[i].strategyId}: ${r.value.error || 'Unknown error'}`
        }
      })

    console.log(`[CopyTradingStreaming] Started ${started} streams, ${failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Started streaming for ${started} active strategy(ies)`,
      started,
      failed,
      total: activeStrategies.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    const authError = handleAuthError(error)
    console.error('[CopyTradingStreaming] Error starting all streams:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start streaming'
      },
      { status: authError.status }
    )
  }
}




