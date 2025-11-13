'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  RefreshCw, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Trash2,
  ExternalLink,
  PlayCircle,
  StopCircle,
  Filter,
  Clock
} from 'lucide-react'
import { StreamingLogType } from '@/lib/streamingLogService'

interface StreamingLog {
  id?: string
  type: StreamingLogType
  timestamp: Date | string
  message: string
  details?: any
  success?: boolean
  error?: string
  positionId?: string
  signalId?: string
  accountId?: string
}

export default function StreamingLogsPage() {
  const [logs, setLogs] = useState<StreamingLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<StreamingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<StreamingLogType | 'all'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [streamingStatus, setStreamingStatus] = useState<any>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLogs()
    loadStreamingStatus()
    
    // Auto-refresh every 2 seconds if enabled
    let refreshInterval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        loadLogs()
        loadStreamingStatus()
      }, 2000)
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [autoRefresh])

  useEffect(() => {
    // Apply filter
    if (filterType === 'all') {
      setFilteredLogs(logs)
    } else {
      setFilteredLogs(logs.filter(log => log.type === filterType))
    }
    
    // Auto-scroll to bottom when new logs arrive (if already at bottom)
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const isScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100
      if (isScrolledToBottom) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight
        }, 100)
      }
    }
  }, [logs, filterType])

  const loadLogs = async () => {
    try {
      console.log('[LOGS_PAGE] Fetching logs...')
      const response = await fetch('/api/mt5-streaming/logs?limit=500')
      const data = await response.json()
      
      console.log('[LOGS_PAGE] Response:', { success: data.success, count: data.count, error: data.error })
      
      if (data.success) {
        // Convert timestamp strings to Date objects if needed
        const processedLogs = data.logs.map((log: StreamingLog) => ({
          ...log,
          timestamp: typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp
        }))
        console.log('[LOGS_PAGE] Processed logs:', processedLogs.length)
        setLogs(processedLogs)
      } else {
        console.error('[LOGS_PAGE] Failed to load logs:', data.error)
        alert(`Error loading logs: ${data.error}`)
      }
    } catch (error) {
      console.error('[LOGS_PAGE] Error loading logs:', error)
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadStreamingStatus = async () => {
    try {
      const response = await fetch('/api/mt5-streaming/start')
      const data = await response.json()
      setStreamingStatus(data.status)
    } catch (error) {
      console.error('Error loading streaming status:', error)
    }
  }

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch('/api/mt5-streaming/logs', {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        setLogs([])
        setFilteredLogs([])
      } else {
        alert(`Error clearing logs: ${data.error}`)
      }
    } catch (error) {
      console.error('Error clearing logs:', error)
      alert('Error clearing logs')
    }
  }

  const openInNewTab = () => {
    window.open(window.location.href, '_blank')
  }

  const getLogIcon = (log: StreamingLog) => {
    switch (log.type) {
      case 'position_detected':
        return <Activity className="h-4 w-4 text-blue-500" />
      case 'signal_created':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'signal_updated':
        return <RefreshCw className="h-4 w-4 text-purple-500" />
      case 'telegram_sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'telegram_failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'position_closed':
        return <StopCircle className="h-4 w-4 text-gray-500" />
      case 'streaming_started':
        return <PlayCircle className="h-4 w-4 text-green-500" />
      case 'streaming_stopped':
        return <StopCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getLogColor = (log: StreamingLog) => {
    if (log.success === false || log.error) {
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
    }
    if (log.success === true) {
      return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
    }
    return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
  }

  const getTypeBadgeColor = (type: StreamingLogType) => {
    switch (type) {
      case 'position_detected':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'signal_created':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'signal_updated':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'telegram_sent':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
      case 'telegram_failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'position_closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      case 'streaming_started':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'streaming_stopped':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatTimestamp = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MT5 Streaming Logs</h1>
          <p className="text-muted-foreground mt-2">
            Real-time logs of position detection, signal creation, and Telegram notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={openInNewTab}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </Button>
          <Button
            variant="outline"
            onClick={clearLogs}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear Logs
          </Button>
          <Button
            variant="outline"
            onClick={loadLogs}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch('/api/mt5-streaming/test-logs')
                const data = await response.json()
                console.log('Test result:', data)
                alert(`Test completed:\n${JSON.stringify(data, null, 2)}`)
              } catch (error) {
                console.error('Test error:', error)
                alert(`Test failed: ${error}`)
              }
            }}
            className="flex items-center gap-2"
          >
            Test Logs
          </Button>
        </div>
      </div>

      {/* Streaming Status */}
      {streamingStatus && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`h-3 w-3 rounded-full ${streamingStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <div className="font-medium">
                  Streaming Status: {streamingStatus.isConnected ? 'Active' : 'Inactive'}
                </div>
                {streamingStatus.accountId && (
                  <div className="text-sm text-muted-foreground">
                    Account: {streamingStatus.accountId}
                  </div>
                )}
                {streamingStatus.lastEvent && (
                  <div className="text-sm text-muted-foreground">
                    Last Event: {formatTimestamp(new Date(streamingStatus.lastEvent))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Streaming Activity Logs</CardTitle>
              <CardDescription>
                {filteredLogs.length} of {logs.length} logs
                {autoRefresh && ' • Auto-refreshing every 2 seconds'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoRefresh" className="text-sm">
                  Auto-refresh
                </label>
              </div>
              <Select
                value={filterType}
                onValueChange={(value) => setFilterType(value as StreamingLogType | 'all')}
              >
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="position_detected">Position Detected</SelectItem>
                  <SelectItem value="signal_created">Signal Created</SelectItem>
                  <SelectItem value="signal_updated">Signal Updated</SelectItem>
                  <SelectItem value="telegram_sent">Telegram Sent</SelectItem>
                  <SelectItem value="telegram_failed">Telegram Failed</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="position_closed">Position Closed</SelectItem>
                  <SelectItem value="streaming_started">Streaming Started</SelectItem>
                  <SelectItem value="streaming_stopped">Streaming Stopped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={scrollContainerRef}
            className="space-y-2 max-h-[600px] overflow-y-auto"
          >
            {loading && filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No logs found{filterType !== 'all' ? ` for type: ${filterType}` : ''}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id || `${log.timestamp}-${log.type}`}
                  className={`p-4 rounded-lg border ${getLogColor(log)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getLogIcon(log)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getTypeBadgeColor(log.type)}>
                          {log.type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <div className="font-medium mb-1">{log.message}</div>
                      {log.error && (
                        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Error: {log.error}
                        </div>
                      )}
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-black/5 dark:bg-white/5 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                      {(log.positionId || log.signalId) && (
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          {log.positionId && <span>Position ID: {log.positionId}</span>}
                          {log.signalId && <span>Signal ID: {log.signalId}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

