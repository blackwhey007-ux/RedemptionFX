import { NextRequest, NextResponse } from 'next/server'
import { updateCopyTradingAccountStatus, logWebhookEvent } from '@/lib/copyTradingRepo'

// Optional: Verify webhook secret if configured
const WEBHOOK_SECRET = process.env.COPYFACTORY_WEBHOOK_SECRET

/**
 * POST /api/webhooks/copyfactory
 * Handle CopyFactory webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const providedSecret = request.headers.get('x-webhook-secret')
      if (providedSecret !== WEBHOOK_SECRET) {
        console.warn('[CopyFactoryWebhook] Invalid webhook secret')
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid webhook secret'
          },
          { status: 401 }
        )
      }
    }

    const body = await request.json()

    console.log('[CopyFactoryWebhook] Received webhook event:', {
      type: body.type,
      subscriberAccountId: body.subscriberAccountId,
      strategyId: body.strategyId
    })

    // Generate event ID
    const eventId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Log event to Firestore
    await logWebhookEvent({
      eventId,
      type: body.type || 'unknown',
      subscriberAccountId: body.subscriberAccountId,
      strategyId: body.strategyId,
      data: body
    })

    // Handle different event types
    switch (body.type) {
      case 'subscriber_created':
        console.log(`[CopyFactoryWebhook] Subscriber created: ${body.subscriberAccountId}`)
        // Account status is already set to 'active' during creation
        break

      case 'subscriber_removed':
      case 'subscription_removed':
        console.log(`[CopyFactoryWebhook] Subscriber removed: ${body.subscriberAccountId}`)
        // Update status to inactive
        if (body.userId) {
          await updateCopyTradingAccountStatus(body.userId, 'inactive')
        }
        break

      case 'subscriber_error':
      case 'subscription_error':
        console.error(
          `[CopyFactoryWebhook] Subscriber error: ${body.subscriberAccountId}`,
          body.error
        )
        // Update status to error
        if (body.userId) {
          await updateCopyTradingAccountStatus(
            body.userId,
            'error',
            body.error || 'Unknown error'
          )
        }
        break

      case 'trade_copied':
        console.log(
          `[CopyFactoryWebhook] Trade copied for subscriber: ${body.subscriberAccountId}`
        )
        // You can extend this to track copied trades
        break

      default:
        console.log(`[CopyFactoryWebhook] Unhandled event type: ${body.type}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      eventId
    })
  } catch (error) {
    console.error('[CopyFactoryWebhook] Error processing webhook:', error)

    const message = error instanceof Error ? error.message : 'Failed to process webhook'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/copyfactory
 * Webhook verification endpoint (for webhook setup)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'CopyFactory webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}





