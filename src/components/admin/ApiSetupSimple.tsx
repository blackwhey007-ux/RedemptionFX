'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardDecorativeOrb } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, RefreshCw, Server } from 'lucide-react'
import { getMT5Settings, saveMT5Settings } from '@/lib/mt5SettingsService'

type StatusState = 'idle' | 'saving' | 'testing' | 'starting' | 'stopping'
type ConnectionState = 'unknown' | 'connected' | 'disconnected' | 'error'

const DEFAULT_REGION = 'https://mt-client-api-v1.london.agiliumtrade.ai'

interface Diagnostics {
  managementApiWorks?: boolean
  tradingApiWorks?: boolean
  accountExists?: boolean
  accountDeployed?: boolean
  accountConnected?: boolean
  regionUrl?: string | null
  errors?: string[]
}

interface TestResponse {
  success: boolean
  isHealthy?: boolean
  diagnostics?: Diagnostics | null
  error?: string
}

function maskToken(token: string): string {
  if (!token) return ''
  if (token.length <= 6) return '*'.repeat(token.length)
  return `${token.slice(0, 3)}***${token.slice(-3)}`
}

function statusBadge(status: ConnectionState) {
  switch (status) {
    case 'connected':
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5" />
          Connected
        </Badge>
      )
    case 'error':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          Error
        </Badge>
      )
    case 'disconnected':
      return (
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-200 flex items-center gap-1">
          <Server className="h-3.5 w-3.5" />
          Not Connected
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Server className="h-3.5 w-3.5" />
          Unknown
        </Badge>
      )
  }
}

