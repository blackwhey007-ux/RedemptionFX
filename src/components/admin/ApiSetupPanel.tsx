'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Clock,
  Activity
} from 'lucide-react'

interface ApiConfig {
  enabled: boolean
  accountId: string
  token: string
  lastSync?: string
  status?: 'connected' | 'disconnected' | 'error'
}

interface SyncLog {
  id: string
  syncedAt: string
  tradesImported: number
  tradesUpdated: number
  errors: string[]
  status: 'success' | 'partial' | 'failed'
}

export function ApiSetupPanel() {
  const [config, setConfig] = useState<ApiConfig>({
    enabled: false,
    accountId: '',
    token: '',
    status: 'disconnected'
  })
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfig()
    loadSyncLogs()
  }, [])

  const loadConfig = async () => {
    try {
      // In a real implementation, this would load from Firebase
      // For now, we'll use a placeholder
      setConfig({
        enabled: false,
        accountId: '',
        token: '',
        status: 'disconnected'
      })
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSyncLogs = async () => {
    try {
      // For now, return empty array since API endpoint doesn't exist yet
      // In the future, this will fetch from the actual API
      setSyncLogs([])
    } catch (error) {
      console.error('Error loading sync logs:', error)
      setSyncLogs([])
    }
  }

  const handleSaveConfig = async () => {
    if (!config.accountId || !config.token) {
      alert('Please enter both Account ID and Token')
      return
    }

    try {
      // In a real implementation, this would save to Firebase
      console.log('Saving API config:', config)
      alert('Configuration saved! (Demo mode)')
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Failed to save configuration')
    }
  }

  const handleTestConnection = async () => {
    if (!config.accountId || !config.token) {
      alert('Please enter both Account ID and Token')
      return
    }

    setTesting(true)
    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real implementation, this would test the actual MetaAPI connection
      setConfig(prev => ({ ...prev, status: 'connected' }))
      alert('Connection test successful! (Demo mode)')
    } catch (error) {
      setConfig(prev => ({ ...prev, status: 'error' }))
      alert('Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      // For now, simulate a sync since API endpoint doesn't exist yet
      // In the future, this will call the actual API
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate successful sync
      alert('Sync completed! (Demo mode)\nImported: 0 trades\nUpdated: 0 trades')
      
      // Refresh sync logs
      await loadSyncLogs()
    } catch (error) {
      console.error('Error triggering sync:', error)
      alert('Error triggering sync')
    } finally {
      setSyncing(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'disconnected': return <XCircle className="h-4 w-4 text-gray-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'disconnected': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading API configuration...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            MetaAPI Configuration
          </CardTitle>
          <CardDescription>
            Configure automated sync with your MT5 account via MetaAPI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="api-enabled">Enable API Sync</Label>
              <p className="text-sm text-gray-500">
                Automatically sync trades every 15 minutes
              </p>
            </div>
            <Switch
              id="api-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {/* Account ID */}
          <div className="space-y-2">
            <Label htmlFor="account-id">MetaAPI Account ID</Label>
            <Input
              id="account-id"
              placeholder="Enter your MetaAPI account ID"
              value={config.accountId}
              onChange={(e) => setConfig(prev => ({ ...prev, accountId: e.target.value }))}
              disabled={config.enabled}
            />
            <p className="text-xs text-gray-500">
              Get this from your MetaAPI dashboard
            </p>
          </div>

          {/* API Token */}
          <div className="space-y-2">
            <Label htmlFor="api-token">MetaAPI Token</Label>
            <Input
              id="api-token"
              type="password"
              placeholder="Enter your MetaAPI token"
              value={config.token}
              onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
              disabled={config.enabled}
            />
            <p className="text-xs text-gray-500">
              Keep this secure and never share it
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(config.status || 'disconnected')}
              <span className="font-medium">Connection Status</span>
            </div>
            <Badge className={getStatusColor(config.status || 'disconnected')}>
              {config.status || 'disconnected'}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleTestConnection}
              disabled={!config.accountId || !config.token || testing}
              variant="outline"
              className="flex items-center gap-2"
            >
              {testing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>

            <Button
              onClick={handleSaveConfig}
              disabled={!config.accountId || !config.token}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Save Configuration
            </Button>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  MetaAPI Setup Required
                </p>
                <p className="text-blue-600 dark:text-blue-300 mt-1">
                  To use API sync, you need to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-blue-600 dark:text-blue-300">
                  <li>Sign up for MetaAPI account</li>
                  <li>Add your MT5 account to MetaAPI</li>
                  <li>Get your Account ID and API Token</li>
                  <li>Enter credentials above and test connection</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manual Sync
          </CardTitle>
          <CardDescription>
            Trigger immediate sync of trades from your MT5 account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Sync Last 7 Days</h4>
              <p className="text-sm text-gray-500">
                Import trades from the past week
              </p>
            </div>
            <Button 
              onClick={handleManualSync} 
              disabled={syncing || !config.enabled}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sync History
          </CardTitle>
          <CardDescription>
            Recent automated and manual sync activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {syncLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sync logs available
              </div>
            ) : (
              syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium">
                        {formatTimeAgo(log.syncedAt)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Imported: {log.tradesImported} | Updated: {log.tradesUpdated}
                        {log.errors.length > 0 && ` | Errors: ${log.errors.length}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      API
                    </Badge>
                    {log.errors.length > 0 && (
                      <Button variant="outline" size="sm">
                        View Errors
                      </Button>
                    )}
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
