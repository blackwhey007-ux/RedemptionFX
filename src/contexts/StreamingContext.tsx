'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { connectionManager } from '@/lib/streamingConnectionManager'

interface StreamingState {
  isActive: boolean
  isConnected: boolean
  accountId: string | null
  startTime: Date | null
  lastEvent: Date | null
  positionCount: number
  reconnectAttempts: number
  health: number
  error: string | null
  isCircuitOpen: boolean
}

interface StreamingContextType {
  state: StreamingState
  startStreaming: () => Promise<{ success: boolean; error?: string }>
  stopStreaming: () => Promise<void>
  resetCircuitBreaker: () => void
  refreshStatus: () => Promise<void>
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined)

interface StreamingProviderProps {
  children: ReactNode
}

export function StreamingProvider({ children }: StreamingProviderProps) {
  const [state, setState] = useState<StreamingState>({
    isActive: false,
    isConnected: false,
    accountId: null,
    startTime: null,
    lastEvent: null,
    positionCount: 0,
    reconnectAttempts: 0,
    health: 0,
    error: null,
    isCircuitOpen: false
  })

  // Load streaming status from API
  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/mt5-streaming/start', { method: 'GET' })
      
      if (response.ok) {
        const data = await response.json()
        const managerState = connectionManager.getState()
        const health = connectionManager.getHealth()
        
        setState({
          isActive: data.status?.isActive || false,
          isConnected: data.status?.isConnected || false,
          accountId: data.status?.accountId || null,
          startTime: data.status?.startTime ? new Date(data.status.startTime) : null,
          lastEvent: data.status?.lastEvent ? new Date(data.status.lastEvent) : null,
          positionCount: 0, // Will be updated by position fetches
          reconnectAttempts: managerState.reconnectAttempts,
          health: health.score,
          error: data.status?.error || null,
          isCircuitOpen: managerState.isCircuitOpen
        })
      }
    } catch (error) {
      console.error('Error refreshing streaming status:', error)
    }
  }, [])

  // Start streaming
  const startStreaming = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🚀 [STREAMING_CONTEXT] Starting streaming...')
      
      const response = await fetch('/api/mt5-streaming/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ [STREAMING_CONTEXT] Streaming started successfully')
        await refreshStatus()
        return { success: true }
      } else {
        console.error('❌ [STREAMING_CONTEXT] Failed to start streaming:', data.error)
        setState(prev => ({ ...prev, error: data.error }))
        return { success: false, error: data.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ [STREAMING_CONTEXT] Error starting streaming:', error)
      setState(prev => ({ ...prev, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [refreshStatus])

  // Stop streaming
  const stopStreaming = useCallback(async () => {
    try {
      console.log('🛑 [STREAMING_CONTEXT] Stopping streaming...')
      
      const response = await fetch('/api/mt5-streaming/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ [STREAMING_CONTEXT] Streaming stopped successfully')
        connectionManager.reset()
        setState({
          isActive: false,
          isConnected: false,
          accountId: null,
          startTime: null,
          lastEvent: null,
          positionCount: 0,
          reconnectAttempts: 0,
          health: 0,
          error: null,
          isCircuitOpen: false
        })
      }
    } catch (error) {
      console.error('❌ [STREAMING_CONTEXT] Error stopping streaming:', error)
    }
  }, [])

  // Reset circuit breaker
  const resetCircuitBreaker = useCallback(() => {
    console.log('🔄 [STREAMING_CONTEXT] Resetting circuit breaker')
    connectionManager.resetCircuit()
    setState(prev => ({ ...prev, isCircuitOpen: false, error: null }))
  }, [])

  // Poll streaming status every 10 seconds when active
  useEffect(() => {
    const interval = setInterval(async () => {
      if (state.isActive) {
        await refreshStatus()
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [state.isActive, refreshStatus])

  // Initial load
  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const value: StreamingContextType = {
    state,
    startStreaming,
    stopStreaming,
    resetCircuitBreaker,
    refreshStatus
  }

  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  )
}

export function useStreaming() {
  const context = useContext(StreamingContext)
  if (context === undefined) {
    throw new Error('useStreaming must be used within a StreamingProvider')
  }
  return context
}



