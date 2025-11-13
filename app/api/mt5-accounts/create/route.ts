import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/authServer'
import { createMetaAPIAccount } from '@/lib/metaapiRestClient'

/**
 * POST /api/mt5-accounts/create
 * Create a new MetaAPI account with MT5 credentials
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[CreateMT5Account] Request received')
    const user = await requireAuth(request)
    console.log('[CreateMT5Account] User authenticated:', user.uid)
    
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[CreateMT5Account] JSON parse error:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { login, password, server, platform, name, broker } = body

    if (!login || !password || !server || !platform) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: login, password, server, platform' },
        { status: 400 }
      )
    }

    if (platform !== 'mt4' && platform !== 'mt5') {
      return NextResponse.json(
        { success: false, error: 'Platform must be mt4 or mt5' },
        { status: 400 }
      )
    }

    // Get MetaAPI token from environment
    const token = process.env.METAAPI_TOKEN
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'MetaAPI token not configured' },
        { status: 500 }
      )
    }

    // Create MetaAPI account
    console.log('[CreateMT5Account] Creating account with data:', {
      login,
      server,
      platform,
      hasPassword: !!password,
      name,
      broker
    })
    
    let account
    try {
      account = await createMetaAPIAccount(token, {
        login,
        password,
        server,
        platform: platform as 'mt4' | 'mt5',
        name: name || `${login}@${server}`,
        broker
      })
      console.log('[CreateMT5Account] Account created successfully via SDK:', account?.id)
    } catch (metaApiError) {
      console.error('[CreateMT5Account] MetaAPI SDK account creation failed:', metaApiError)
      const errorMsg = metaApiError instanceof Error ? metaApiError.message : 'Unknown MetaAPI error'
      
      // Determine appropriate HTTP status based on error type
      let status = 500
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('Invalid token')) {
        status = 401
      } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        status = 403
      } else if (errorMsg.includes('400') || errorMsg.includes('Bad Request') || errorMsg.includes('Invalid')) {
        status = 400
      } else if (errorMsg.includes('409') || errorMsg.includes('Conflict') || errorMsg.includes('already exists')) {
        status = 409
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMsg // Error message already formatted by createMetaAPIAccount
        },
        { status }
      )
    }

    if (!account || !account.id) {
      console.error('[CreateMT5Account] Invalid account response:', account)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid response from MetaAPI: account ID missing' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name || name || `${login}@${server}`,
        login: account.login || login,
        server: account.server || server,
        platform: account.platform || platform
      }
    })
  } catch (error) {
    console.error('[CreateMT5Account] Unexpected error:', {
      error,
      errorType: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Check if it's an auth error
    let status = 500
    let errorMessage = 'Internal server error'
    
    if (error instanceof Error) {
      errorMessage = error.message || 'Internal server error'
      
      // Check if it's an auth error
      try {
        const { status: authStatus, message: authMessage } = handleAuthError(error)
        status = authStatus
        errorMessage = authMessage
      } catch {
        // Not an auth error, use the original error message
      }
    } else {
      errorMessage = String(error) || 'Internal server error'
    }
    
    // Ensure we return a proper error response
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status }
    )
  }
}

