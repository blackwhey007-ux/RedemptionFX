/**
 * Professional Streaming Connection Manager
 * Handles reconnection with exponential backoff and circuit breaker pattern
 */

interface ConnectionHealth {
  score: number // 0-100
  lastSuccessfulEvent: Date | null
  consecutiveFailures: number
  totalReconnects: number
  uptime: number // seconds
}

interface ReconnectionStrategy {
  attempts: number
  nextDelay: number
  isCircuitOpen: boolean
  lastAttempt: Date | null
}

export class StreamingConnectionManager {
  private reconnectAttempts = 0
  private baseDelay = 5000 // 5 seconds
  private maxDelay = 300000 // 5 minutes
  private failureCount = 0
  private circuitBreakerThreshold = 10
  private isCircuitOpen = false
  private startTime: Date | null = null
  private lastSuccessfulEvent: Date | null = null
  private totalReconnects = 0
  private reconnectTimer: NodeJS.Timeout | null = null

  /**
   * Calculate next reconnection delay using exponential backoff
   */
  private calculateDelay(): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, this.reconnectAttempts)
    const jitter = Math.random() * 1000 // Add jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, this.maxDelay)
  }

  /**
   * Check if circuit breaker should be triggered
   */
  private shouldOpenCircuit(): boolean {
    return this.failureCount >= this.circuitBreakerThreshold
  }

  /**
   * Calculate connection health score (0-100)
   */
  getHealth(): ConnectionHealth {
    const now = Date.now()
    const uptime = this.startTime ? (now - this.startTime.getTime()) / 1000 : 0
    
    // Base score starts at 100
    let score = 100

    // Penalize for reconnect attempts
    score -= this.reconnectAttempts * 10

    // Penalize for consecutive failures
    score -= this.failureCount * 5

    // Penalize for circuit breaker
    if (this.isCircuitOpen) score = 0

    // Penalize for stale connection (no events in last 5 minutes)
    if (this.lastSuccessfulEvent) {
      const timeSinceLastEvent = (now - this.lastSuccessfulEvent.getTime()) / 1000
      if (timeSinceLastEvent > 300) { // 5 minutes
        score -= 20
      }
    }

    // Ensure score is between 0-100
    score = Math.max(0, Math.min(100, score))

    return {
      score,
      lastSuccessfulEvent: this.lastSuccessfulEvent,
      consecutiveFailures: this.failureCount,
      totalReconnects: this.totalReconnects,
      uptime
    }
  }

  /**
   * Record successful connection
   */
  onSuccess(): void {
    console.log('✅ [CONNECTION_MANAGER] Connection successful')
    this.reconnectAttempts = 0
    this.failureCount = 0
    this.isCircuitOpen = false
    this.lastSuccessfulEvent = new Date()
    
    if (!this.startTime) {
      this.startTime = new Date()
    }
  }

  /**
   * Record connection failure
   */
  onFailure(error?: Error): void {
    this.failureCount++
    console.error(`❌ [CONNECTION_MANAGER] Connection failure #${this.failureCount}`, error?.message)

    if (this.shouldOpenCircuit()) {
      this.openCircuit()
    }
  }

  /**
   * Record successful event (keepalive)
   */
  onEvent(): void {
    this.lastSuccessfulEvent = new Date()
  }

  /**
   * Open circuit breaker (stop reconnection attempts)
   */
  private openCircuit(): void {
    this.isCircuitOpen = true
    console.error('⚠️ [CIRCUIT_BREAKER] Circuit opened - too many failures')
    console.error(`⚠️ [CIRCUIT_BREAKER] Failed ${this.failureCount} times, threshold: ${this.circuitBreakerThreshold}`)
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * Manually reset circuit breaker (admin action)
   */
  resetCircuit(): void {
    console.log('🔄 [CIRCUIT_BREAKER] Manually resetting circuit breaker')
    this.isCircuitOpen = false
    this.failureCount = 0
    this.reconnectAttempts = 0
  }

  /**
   * Get reconnection strategy
   */
  getReconnectionStrategy(): ReconnectionStrategy {
    return {
      attempts: this.reconnectAttempts,
      nextDelay: this.calculateDelay(),
      isCircuitOpen: this.isCircuitOpen,
      lastAttempt: this.reconnectTimer ? new Date() : null
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  async scheduleReconnect(reconnectFn: () => Promise<void>): Promise<void> {
    if (this.isCircuitOpen) {
      console.error('❌ [RECONNECT] Circuit breaker is open - cannot reconnect')
      console.error('⚠️ [RECONNECT] Manual intervention required. Reset circuit breaker to retry.')
      return
    }

    this.reconnectAttempts++
    this.totalReconnects++

    const delay = this.calculateDelay()
    console.log(`🔄 [RECONNECT] Scheduling reconnect attempt #${this.reconnectAttempts} in ${Math.round(delay / 1000)}s`)

    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    // Schedule reconnection
    this.reconnectTimer = setTimeout(async () => {
      console.log(`🔄 [RECONNECT] Executing reconnect attempt #${this.reconnectAttempts}`)
      
      try {
        await reconnectFn()
        console.log('✅ [RECONNECT] Reconnection successful')
        this.onSuccess()
      } catch (error) {
        console.error('❌ [RECONNECT] Reconnection failed:', error)
        this.onFailure(error instanceof Error ? error : new Error('Reconnection failed'))
        
        // Schedule next attempt if circuit isn't open
        if (!this.isCircuitOpen) {
          await this.scheduleReconnect(reconnectFn)
        }
      }
    }, delay)
  }

  /**
   * Cancel scheduled reconnection
   */
  cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
      console.log('🛑 [RECONNECT] Cancelled scheduled reconnection')
    }
  }

  /**
   * Reset connection manager (when stopping streaming intentionally)
   */
  reset(): void {
    console.log('🔄 [CONNECTION_MANAGER] Resetting state')
    this.reconnectAttempts = 0
    this.failureCount = 0
    this.isCircuitOpen = false
    this.startTime = null
    this.lastSuccessfulEvent = null
    this.totalReconnects = 0
    this.cancelReconnect()
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      reconnectAttempts: this.reconnectAttempts,
      failureCount: this.failureCount,
      isCircuitOpen: this.isCircuitOpen,
      startTime: this.startTime,
      lastSuccessfulEvent: this.lastSuccessfulEvent,
      totalReconnects: this.totalReconnects,
      health: this.getHealth()
    }
  }
}

// Export singleton instance
export const connectionManager = new StreamingConnectionManager()



