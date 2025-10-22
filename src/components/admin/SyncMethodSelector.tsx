'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Upload, 
  Activity,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'

interface SyncMethod {
  id: 'manual' | 'api'
  name: string
  description: string
  icon: any
  status: 'active' | 'inactive' | 'error'
  lastSync?: string
  nextSync?: string
}

interface SyncMethodSelectorProps {
  currentMethod: 'manual' | 'api'
  onMethodChange: (method: 'manual' | 'api') => void
  manualStats?: {
    lastUpload: string
    totalImports: number
  }
  apiStats?: {
    lastSync: string
    nextSync: string
    status: 'connected' | 'disconnected' | 'error'
  }
}

export function SyncMethodSelector({ 
  currentMethod, 
  onMethodChange, 
  manualStats,
  apiStats 
}: SyncMethodSelectorProps) {
  const [switching, setSwitching] = useState(false)

  const methods: SyncMethod[] = [
    {
      id: 'manual',
      name: 'Manual CSV Import',
      description: 'Upload CSV files from MT5 exports',
      icon: Upload,
      status: 'active',
      lastSync: manualStats?.lastUpload
    },
    {
      id: 'api',
      name: 'MetaAPI Integration',
      description: 'Automated sync via MetaAPI',
      icon: Activity,
      status: apiStats?.status === 'connected' ? 'active' : 'inactive',
      lastSync: apiStats?.lastSync,
      nextSync: apiStats?.nextSync
    }
  ]

  const handleMethodChange = async (method: 'manual' | 'api') => {
    if (method === currentMethod) return

    setSwitching(true)
    try {
      // In a real implementation, this would save the method to Firebase
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      onMethodChange(method)
    } catch (error) {
      console.error('Error switching method:', error)
      alert('Failed to switch sync method')
    } finally {
      setSwitching(false)
    }
  }

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never'
    
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
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'inactive': return <AlertCircle className="h-4 w-4 text-gray-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Sync Method
        </CardTitle>
        <CardDescription>
          Choose how to sync VIP trading results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {methods.map((method) => {
            const isActive = method.id === currentMethod
            const Icon = method.icon

            return (
              <div
                key={method.id}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => !switching && handleMethodChange(method.id)}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-blue-500 text-white">
                      Active
                    </Badge>
                  </div>
                )}

                {/* Method info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    <div>
                      <h3 className="font-medium">{method.name}</h3>
                      <p className="text-sm text-gray-500">{method.description}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {getStatusIcon(method.status)}
                    <span className="text-sm font-medium">Status:</span>
                    <Badge className={getStatusColor(method.status)}>
                      {method.status}
                    </Badge>
                  </div>

                  {/* Last sync */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Last sync: {formatTimeAgo(method.lastSync)}</span>
                  </div>

                  {/* Next sync (API only) */}
                  {method.id === 'api' && method.nextSync && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Activity className="h-4 w-4" />
                      <span>Next sync: {formatTimeAgo(method.nextSync)}</span>
                    </div>
                  )}

                  {/* Switch button */}
                  {!isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={switching}
                    >
                      {switching ? 'Switching...' : `Switch to ${method.name}`}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium">Method Comparison:</p>
              <ul className="mt-1 space-y-1">
                <li>• <strong>Manual CSV:</strong> Free, upload weekly/monthly</li>
                <li>• <strong>MetaAPI:</strong> Paid (~$3-5/month), automatic every 15 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


