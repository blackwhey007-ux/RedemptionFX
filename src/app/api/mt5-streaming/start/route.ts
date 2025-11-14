import { NextRequest, NextResponse } from 'next/server'

// CRITICAL: Set environment variable BEFORE any MetaAPI SDK code is imported
// MetaAPI SDK may try to create directories during module initialization
if (typeof window === 'undefined') {
  const isServerless = 
    process.env.VERCEL || 
    process.env.VERCEL_ENV || 
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_TARGET ||
    process.env.K_SERVICE ||
    process.env.FUNCTIONS_WORKER_RUNTIME
  
  if (isServerless) {
    // Set storage path to /tmp which is writable in serverless
    if (!process.env.METAAPI_STORAGE_PATH) {
      process.env.METAAPI_STORAGE_PATH = '/tmp/.metaapi'
    }
    if (!process.env.METAAPI_CACHE_PATH) {
      process.env.METAAPI_CACHE_PATH = '/tmp/.metaapi'
    }
    
    // Try to create directory immediately
    try {
      if (typeof require !== 'undefined') {
        const fs = require('fs')
        const dirPath = '/tmp/.metaapi'
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true })
        }
      }
    } catch (dirError) {
      // Directory creation may fail, but that's okay
    }
  }
}

import { initializeStreaming, getStreamingStatus } from '@/lib/metaapiStreamingService'

// Force dynamic rendering for serverless functions
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for streaming initialization

/**
 * GET - Check streaming status
 */
export async function GET(request: NextRequest) {
  try {
    const status = await getStreamingStatus()
    
    return NextResponse.json({
      success: true,
      status: {
        isActive: status?.active || false,
        isConnected: status?.isConnected || false,
        accountId: status?.accountId || null,
        lastEvent: status?.lastEvent || null,
        error: status?.error || null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error getting streaming status:', error)
    return NextResponse.json({
      success: false,
      status: {
        isActive: false,
        isConnected: false
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST - Start streaming
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting MT5 streaming via API...')

    // Initialize the streaming service
    const result = await initializeStreaming()
    
    if (!result.success) {
      console.error('❌ Failed to start streaming:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to start streaming'
      }, { status: 500 })
    }

    console.log('✅ MT5 streaming started successfully')

    // Get updated status
    const status = await getStreamingStatus()

    return NextResponse.json({
      success: true,
      message: 'Streaming started successfully',
      status: {
        isActive: status?.active || true,
        isConnected: status?.isConnected || true,
        accountId: status?.accountId,
        lastEvent: status?.lastEvent
      }
    })

  } catch (error) {
    console.error('❌ Error starting streaming:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    let statusCode = 500
    
    // Handle subscription limit specially
    if (errorMessage.includes('TooManyRequestsError') || errorMessage.includes('subscription')) {
      statusCode = 429
    }
    
    // Handle ENOENT/mkdir errors
    if (errorMessage.includes('ENOENT') || errorMessage.includes('mkdir') || errorMessage.includes('.metaapi')) {
      console.error('❌ MetaAPI directory creation error detected!')
      console.error('   This should be fixed by metaapiConfig.ts setting METAAPI_STORAGE_PATH')
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorDetails: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      hint: statusCode === 429 ? 'Visit https://app.metaapi.cloud/ to manage connections or call POST /api/mt5-streaming/cleanup' : undefined
    }, { status: statusCode })
  }
}

