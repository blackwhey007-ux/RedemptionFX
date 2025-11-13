'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, History, Loader2, RefreshCw } from 'lucide-react'

interface StreamingLog {
  id: string
  type: string
  timestamp: string | Date
  message: string
  success?: boolean
  error?: string
}

interface LogsResponse {
  success: boolean
  logs: StreamingLog[]
  error?: string
}

const formatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})

const typeColors: Record<string, string> = {
  streaming_started: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  streaming_stopped: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  heartbeat: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  position_updated: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  position_closed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
}

export function MetaApiLogsPreview() {
  const [logs, setLogs] = useState<StreamingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLogs = async () => {
    try {
      setError(null)
      const response = await fetch('/api/mt5-streaming/logs?limit=12', {
        cache: 'no-store'
      })
      const data: LogsResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load streaming logs')
      }

      const normalized = (data.logs || []).map((log) => ({
        ...log,
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date()
      }))

      setLogs(normalized)
    } catch (err) {
      console.error('[MetaApiLogsPreview] Failed to load logs', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLogs()
  }

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading recent logs...
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-red-600 dark:text-red-300">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )
    }

    if (!logs.length) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <History className="h-5 w-5" />
          <span>No streaming activity recorded yet.</span>
        </div>
      )
    }

    return (
      <ScrollArea className="h-64 pr-2">
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-md border border-border/60 bg-background/60 p-3 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge className={typeColors[log.type] || 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-200'}>
                  {log.type.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatter.format(new Date(log.timestamp))}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{log.message}</p>
              {log.error && (
                <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-200">
                  {log.error}
                </p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    )
  }, [error, loading, logs])

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Recent Streaming Logs</CardTitle>
          <CardDescription>
            Quick health view of MetaAPI events. Use the full logs page for deep troubleshooting.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            size="sm"
            variant="outline"
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button asChild size="sm" variant="ghost" className="gap-2">
            <Link href="/dashboard/admin/streaming-logs">
              <History className="h-4 w-4" />
              View Full Logs
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}





