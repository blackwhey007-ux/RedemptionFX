/**
 * Crypto Service
 * AES-GCM encryption/decryption for sensitive data (MetaTrader passwords)
 */

// Validate encryption key
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

if (!ENCRYPTION_KEY) {
  console.warn('⚠️ ENCRYPTION_KEY not set. Password encryption will not work.')
}

/**
 * Encrypt a plaintext string using AES-GCM
 * Returns base64-encoded: iv:ciphertext:authTag
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  try {
    const crypto = await import('crypto')
    
    // Decode the base64 key
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'base64')
    
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12)
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    
    // Get auth tag
    const authTag = cipher.getAuthTag().toString('base64')
    
    // Return format: iv:ciphertext:authTag (all base64)
    return `${iv.toString('base64')}:${encrypted}:${authTag}`
  } catch (error) {
    console.error('[Crypto] Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt a ciphertext string using AES-GCM
 * Expects format: iv:ciphertext:authTag (all base64)
 */
export async function decrypt(ciphertext: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  try {
    const crypto = await import('crypto')
    
    // Parse the encrypted data
    const parts = ciphertext.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }
    
    const [ivBase64, encryptedBase64, authTagBase64] = parts
    
    // Decode the base64 key
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'base64')
    
    // Decode components
    const iv = Buffer.from(ivBase64, 'base64')
    const encrypted = Buffer.from(encryptedBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
    decipher.setAuthTag(authTag)
    
    // Decrypt
    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Generate a new encryption key (for initial setup)
 * Returns a base64-encoded 32-byte key suitable for AES-256
 */
export async function generateEncryptionKey(): Promise<string> {
  const crypto = await import('crypto')
  const key = crypto.randomBytes(32) // 256 bits
  return key.toString('base64')
}





