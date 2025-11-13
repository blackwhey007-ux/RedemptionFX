/**
 * Statistics Cache Utility
 * Simple in-memory cache with TTL for statistics data
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class StatisticsCache {
  private cache: Map<string, CacheEntry<any>> = new Map()

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    const now = Date.now()
    const age = now - entry.timestamp

    if (age > entry.ttl) {
      // Cache expired, remove it
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Store data in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  /**
   * Check if key exists and is valid (not expired)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    const now = Date.now()
    const age = now - entry.timestamp

    if (age > entry.ttl) {
      // Cache expired, remove it
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Remove a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clean up expired entries (optional, for memory management)
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      if (age > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Create singleton instance
const statisticsCache = new StatisticsCache()

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  accountInfo: (accountId: string) => `accountInfo:${accountId}`,
  positions: (accountId: string) => `positions:${accountId}`
}

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  ACCOUNT_INFO: 30 * 1000, // 30 seconds
  POSITIONS: 10 * 1000 // 10 seconds
}

/**
 * Get cached account info
 */
export function getCachedAccountInfo(accountId: string) {
  return statisticsCache.get(CACHE_KEYS.accountInfo(accountId))
}

/**
 * Set cached account info
 */
export function setCachedAccountInfo(accountId: string, data: any): void {
  statisticsCache.set(CACHE_KEYS.accountInfo(accountId), data, CACHE_TTL.ACCOUNT_INFO)
}

/**
 * Get cached positions
 */
export function getCachedPositions(accountId: string) {
  return statisticsCache.get(CACHE_KEYS.positions(accountId))
}

/**
 * Set cached positions
 */
export function setCachedPositions(accountId: string, data: any): void {
  statisticsCache.set(CACHE_KEYS.positions(accountId), data, CACHE_TTL.POSITIONS)
}

/**
 * Clear cache for a specific account
 */
export function clearAccountCache(accountId: string): void {
  statisticsCache.delete(CACHE_KEYS.accountInfo(accountId))
  statisticsCache.delete(CACHE_KEYS.positions(accountId))
}

/**
 * Clear all statistics cache
 */
export function clearAllCache(): void {
  statisticsCache.clear()
}

/**
 * Clean up expired cache entries
 */
export function cleanupCache(): void {
  statisticsCache.cleanup()
}

export default statisticsCache




