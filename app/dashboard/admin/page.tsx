'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CsvImportPanel } from '@/components/admin/CsvImportPanel'
import { SyncMethodSelector } from '@/components/admin/SyncMethodSelector'
import { 
  RefreshCw, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  TrendingUp,
  Database,
  Upload,
  Settings
} from 'lucide-react'

interface SyncLog {
  id: string
  syncedAt: string
  tradesImported: number
  tradesUpdated: number
  errors: string[]
  status: 'success' | 'partial' | 'failed'
}

export default function AdminPage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncMethod, setSyncMethod] = useState<'manual' | 'api'>('manual')

  const fetchSyncLogs = async () => {
    try {
      const response = await fetch('/api/admin/mt5-sync')
      const data = await response.json()
      
      if (data.success) {
        setSyncLogs(data.syncLogs)
      }
    } catch (error) {
      console.error('Error fetching sync logs:', error)
    }
  }

  const triggerSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/admin/mt5-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          endDate: new Date().toISOString()
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh sync logs
        await fetchSyncLogs()
        alert(`Sync completed successfully!\nImported: ${data.summary.tradesImported}\nUpdated: ${data.summary.tradesUpdated}`)
      } else {
        alert(`Sync failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error triggering sync:', error)
      alert('Error triggering sync')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchSyncLogs()
      setLoading(false)
    }
    
    loadData()
  }, [])

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
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading admin panel...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground mt-2">
          Manage VIP MT5 integration and platform settings
        </p>
      </div>

      <Tabs defaultValue="vip-sync" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vip-sync">VIP Sync</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="vip-sync" className="space-y-6">
          {/* Sync Method Selector */}
          <SyncMethodSelector
            currentMethod={syncMethod}
            onMethodChange={setSyncMethod}
            manualStats={{
              lastUpload: '2024-01-15T10:30:00Z',
              totalImports: 5
            }}
            apiStats={{
              lastSync: '2024-01-15T10:30:00Z',
              nextSync: '2024-01-15T10:45:00Z',
              status: 'disconnected'
            }}
          />

          {/* Manual CSV Import */}
          {syncMethod === 'manual' && <CsvImportPanel />}

          {/* API Setup */}
          {syncMethod === 'api' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>MetaAPI Setup Moved</CardTitle>
                <CardDescription>
                  Configure MetaAPI credentials and streaming from the dedicated setup page.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground max-w-2xl">
                  We now manage MetaAPI tokens, account IDs, and streaming controls on a focused page to keep VIP Sync clean.
                </p>
                <Button asChild variant="premium">
                  <Link href="/dashboard/admin/metaapi-setup">Open MetaAPI Setup</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Platform Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Firebase</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Connected
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">MT5 API</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Auto Sync</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Enabled
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    Last sync: {syncLogs[0] ? formatTimeAgo(syncLogs[0].syncedAt) : 'Never'}
                  </div>
                  <div className="text-sm">
                    Total syncs: {syncLogs.length}
                  </div>
                  <div className="text-sm">
                    Success rate: {syncLogs.length > 0 ? 
                      Math.round((syncLogs.filter(log => log.status === 'success').length / syncLogs.length) * 100) : 0}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href = '/dashboard/vip-results'}>
                  View VIP Results
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href = '/dashboard/admin/vip-sync'}>
                  VIP Sync & Content Management
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href = '/dashboard/admin/telegram-settings'}>
                  Telegram Settings
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  Export Data
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  System Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
