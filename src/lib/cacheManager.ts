/**
 * Unified Cache Manager
 * Provides TTL-based caching to reduce Firestore reads
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  // TTL configurations for different data types (in milliseconds)
  private readonly TTL_CONFIG = {
    notifications: 2 * 60 * 1000,        // 2 minutes
    notificationStats: 5 * 60 * 1000,    // 5 minutes
    promotions: 10 * 60 * 1000,          // 10 minutes
    signals: 5 * 60 * 1000,              // 5 minutes
    leaderboard: 15 * 60 * 1000,         // 15 minutes
    streamingLogs: 2 * 60 * 1000,        // 2 minutes
    trades: 3 * 60 * 1000,               // 3 minutes
    userProfile: 10 * 60 * 1000,         // 10 minutes
    currencyPairs: 30 * 60 * 1000,       // 30 minutes (rarely changes)
    events: 10 * 60 * 1000,              // 10 minutes
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    const now = Date.now()
    const age = now - entry.timestamp

    // Check if cache entry has expired
    if (age > entry.ttl) {
      console.log(`[CACHE] Expired: ${key} (age: ${Math.round(age / 1000)}s, ttl: ${Math.round(entry.ttl / 1000)}s)`)
      this.cache.delete(key)
      return null
    }

    console.log(`[CACHE] Hit: ${key} (age: ${Math.round(age / 1000)}s)`)
    return entry.data as T
  }

  /**
   * Set data in cache with optional custom TTL
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    const ttl = customTTL || this.DEFAULT_TTL
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    console.log(`[CACHE] Set: ${key} (ttl: ${Math.round(ttl / 1000)}s)`)
  }

  /**
   * Set data with type-specific TTL
   */
  setTyped<T>(type: keyof typeof this.TTL_CONFIG, key: string, data: T): void {
    const ttl = this.TTL_CONFIG[type]
    this.set(key, data, ttl)
  }

  /**
   * Get data with type-specific TTL
   */
  getTyped<T>(type: keyof typeof this.TTL_CONFIG, key: string): T | null {
    return this.get<T>(key)
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    console.log(`[CACHE] Invalidate: ${key}`)
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    const matchingKeys = keys.filter(key => key.includes(pattern))
    
    matchingKeys.forEach(key => {
      console.log(`[CACHE] Invalidate (pattern): ${key}`)
      this.cache.delete(key)
    })
  }

  /**
   * Clear all cache
   */
  clear(): void {
    console.log('[CACHE] Clear all')
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([_, entry]) => {
        const age = now - entry.timestamp
        return age <= entry.ttl
      }).length,
      expiredEntries: entries.filter(([_, entry]) => {
        const age = now - entry.timestamp
        return age > entry.ttl
      }).length,
      totalSize: entries.reduce((sum, [key, entry]) => {
        return sum + JSON.stringify(entry.data).length
      }, 0)
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const keys = Array.from(this.cache.keys())
    
    keys.forEach(key => {
      const entry = this.cache.get(key)
      if (entry) {
        const age = now - entry.timestamp
        if (age > entry.ttl) {
          this.cache.delete(key)
        }
      }
    })
  }

  /**
   * Auto-cleanup every 5 minutes
   */
  startAutoCleanup(): void {
    setInterval(() => {
      console.log('[CACHE] Auto-cleanup running...')
      this.cleanup()
      const stats = this.getStats()
      console.log('[CACHE] Stats:', stats)
    }, 5 * 60 * 1000)
  }
}

// Export singleton instance
export const cacheManager = new CacheManager()

// Start auto-cleanup
if (typeof window !== 'undefined') {
  cacheManager.startAutoCleanup()
}



