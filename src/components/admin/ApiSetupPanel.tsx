'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardDecorativeOrb } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { StatsCard } from '@/components/ui/stats-card'
import { getMT5Settings, saveMT5Settings } from '@/lib/mt5SettingsService'
import { 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Clock,
  Activity,
  FileText,
  ExternalLink,
  Send,
  Server
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ApiConfig {
  enabled: boolean
  accountId: string
  token: string
  regionUrl?: string
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
  const router = useRouter()
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
      const savedSettings = await getMT5Settings()
      
      if (savedSettings) {
        setConfig({
          enabled: savedSettings.enabled || false,
          accountId: savedSettings.accountId || '',
          token: savedSettings.token || '',
          regionUrl: savedSettings.regionUrl || '', // London will be auto-set on save
          status: savedSettings.status || 'disconnected',
          lastSync: savedSettings.lastSync?.toISOString()
        })
      } else {
        // No saved settings, use defaults
        setConfig({
          enabled: false,
          accountId: '',
          token: '',
          status: 'disconnected'
        })
      }
    } catch (error) {
      console.error('Error loading config:', error)
      setConfig({
        enabled: false,
        accountId: '',
        token: '',
        status: 'disconnected'
      })
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
      // London region URL will be auto-set by saveMT5Settings if not provided
      await saveMT5Settings({
        enabled: config.enabled,
        accountId: config.accountId,
        token: config.token,
        regionUrl: config.regionUrl || undefined, // Let service auto-set London
        status: config.status || 'disconnected',
        lastSync: config.lastSync ? new Date(config.lastSync) : undefined
      })
      
      alert('Configuration saved successfully!')
      console.log('MT5 settings saved to Firestore')
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Failed to save configuration: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleTestConnection = async () => {
    if (!config.accountId || !config.token) {
      alert('Please enter both Account ID and Token')
      return
    }

    setTesting(true)
    try {
      // Save the config first so the API can read it
      await saveMT5Settings({
        enabled: config.enabled,
        accountId: config.accountId,
        token: config.token,
        regionUrl: config.regionUrl,
        status: 'disconnected'
      })
      
      // Call the real diagnostic endpoint
      const response = await fetch('/api/mt5-test-connection')
      const data = await response.json()
      
      if (data.success && data.isHealthy) {
        setConfig(prev => ({ ...prev, status: 'connected' }))
        alert('✅ Connection test successful!\n\nAll systems operational.')
      } else {
        setConfig(prev => ({ ...prev, status: 'error' }))
        
        // Build detailed error message
        let errorMsg = '❌ Connection test failed!\n\n'
        if (data.diagnostics) {
          const diag = data.diagnostics
          errorMsg += `Token Valid: ${diag.managementApiWorks ? '✅' : '❌'}\n`
          errorMsg += `Account Exists: ${diag.accountExists ? '✅' : '❌'}\n`
          errorMsg += `Account Deployed: ${diag.accountDeployed ? '✅' : '❌'}\n`
          errorMsg += `Account Connected: ${diag.accountConnected ? '✅' : '❌'}\n`
          errorMsg += `Trading API: ${diag.tradingApiWorks ? '✅' : '❌'}\n`
          
          if (diag.regionUrl) {
            errorMsg += `\nRegion URL: ${diag.regionUrl}`
          }
          
          if (diag.errors && diag.errors.length > 0) {
            errorMsg += `\n\nErrors:\n${diag.errors.slice(0, 3).join('\n')}`
          }
        } else {
          errorMsg += data.error || 'Unknown error'
        }
        
        alert(errorMsg)
      }
    } catch (error) {
      setConfig(prev => ({ ...prev, status: 'error' }))
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      alert(`Connection test failed: ${errorMsg}`)
    } finally {
      setTesting(false)
    }
  }


  const handleManualSync = async () => {
    if (!config.accountId || !config.token) {
      alert('Please enter both Account ID and Token')
      return
    }

    console.log('🔄 Starting manual signal sync...')
    console.log('Account ID:', config.accountId)
    console.log('Token:', config.token ? '***' + config.token.slice(-4) : 'Missing')
    
    setSyncing(true)
    try {
      console.log('📡 Calling /api/admin/mt5-signals-sync...')
      const response = await fetch('/api/admin/mt5-signals-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log('📥 Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`
        try {
          const errorData = await response.json()
          console.error('❌ Error response data:', errorData)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          console.error('❌ Failed to parse error JSON:', parseError)
          // If JSON parse fails, try to get text
          try {
            const text = await response.text()
            console.error('❌ Error response text:', text)
            errorMessage = text || errorMessage
          } catch {
            // Keep default error message
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('✅ Sync response received:', data)
      
      if (data.success) {
        // Show detailed success message
        const totalSignals = (data.signalsCreated || 0) + (data.signalsUpdated || 0)
        let successMessage = `Sync completed!\n\nSignals Created: ${data.signalsCreated || 0}\nSignals Updated: ${data.signalsUpdated || 0}\nSignals Closed: ${data.signalsClosed || 0}\nTotal Processed: ${totalSignals + (data.signalsClosed || 0)}`
        
        if (data.message) {
          successMessage += `\n\n${data.message}`
        }
        
        if (data.errors && data.errors.length > 0) {
          successMessage += `\n\nWarnings: ${data.errors.join('\n')}`
        }
        
        console.log('✅ Sync successful:', {
          created: data.signalsCreated,
          updated: data.signalsUpdated,
          closed: data.signalsClosed,
          errors: data.errors?.length || 0
        })
        
        // Check if Telegram messages were sent
        if (data.signalsCreated > 0) {
          console.log('📱 Check your Telegram channel for new signal messages')
        }
        
        alert(successMessage)
        setConfig(prev => ({ ...prev, lastSync: new Date().toISOString(), status: 'connected' }))
        // Refresh config to get updated settings
        await loadConfig()
      } else {
        // Show detailed error message
        let errorMsg = data.error || data.message || 'Unknown error'
        
        // Append errors array if present
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          errorMsg += '\n\nDetails:\n' + data.errors.join('\n')
        }
        
        console.error('❌ Sync failed:', errorMsg)
        console.error('Full error data:', data)
        
        alert(`Sync failed:\n\n${errorMsg}`)
        setConfig(prev => ({ ...prev, status: 'error' }))
      }
      
      // Refresh sync logs
      await loadSyncLogs()
    } catch (error) {
      console.error('❌ Error triggering sync:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Show user-friendly error message with helpful troubleshooting
      let userMessage = errorMessage
      
      if (errorMessage.includes('disabled')) {
        userMessage = 'MT5 sync is disabled. Please enable "Enable API Sync" toggle and save, then try again.'
      } else if (errorMessage.includes('window is not defined')) {
        userMessage = 'Server error: Please restart the development server and try again.'
      } else if (errorMessage.includes('404') || errorMessage.includes('Not found')) {
        userMessage = `Account not found. Please verify:\n1. Account ID is correct: ${config.accountId}\n2. Account exists in MetaAPI dashboard\n3. Account is deployed in MetaAPI\n4. Token has access to this account\n\nOriginal error: ${errorMessage}`
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userMessage = `Authentication failed. Please verify:\n1. Token is valid and not expired\n2. Token has required permissions\n3. Token matches the account ID\n\nOriginal error: ${errorMessage}`
      } else if (errorMessage.includes('Failed to get positions')) {
        userMessage = `Could not retrieve positions. Please check:\n1. Account is deployed in MetaAPI dashboard\n2. Account is connected\n3. You have open positions in MT5\n4. Token has trading-account-management-api permissions\n\nOriginal error: ${errorMessage}`
      }
      
      console.error('❌ Final error message for user:', userMessage)
      alert(`Error triggering sync: ${userMessage}`)
      setConfig(prev => ({ ...prev, status: 'error' }))
    } finally {
      setSyncing(false)
      console.log('✅ Sync process completed')
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

  // Count signals from sync logs (approximate)
  const totalSignalsToday = syncLogs.reduce((sum, log) => sum + log.tradesImported + log.tradesUpdated, 0)
  
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            MT5 API Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure MetaAPI settings for automated trading signal sync
          </p>
        </div>
        
        <StatusIndicator 
          status={config.status === 'connected' ? 'active' : 'inactive'} 
          label={config.status === 'connected' ? 'Connected' : 'Not Connected'}
        />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="API Status"
          value={config.status === 'connected' ? "Connected" : "Not Configured"}
          trend={config.accountId ? `Account: ${config.accountId.substring(0, 8)}...` : 'No account configured'}
          icon={Server}
          decorativeColor={config.status === 'connected' ? "green" : "phoenix"}
        />
        <StatsCard
          title="Signals Today"
          value={totalSignalsToday}
          trend="From manual sync"
          icon={Activity}
          decorativeColor="gold"
        />
      </div>

      {/* API Configuration */}
      <Card variant="glass">
        <CardDecorativeOrb color="phoenix" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            MetaAPI Configuration
          </CardTitle>
          <CardDescription>
            Configure automated sync with your MT5 account via MetaAPI
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
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

          {/* Info about London default */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Region:</strong> Using London endpoint by default (<code className="text-xs">https://mt-client-api-v1.london.agiliumtrade.ai</code>). This matches your account configuration.
              </p>
            </div>
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
              variant="premiumOutline"
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
              variant="premium"
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
                  <li>Add your MT5 account to MetaAPI (choose London region)</li>
                  <li>Get your Account ID and API Token</li>
                  <li>Enter credentials above and save configuration</li>
                </ul>
                <p className="text-blue-600 dark:text-blue-300 mt-2">
                  <strong>Note:</strong> London region endpoint is used by default and will be automatically set when you save your configuration.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Streaming - Redirects to Admin Dashboard */}
      <Card variant="glass" className="border-blue-200 dark:border-blue-800">
        <CardDecorativeOrb color="blue" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Real-Time Streaming
          </CardTitle>
          <CardDescription>
            Manage streaming from the Admin Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Streaming Controls Moved to Admin Dashboard
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  To prevent conflicts and ensure professional operation, all streaming controls have been centralized in one location.
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    <strong>✅ Configure here:</strong> MT5 API settings (Account ID, Token, Region)
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    <strong>🚀 Start streaming:</strong> Admin Dashboard → Open Trades Panel
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="default"
            onClick={() => router.push('/dashboard/admin')}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Activity className="h-4 w-4" />
            Go to Admin Dashboard (Streaming Controls)
            <ExternalLink className="h-4 w-4" />
          </Button>

          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <p className="text-xs text-green-700 dark:text-green-300">
                <strong>Benefits:</strong> Single control point prevents duplicate connections, state conflicts, and connection issues. Professional reconnection handling with exponential backoff ensures 95%+ uptime.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Sync */}
      <Card variant="glass">
        <CardDecorativeOrb color="gold" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manual Sync (Fallback)
          </CardTitle>
          <CardDescription>
            Trigger immediate sync of trades from your MT5 account
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Sync Signals from Open Positions</h4>
              <p className="text-sm text-gray-500">
                Create signals from your current MT5 open positions and send to Telegram
              </p>
            </div>
            <Button 
              onClick={handleManualSync} 
              disabled={syncing || !config.accountId || !config.token}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing Signals...' : 'Sync Signals Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card variant="glass">
        <CardDecorativeOrb color="blue" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sync History
          </CardTitle>
          <CardDescription>
            Recent automated and manual sync activities
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
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
