/**
 * MetaAPI SDK Configuration Helper
 * Handles serverless environment detection and storage path configuration
 * SERVER-ONLY: This module should only be used server-side
 */

// Set environment variable early to prevent MetaAPI SDK from using default path
// This MUST run before any MetaAPI SDK code is imported
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
    // MetaAPI SDK may check this during module initialization
    if (!process.env.METAAPI_STORAGE_PATH) {
      process.env.METAAPI_STORAGE_PATH = '/tmp/.metaapi'
    }
    
    // Also try to set alternative environment variables MetaAPI SDK might check
    if (!process.env.METAAPI_CACHE_PATH) {
      process.env.METAAPI_CACHE_PATH = '/tmp/.metaapi'
    }
    
    // Try to create the directory immediately if possible
    try {
      if (typeof require !== 'undefined') {
        const fs = require('fs')
        const dirPath = '/tmp/.metaapi'
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true })
        }
      }
    } catch (dirError) {
      // Directory creation may fail, but that's okay - we'll handle it in createMetaApiInstanceSafely
      console.warn('⚠️ Could not pre-create /tmp/.metaapi directory:', dirError)
    }
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
    const errorMessage = error?.message || String(error)
    const errorStack = error?.stack || ''
    
    // Check if it's a directory creation error (including /var/task which is read-only in Vercel)
    const isDirectoryError = 
      errorMessage.includes('ENOENT') || 
      errorMessage.includes('mkdir') || 
      errorMessage.includes('.metaapi') ||
      errorMessage.includes('metaapi') ||
      errorMessage.includes('/var/task') ||
      errorStack.includes('ENOENT') ||
      errorStack.includes('mkdir')
    
    if (isDirectoryError) {
      console.warn('⚠️ MetaAPI SDK directory creation failed, attempting without storage path:', errorMessage)
      console.warn('   Error details:', { message: errorMessage, stack: errorStack.substring(0, 200) })
      
      try {
        // Try with minimal config (no storage path) - SDK might use in-memory mode
        const fallbackConfig = {
          application: config.application || 'redemptionfx',
        }
        
        const instance = new MetaApiClass(token, fallbackConfig)
        console.warn('⚠️ MetaAPI SDK initialized without file storage (using in-memory mode)')
        return instance
      } catch (fallbackError: any) {
        console.error('❌ MetaAPI SDK initialization failed even with fallback:', fallbackError?.message || fallbackError)
        
        // Last resort: try with absolute minimal config
        try {
          const minimalConfig = {
            application: config.application || 'redemptionfx',
          }
          const instance = new MetaApiClass(token, minimalConfig)
          console.warn('⚠️ MetaAPI SDK initialized with minimal config')
          return instance
        } catch (minimalError: any) {
          console.error('❌ MetaAPI SDK initialization failed with all fallback attempts')
          throw new Error(`MetaAPI SDK initialization failed: ${errorMessage}. Fallback attempts also failed: ${fallbackError?.message || 'Unknown error'}`)
        }
      }
    }
    
    // Re-throw other errors
    throw error
  }
}
