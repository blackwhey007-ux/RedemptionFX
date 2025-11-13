'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getStreamingLogs, deleteAllStreamingLogs, StreamingLog, StreamingLogType } from '@/lib/streamingLogService'
import { 
  FileText, 
  RefreshCw, 
  Filter, 
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  TrendingUp,
  Send,
  Edit,
  Target,
  Power,
  PowerOff,
  Wifi,
  WifiOff,
  Trash2
} from 'lucide-react'

export default function StreamingLogsPage() {
  const [logs, setLogs] = useState<StreamingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<StreamingLogType | 'all'>('all')
  const [limit, setLimit] = useState(50)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [filterType, limit])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const fetchedLogs = await getStreamingLogs(
        limit,
        filterType === 'all' ? undefined : filterType
      )
      setLogs(fetchedLogs)
    } catch (error) {
      console.error('Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLogIcon = (type: StreamingLogType) => {
    switch (type) {
      case 'position_detected': return <Target className="h-4 w-4 text-blue-500" />
      case 'position_tp_sl_changed': return <Edit className="h-4 w-4 text-orange-500" />
      case 'signal_created': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'signal_updated': return <RefreshCw className="h-4 w-4 text-blue-500" />
      case 'telegram_sent': return <Send className="h-4 w-4 text-green-500" />
      case 'telegram_updated': return <Edit className="h-4 w-4 text-blue-500" />
      case 'telegram_failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'position_closed': return <PowerOff className="h-4 w-4 text-gray-500" />
      case 'streaming_started': return <Power className="h-4 w-4 text-green-500" />
      case 'streaming_stopped': return <PowerOff className="h-4 w-4 text-gray-500" />
      case 'connection_lost': return <WifiOff className="h-4 w-4 text-red-500" />
      case 'connection_restored': return <Wifi className="h-4 w-4 text-green-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getLogBadgeColor = (type: StreamingLogType, success?: boolean) => {
    if (success === false) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    
    switch (type) {
      case 'position_detected': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'position_tp_sl_changed': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'signal_created': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'telegram_sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'telegram_updated': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'telegram_failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'connection_lost': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'connection_restored': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatLogType = (type: StreamingLogType) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Type', 'Message', 'Success', 'Position ID', 'Signal ID', 'Account ID'].join(','),
      ...logs.map(log => [
        log.timestamp.toISOString(),
        log.type,
        `"${log.message.replace(/"/g, '""')}"`,
        log.success || 'N/A',
        log.positionId || '',
        log.signalId || '',
        log.accountId || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `streaming-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleDeleteAllLogs = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteAllStreamingLogs()
      if (result.success) {
        console.log(`Deleted ${result.deletedCount} logs`)
        setLogs([])
        setShowDeleteConfirm(false)
      } else {
        console.error('Failed to delete logs:', result.error)
      }
    } catch (error) {
      console.error('Error deleting logs:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Streaming Logs
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor MT5 position detection, TP/SL changes, and Telegram notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportLogs} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteConfirm(true)} 
            disabled={logs.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean All Logs
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Type:</label>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="position_detected">Position Detected</SelectItem>
                <SelectItem value="position_tp_sl_changed">TP/SL Changed</SelectItem>
                <SelectItem value="signal_created">Signal Created</SelectItem>
                <SelectItem value="signal_updated">Signal Updated</SelectItem>
                <SelectItem value="telegram_sent">Telegram Sent</SelectItem>
                <SelectItem value="telegram_updated">Telegram Updated</SelectItem>
                <SelectItem value="telegram_failed">Telegram Failed</SelectItem>
                <SelectItem value="position_closed">Position Closed</SelectItem>
                <SelectItem value="streaming_started">Streaming Started</SelectItem>
                <SelectItem value="streaming_stopped">Streaming Stopped</SelectItem>
                <SelectItem value="connection_lost">Connection Lost</SelectItem>
                <SelectItem value="connection_restored">Connection Restored</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Limit:</label>
            <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Logs ({logs.length})</span>
            {filterType !== 'all' && (
              <Badge variant="outline">{formatLogType(filterType as StreamingLogType)}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Real-time streaming events and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No logs found</p>
              <p className="text-sm mt-2">Start streaming to see logs appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div
                  key={log.id || index}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getLogIcon(log.type)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getLogBadgeColor(log.type, log.success)}>
                          {formatLogType(log.type)}
                        </Badge>
                        {log.success === true && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {log.success === false && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs text-gray-500">
                          {log.timestamp.toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {log.message}
                      </p>

                      {/* TP/SL Change Details */}
                      {log.type === 'position_tp_sl_changed' && log.details && (
                        <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-medium text-orange-900 dark:text-orange-100 mb-1">Stop Loss</p>
                              {log.details.slChanged ? (
                                <p className="text-orange-700 dark:text-orange-300">
                                  {log.details.oldSL || 'None'} → <strong>{log.details.newSL || 'None'}</strong>
                                </p>
                              ) : (
                                <p className="text-gray-500">No change</p>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-orange-900 dark:text-orange-100 mb-1">Take Profit</p>
                              {log.details.tpChanged ? (
                                <p className="text-orange-700 dark:text-orange-300">
                                  {log.details.oldTP || 'None'} → <strong>{log.details.newTP || 'None'}</strong>
                                </p>
                              ) : (
                                <p className="text-gray-500">No change</p>
                              )}
                            </div>
                          </div>
                          {log.details.symbol && (
                            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                              Symbol: <strong>{log.details.symbol}</strong> | 
                              Type: <strong>{log.details.type}</strong> | 
                              Current Price: <strong>{log.details.currentPrice}</strong> | 
                              P/L: <strong className={log.details.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ${log.details.profit?.toFixed(2)}
                              </strong>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Position/Signal IDs */}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        {log.positionId && (
                          <span>Position: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{log.positionId}</code></span>
                        )}
                        {log.signalId && (
                          <span>Signal: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{log.signalId}</code></span>
                        )}
                        {log.accountId && (
                          <span>Account: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{log.accountId.substring(0, 8)}...</code></span>
                        )}
                      </div>

                      {/* Error Details */}
                      {log.error && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                          <p className="text-xs text-red-700 dark:text-red-300 font-mono">
                            {log.error}
                          </p>
                        </div>
                      )}

                      {/* Additional Details */}
                      {log.details && log.type !== 'position_tp_sl_changed' && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {logs.filter(l => l.type === 'position_tp_sl_changed').length}
            </div>
            <p className="text-xs text-muted-foreground">TP/SL Changes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {logs.filter(l => l.type === 'position_detected').length}
            </div>
            <p className="text-xs text-muted-foreground">Positions Detected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {logs.filter(l => l.type === 'telegram_sent' || l.type === 'telegram_updated').length}
            </div>
            <p className="text-xs text-muted-foreground">Telegram Success</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {logs.filter(l => l.success === false || l.type === 'error').length}
            </div>
            <p className="text-xs text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete All Logs?</CardTitle>
              <CardDescription>
                This will permanently delete all streaming logs from Firebase.
                This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  ⚠️ You are about to delete {logs.length} log entries
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  This will NOT affect MT5 streaming or trade history
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAllLogs}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete All Logs'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