export function ApiSetupSimple() {
  const [accountId, setAccountId] = useState('')
  const [token, setToken] = useState('')
  const [regionUrl, setRegionUrl] = useState(DEFAULT_REGION)
  const [status, setStatus] = useState<ConnectionState>('unknown')
  const [statusStep, setStatusStep] = useState<StatusState>('idle')
  const [message, setMessage] = useState('')
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        const saved = await getMT5Settings()
        if (!cancelled && saved) {
          setAccountId(saved.accountId || '')
          setToken(saved.token || '')
          setRegionUrl(saved.regionUrl || DEFAULT_REGION)
          setStatus(saved.status ? (saved.status as ConnectionState) : 'unknown')
        }
      } catch (error) {
        console.error('Error loading MT5 settings', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const canSubmit = useMemo(() => {
    return Boolean(accountId.trim()) && Boolean(token.trim())
  }, [accountId, token])

  const resetFeedback = () => {
    setMessage('')
    setDiagnostics(null)
  }

  const persistSettings = async () => {
    await saveMT5Settings({
      enabled: true,
      accountId: accountId.trim(),
      token: token.trim(),
      regionUrl: regionUrl.trim() || DEFAULT_REGION,
      status: status === 'connected' ? 'connected' : 'disconnected'
    })
  }

  const handleSave = async () => {
    if (!canSubmit) return

    resetFeedback()
    setStatusStep('saving')

    try {
      await persistSettings()
      setMessage('Settings saved. Account and token stored securely.')
      setStatus('disconnected')
    } catch (error) {
      console.error('Failed to save MT5 settings', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setMessage(`Failed to save settings: ${errorMsg}`)
      setStatus('error')
    } finally {
      setStatusStep('idle')
    }
  }

  const performTest = async () => {
    if (!canSubmit) return
    resetFeedback()
    setStatusStep('testing')

    try {
      const response = await fetch('/api/mt5-test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: accountId.trim(),
          token: token.trim(),
          regionUrl: regionUrl.trim() || DEFAULT_REGION
        })
      })

      const data: TestResponse = await response.json()
      const diagnosticErrors = data.diagnostics?.errors?.filter(Boolean) ?? []

      if (!response.ok || !data.success) {
        const errorText = data.error || 'MetaAPI diagnostics failed.'
        const detailedMessage = diagnosticErrors.length
          ? `${errorText} (${diagnosticErrors[0]})`
          : errorText
        setMessage(`${detailedMessage}. See diagnostics below for details.`)
        setStatus('error')
        setDiagnostics(data.diagnostics || null)
        return
      }

      setDiagnostics(data.diagnostics || null)
      if (diagnosticErrors.length) {
        setStatus('error')
        setMessage(`Diagnostics completed with issues: ${diagnosticErrors[0]}. See details below.`)
      } else if (data.isHealthy) {
        setStatus('connected')
        setMessage('Connection healthy. Ready to stream trades.')
      } else {
        setStatus('error')
        setMessage('Diagnostics completed, but connection has issues. See details below.')
      }
    } catch (error) {
      console.error('Test connection error', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setMessage(`Test connection failed: ${errorMsg}`)
      setStatus('error')
    } finally {
      setStatusStep('idle')
    }
  }

  const handleStartStreaming = async () => {
    if (!canSubmit) return

    resetFeedback()
    setStatusStep('starting')

    try {
      await persistSettings()

      const response = await fetch('/api/mt5-streaming/start', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Failed to start streaming.'
        setMessage(errorMsg)
        setStatus('error')
        return
      }
      setStatus('connected')
      setMessage('Streaming started successfully.')
    } catch (error) {
      console.error('Start streaming error', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setMessage(`Failed to start streaming: ${errorMsg}`)
      setStatus('error')
    } finally {
      setStatusStep('idle')
    }
  }

  const handleStopStreaming = async () => {
    resetFeedback()
    setStatusStep('stopping')
    try {
      const response = await fetch('/api/mt5-streaming/stop', {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Failed to stop streaming.'
        setMessage(errorMsg)
        setStatus('error')
        return
      }
      setStatus('disconnected')
      setMessage('Streaming stopped.')
    } catch (error) {
      console.error('Stop streaming error', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setMessage(`Failed to stop streaming: ${errorMsg}`)
      setStatus('error')
    } finally {
      setStatusStep('idle')
    }
  }

  const renderDiagnostics = () => {
    if (!diagnostics) return null

    const issues = diagnostics.errors && diagnostics.errors.length > 0 ? diagnostics.errors : []

    return (
      <div className="space-y-2 rounded-md border border-muted p-3 text-sm">
        <div className="font-medium">Diagnostics</div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <StatusLine label="Token" ok={diagnostics.managementApiWorks} />
          <StatusLine label="Account" ok={diagnostics.accountExists} />
          <StatusLine label="Deployed" ok={diagnostics.accountDeployed} />
          <StatusLine label="Connected" ok={diagnostics.accountConnected} />
          <StatusLine label="Trading API" ok={diagnostics.tradingApiWorks} />
          <div>
            <span className="font-medium">Region:</span>{' '}
            <span>{diagnostics.regionUrl || 'Not detected'}</span>
          </div>
        </div>
        {issues.length > 0 && (
          <div className="rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-200">
            <div className="font-medium">Errors</div>
            <ul className="list-disc list-inside">
              {issues.slice(0, 3).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Loading MetaAPI settings...
      </div>
    )
  }

  return (
    <Card variant="glass">
      <CardDecorativeOrb color="phoenix" />
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>MetaAPI Setup</span>
          {statusBadge(status)}
        </CardTitle>
        <CardDescription>Enter your MetaAPI credentials and manage the streaming connection.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="metaapi-account">MetaAPI Account ID</Label>
          <Input
            id="metaapi-account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            placeholder="e.g. 36a92028-5ec7-4dc6-8a50-09fea74a93db"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="metaapi-token">MetaAPI Token</Label>
          <Input
            id="metaapi-token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste your MetaAPI token"
          />
          {token && (
            <p className="text-xs text-muted-foreground">
              Stored securely. Current token preview: <span className="font-mono">{maskToken(token)}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="metaapi-region">Region URL (optional)</Label>
          <Input
            id="metaapi-region"
            value={regionUrl}
            onChange={(event) => setRegionUrl(event.target.value)}
            placeholder={DEFAULT_REGION}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the London region. Provide the MetaAPI trading endpoint if your account uses another region.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSave}
            disabled={!canSubmit || statusStep === 'saving'}
            variant="premium"
            className="flex items-center gap-2"
          >
            {statusStep === 'saving' && <RefreshCw className="h-4 w-4 animate-spin" />}
            Save
          </Button>
          <Button
            onClick={performTest}
            disabled={!canSubmit || statusStep === 'testing'}
            variant="premiumOutline"
            className="flex items-center gap-2"
          >
            {statusStep === 'testing' && <RefreshCw className="h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={handleStartStreaming}
            disabled={!canSubmit || statusStep === 'starting'}
            variant="default"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {statusStep === 'starting' && <RefreshCw className="h-4 w-4 animate-spin" />}
            Start Streaming
          </Button>
          <Button
            onClick={handleStopStreaming}
            disabled={statusStep === 'stopping'}
            variant="outline"
            className="flex items-center gap-2"
          >
            {statusStep === 'stopping' && <RefreshCw className="h-4 w-4 animate-spin" />}
            Stop Streaming
          </Button>
        </div>

        {message && (
          <div className="rounded-md border border-muted/50 bg-muted/20 p-3 text-sm">
            {message}
          </div>
        )}

        {renderDiagnostics()}

        <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
          <div className="font-medium">MetaAPI Reminder</div>
          Connect your MT5 account in the MetaAPI dashboard, deploy it, then use the account ID and token here.
        </div>
      </CardContent>
    </Card>
  )
}

function StatusLine({ label, ok }: { label: string; ok?: boolean }) {
  if (ok === undefined) {
    return (
      <div>
        <span className="font-medium">{label}:</span> Unknown
      </div>
    )
  }
  return (
    <div>
      <span className="font-medium">{label}:</span> {ok ? '✅' : '❌'}
    </div>
  )
}

