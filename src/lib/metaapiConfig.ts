/**
 * MetaAPI SDK Configuration Helper
 * Handles serverless environment detection and storage path configuration
 * SERVER-ONLY: This module should only be used server-side
 */

// Set environment variable early to prevent MetaAPI SDK from using default path
if (typeof window === 'undefined') {
  const isServerless = 
    process.env.VERCEL || 
    process.env.VERCEL_ENV || 
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_TARGET ||
    process.env.K_SERVICE ||
    process.env.FUNCTIONS_WORKER_RUNTIME
  
  if (isServerless && !process.env.METAAPI_STORAGE_PATH) {
    // Set storage path before MetaAPI SDK tries to initialize
    process.env.METAAPI_STORAGE_PATH = '/tmp/.metaapi'
  }
}

/**
 * Detects if we're running in a serverless environment
 */
function isServerlessEnvironment(): boolean {
  // Vercel
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return true
  }
  
  // AWS Lambda
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return true
  }
  
  // Google Cloud Functions
  if (process.env.FUNCTION_TARGET || process.env.K_SERVICE) {
    return true
  }
  
  // Azure Functions
  if (process.env.FUNCTIONS_WORKER_RUNTIME) {
    return true
  }
  
  // Check for /tmp directory (writable in most serverless environments)
  // but this check would require fs operations, so we rely on env vars
  
  return false
}

/**
 * Gets the appropriate storage path for MetaAPI SDK
 * In serverless environments, uses /tmp which is writable
 * In regular environments, uses default (current directory/.metaapi)
 */
export function getMetaApiStoragePath(): string | undefined {
  if (isServerlessEnvironment()) {
    // In serverless, /tmp is writable (up to 512MB in Vercel)
    return '/tmp/.metaapi'
  }
  
  // In regular environments, let MetaAPI SDK use default (current directory/.metaapi)
  return undefined
}

/**
 * Gets MetaAPI SDK configuration options based on environment
 */
export function getMetaApiConfig(token: string, additionalOptions: Record<string, any> = {}): any {
  const storagePath = getMetaApiStoragePath()
  
  const config: any = {
    application: additionalOptions.application || 'redemptionfx',
    ...additionalOptions,
  }
  
  // Only add storagePath if we're in serverless (to avoid overriding defaults unnecessarily)
  if (storagePath) {
    // MetaAPI SDK may use different property names, try common ones
    // Some SDKs use 'storagePath', others use 'storage', or 'cachePath'
    config.storagePath = storagePath
    config.storage = storagePath
    config.cachePath = storagePath
    
    // Also set environment variable as fallback (some SDKs check this)
    if (!process.env.METAAPI_STORAGE_PATH) {
      process.env.METAAPI_STORAGE_PATH = storagePath
    }
  }
  
  return config
}

/**
 * Wraps MetaAPI SDK initialization with error handling for directory creation
 */
export async function createMetaApiInstanceSafely(
  MetaApiClass: any,
  token: string,
  additionalOptions: Record<string, any> = {}
): Promise<any> {
  const config = getMetaApiConfig(token, additionalOptions)
  
  // Ensure storage directory exists in serverless environments
  if (config.storagePath && typeof window === 'undefined') {
    try {
      // In serverless, we can't use fs.mkdirSync directly, but we can try
      // MetaAPI SDK should handle directory creation, but we ensure env var is set
      if (!process.env.METAAPI_STORAGE_PATH) {
        process.env.METAAPI_STORAGE_PATH = config.storagePath
      }
      
      // Try to ensure the directory structure exists using Node.js fs
      // Only in server-side environments
      if (typeof require !== 'undefined') {
        try {
          const fs = require('fs')
          const path = require('path')
          const dirPath = config.storagePath
          
          // Try to create directory if it doesn't exist (may fail in read-only filesystems)
          if (!fs.existsSync(dirPath)) {
            try {
              fs.mkdirSync(dirPath, { recursive: true })
              console.log(`✅ Created MetaAPI storage directory: ${dirPath}`)
            } catch (mkdirError: any) {
              // If mkdir fails, it's okay - MetaAPI SDK will try to create it or use in-memory
              console.warn(`⚠️ Could not create directory ${dirPath}, MetaAPI SDK will handle it:`, mkdirError.message)
            }
          }
        } catch (fsError) {
          // fs module not available or error - that's okay, MetaAPI SDK will handle it
          console.warn('⚠️ Could not check/create storage directory, MetaAPI SDK will handle it')
        }
      }
    } catch (dirError) {
      console.warn('⚠️ Error ensuring storage directory exists:', dirError)
      // Continue anyway - MetaAPI SDK should handle it
    }
  }
  
  try {
    // Try to create MetaAPI instance with configured storage path
    const instance = new MetaApiClass(token, config)
    return instance
  } catch (error: any) {
    // If directory creation fails, try without storage path (might use in-memory)
    if (error.message?.includes('ENOENT') || error.message?.includes('mkdir') || error.message?.includes('.metaapi')) {
      console.warn('⚠️ MetaAPI SDK directory creation failed, attempting without storage path:', error.message)
      
      try {
        // Try with minimal config (no storage path)
        const fallbackConfig = {
          application: config.application || 'redemptionfx',
        }
        const instance = new MetaApiClass(token, fallbackConfig)
        console.warn('⚠️ MetaAPI SDK initialized without file storage (using in-memory mode)')
        return instance
      } catch (fallbackError: any) {
        console.error('❌ MetaAPI SDK initialization failed even with fallback:', fallbackError)
        throw fallbackError
      }
    }
    
    // Re-throw other errors
    throw error
  }
}
