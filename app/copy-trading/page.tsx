'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { AlertCircle, CheckCircle, Copy, Loader2, TrendingUp, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react'

interface Strategy {
  id: string
  name: string
  description?: string
  accountId: string
  isPrimary?: boolean
  symbolMapping?: Array<{ from: string; to: string }>
}

interface UserCopyTradingAccount {
  accountId: string
  strategyId: string
  strategyName: string
  riskMultiplier: number
  status: 'active' | 'inactive' | 'error'
  broker: string
  server: string
  login: string
  platform: 'mt4' | 'mt5'
  createdAt: string | Date
  updatedAt: string | Date
  lastError?: string
  label?: string
  isLegacy?: boolean
  reverseTrading?: boolean
  symbolMapping?: Record<string, string>
  maxRiskPercent?: number
  // Automation fields
  autoRebalancingEnabled?: boolean
  originalRiskMultiplier?: number
  rebalancingRules?: {
    minMultiplier: number
    maxMultiplier: number
    adjustmentStep: number
  }
  lastRebalancedAt?: string | Date
  autoPauseEnabled?: boolean
  maxDrawdownPercent?: number
  autoPausedAt?: string | Date
  autoPauseReason?: string
  autoResumeEnabled?: boolean
  resumeDrawdownPercent?: number
  autoDisconnectEnabled?: boolean
  maxConsecutiveErrors?: number
  errorWindowMinutes?: number
  consecutiveErrorCount?: number
  lastErrorAt?: string | Date
  autoDisconnectedAt?: string | Date
  autoDisconnectReason?: string
  tradeAlertsEnabled?: boolean
  alertTypes?: string[]
  minTradeSizeForAlert?: number
  minProfitForAlert?: number
  minLossForAlert?: number
  dailySummaryTime?: string
}

const formatDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export default function CopyTradingPage() {
  const { user } = useAuth()

  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingStrategies, setLoadingStrategies] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<UserCopyTradingAccount[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [defaultSymbolMappingText, setDefaultSymbolMappingText] = useState('')
  const [useCustomSymbolMapping, setUseCustomSymbolMapping] = useState(false)
  const [expandedAutomation, setExpandedAutomation] = useState<Record<string, boolean>>({})
  const [updatingAutomation, setUpdatingAutomation] = useState<Record<string, boolean>>({})
  const [testingAlert, setTestingAlert] = useState<Record<string, boolean>>({})
  const [testAlertResult, setTestAlertResult] = useState<Record<string, { success: boolean; message: string }>>({})

  const formatSymbolMappingText = (mapping?: Array<{ from: string; to: string }>): string => {
    if (!mapping || mapping.length === 0) return ''
    return JSON.stringify(mapping, null, 2)
  }

  const [formData, setFormData] = useState({
    broker: '',
    server: '',
    login: '',
    password: '',
    platform: 'mt5' as 'mt4' | 'mt5',
    riskMultiplier: 1,
    strategyId: '',
    label: '',
    reverseTrading: false,
    symbolMapping: '',
    maxRiskPercent: ''
  })

  useEffect(() => {
    if (user) {
      void loadAccounts()
      void loadStrategies()
    }
  }, [user])

  useEffect(() => {
    const selected = strategies.find((strategy) => strategy.id === formData.strategyId)
    setDefaultSymbolMappingText(formatSymbolMappingText(selected?.symbolMapping))
  }, [strategies, formData.strategyId])

  const authHeaders = useMemo(() => {
    return {
      'x-user-id': user?.uid || '',
      'x-user-email': user?.email || ''
    }
  }, [user?.uid, user?.email])

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response = await fetch('/api/copyfactory/accounts', {
        headers: authHeaders
      })
      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to load copy trading accounts')
        setAccounts([])
        return
      }

      const parsed: UserCopyTradingAccount[] = (data.accounts || []).map(
        (account: UserCopyTradingAccount & { symbolMapping?: any }) => {
          let symbolMapping: Record<string, string> | undefined
          if (account.symbolMapping) {
            if (typeof account.symbolMapping === 'string') {
              try {
                const parsedMapping = JSON.parse(account.symbolMapping)
                if (parsedMapping && typeof parsedMapping === 'object') {
                  symbolMapping = parsedMapping
                }
              } catch (error) {
                console.warn('Failed to parse symbol mapping from API', error)
              }
            } else {
              symbolMapping = account.symbolMapping
            }
          }

          return {
            ...account,
            symbolMapping,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt
          }
        }
      )
      setAccounts(parsed)
    } catch (error) {
      console.error('Error loading accounts:', error)
      setError('Unable to load copy trading accounts at this time.')
    } finally {
      setLoadingAccounts(false)
    }
  }

  const loadStrategies = async () => {
    try {
      setLoadingStrategies(true)
      const response = await fetch('/api/copyfactory/strategies', {
        headers: authHeaders
      })
      const data = await response.json()

      if (data.success) {
        const mappedStrategies: Strategy[] = (data.strategies || []).map((strategy: any) => {
          let symbolMapping: Array<{ from: string; to: string }> | undefined
          if (Array.isArray(strategy.symbolMapping)) {
            const pairs = strategy.symbolMapping
              .map((pair: any) => {
                const from = typeof pair?.from === 'string' ? pair.from.trim() : ''
                const to = typeof pair?.to === 'string' ? pair.to.trim() : ''
                if (!from || !to) return null
                return { from, to }
              })
              .filter((pair): pair is { from: string; to: string } => pair !== null)
            if (pairs.length > 0) {
              symbolMapping = pairs
            }
          }

          return {
            id: strategy.id,
            name: strategy.name,
            description: strategy.description,
            accountId: strategy.accountId,
            isPrimary: strategy.isPrimary,
            symbolMapping
          }
        })
        setStrategies(mappedStrategies)
      } else {
        setError(data.error || 'Failed to load strategies')
      }
    } catch (error) {
      console.error('Error loading strategies:', error)
      setError('Unable to load strategies.')
    } finally {
      setLoadingStrategies(false)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setConnecting(true)

    try {
      const payload: Record<string, any> = {
        broker: formData.broker,
        server: formData.server,
        login: formData.login,
        password: formData.password,
        platform: formData.platform,
        riskMultiplier: formData.riskMultiplier,
        strategyId: formData.strategyId,
        label: formData.label.trim() || undefined,
        reverseTrading: formData.reverseTrading
      }

      const trimmedMapping = formData.symbolMapping.trim()
      if (trimmedMapping.length > 0) {
        payload.symbolMapping = trimmedMapping
      }

      const trimmedRisk = formData.maxRiskPercent.trim()
      if (trimmedRisk.length > 0) {
        const parsedRisk = parseFloat(trimmedRisk)
        if (!Number.isNaN(parsedRisk)) {
          payload.maxRiskPercent = parsedRisk
        }
      }

      const response = await fetch('/api/copyfactory/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Successfully connected to copy trading!')
        await loadAccounts()
        setUseCustomSymbolMapping(false)

        setFormData({
          broker: '',
          server: '',
          login: '',
          password: '',
          platform: 'mt5',
          riskMultiplier: 1,
          strategyId: '',
          label: '',
          reverseTrading: false,
          symbolMapping: '',
          maxRiskPercent: ''
        })
      } else {
        setError(data.error || 'Failed to connect')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Network error')
    } finally {
      setConnecting(false)
    }
  }

  const handleUpdateAutomation = async (
    accountId: string,
    updates: Partial<UserCopyTradingAccount>
  ) => {
    setUpdatingAutomation((prev) => ({ ...prev, [accountId]: true }))
    setError(null)

    try {
      const response = await fetch(`/api/copyfactory/accounts/${accountId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        },
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Automation settings updated successfully')
        await loadAccounts()
      } else {
        setError(data.error || 'Failed to update automation settings')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Network error')
    } finally {
      setUpdatingAutomation((prev) => ({ ...prev, [accountId]: false }))
    }
  }

  const handleTestAlert = async (accountId: string) => {
    setTestingAlert((prev) => ({ ...prev, [accountId]: true }))
    setTestAlertResult((prev) => ({ ...prev, [accountId]: { success: false, message: '' } }))
    setError(null)

    try {
      const response = await fetch(`/api/copyfactory/accounts/${accountId}/test-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      const data = await response.json()

      if (data.success) {
        setTestAlertResult((prev) => ({
          ...prev,
          [accountId]: { success: true, message: 'Test alert sent successfully! Check your notifications and Telegram.' }
        }))
        setSuccess('Test alert sent successfully')
      } else {
        setTestAlertResult((prev) => ({
          ...prev,
          [accountId]: { success: false, message: data.error || 'Failed to send test alert' }
        }))
        setError(data.error || 'Failed to send test alert')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      setTestAlertResult((prev) => ({
        ...prev,
        [accountId]: { success: false, message: errorMessage }
      }))
      setError(errorMessage)
    } finally {
      setTestingAlert((prev) => ({ ...prev, [accountId]: false }))
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (
      !confirm(
        'Are you sure you want to disconnect this copy trading account? This will stop copying trades for this account.'
      )
    ) {
      return
    }

    setError(null)
    setSuccess(null)
    setDisconnectingAccountId(accountId)

    try {
      const response = await fetch(`/api/copyfactory/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Successfully disconnected copy trading account')
        await loadAccounts()
      } else {
        setError(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Network error')
    } finally {
      setDisconnectingAccountId(null)
    }
  }

  const primaryStrategy = useMemo(
    () => strategies.find((strategy) => strategy.isPrimary) || strategies[0],
    [strategies]
  )

  const canSubmit = formData.strategyId.trim().length > 0

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>Please sign in to access copy trading features.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loadingAccounts && strategies.length === 0 && loadingStrategies) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading copy trading data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Copy className="h-8 w-8" />
          Copy Trading
        </h1>
        <p className="text-muted-foreground mt-2">
          Automatically copy trades from professional traders to your MetaTrader account
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your Copy Trading Accounts</CardTitle>
            <CardDescription>
              Manage MetaTrader accounts that are copying your selected strategies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAccounts ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="rounded border border-dashed p-6 text-center text-muted-foreground">
                No accounts connected yet. Use the form to connect your first copy trading account.
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <Card key={account.accountId} className="border border-muted">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span className="flex items-center gap-2">
                          {account.label ? account.label : `Account ${account.accountId.slice(-6)}`}
                          {account.isLegacy && (
                            <Badge variant="outline" className="text-xs">
                              Legacy
                            </Badge>
                          )}
                        </span>
                        <Badge
                          className={
                            account.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : account.status === 'error'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }
                        >
                          {account.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="space-y-1">
                        <span className="block font-medium text-foreground">
                          {account.strategyName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Strategy ID: {account.strategyId}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">Broker</Label>
                          <p className="font-medium">{account.broker}</p>
                        </div>
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">Server</Label>
                          <p className="font-medium">{account.server}</p>
                        </div>
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">Login</Label>
                          <p className="font-medium">{account.login}</p>
                        </div>
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">Platform</Label>
                          <p className="font-medium uppercase">{account.platform}</p>
                        </div>
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">
                            Risk Multiplier
                          </Label>
                          <p className="font-medium">{account.riskMultiplier}x</p>
                        </div>
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">
                            Connected At
                          </Label>
                          <p className="font-medium">{formatDate(account.createdAt)}</p>
                        </div>
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">
                            Reverse Copy
                          </Label>
                          <p className="font-medium">
                            {account.reverseTrading ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">
                            Max Risk %
                          </Label>
                          <p className="font-medium">
                            {typeof account.maxRiskPercent === 'number'
                              ? `${(account.maxRiskPercent * 100).toFixed(2)}%`
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {account.symbolMapping && (
                        <div className="rounded bg-muted/40 p-3 text-xs font-mono">
                          <Label className="text-xs uppercase text-muted-foreground">
                            Symbol Mapping
                          </Label>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {JSON.stringify(account.symbolMapping, null, 2)}
                          </pre>
                        </div>
                      )}

                      {account.lastError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Last Error</AlertTitle>
                          <AlertDescription>{account.lastError}</AlertDescription>
                        </Alert>
                      )}

                      {/* Automation Status */}
                      {(account.autoPausedAt || account.autoDisconnectedAt) && (
                        <Alert
                          variant={account.autoDisconnectedAt ? 'destructive' : 'default'}
                          className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950"
                        >
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Automation Status</AlertTitle>
                          <AlertDescription>
                            {account.autoPausedAt && (
                              <div>
                                <strong>Auto-paused:</strong> {account.autoPauseReason || 'Drawdown threshold exceeded'}
                                {account.autoResumeEnabled && (
                                  <span className="ml-2 text-xs">
                                    (Will auto-resume when drawdown &lt; {account.resumeDrawdownPercent || 15}%)
                                  </span>
                                )}
                              </div>
                            )}
                            {account.autoDisconnectedAt && (
                              <div>
                                <strong>Auto-disconnected:</strong> {account.autoDisconnectReason || 'Persistent errors'}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Automation Settings */}
                      <div className="rounded-lg border border-muted bg-muted/20">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAutomation((prev) => ({
                              ...prev,
                              [account.accountId]: !prev[account.accountId]
                            }))
                          }
                          className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <span className="font-medium">Automation Settings</span>
                          </div>
                          {expandedAutomation[account.accountId] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>

                        {expandedAutomation[account.accountId] && (
                          <div className="space-y-4 border-t border-muted p-4">
                            {/* Auto-Rebalancing */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Auto-Rebalancing</Label>
                                <Switch
                                  checked={account.autoRebalancingEnabled || false}
                                  onCheckedChange={(checked) => {
                                    const updates: Partial<UserCopyTradingAccount> = {
                                      autoRebalancingEnabled: checked,
                                      originalRiskMultiplier: checked
                                        ? account.originalRiskMultiplier || account.riskMultiplier
                                        : undefined,
                                      rebalancingRules: checked
                                        ? account.rebalancingRules || {
                                            minMultiplier: 0.1,
                                            maxMultiplier: 10,
                                            adjustmentStep: 0.1
                                          }
                                        : undefined
                                    }
                                    void handleUpdateAutomation(account.accountId, updates)
                                  }}
                                  disabled={updatingAutomation[account.accountId]}
                                />
                              </div>
                              {account.autoRebalancingEnabled && (
                                <div className="ml-6 space-y-2 text-xs text-muted-foreground">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-xs">Min Multiplier</Label>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        max="10"
                                        value={
                                          account.rebalancingRules?.minMultiplier || 0.1
                                        }
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value) || 0.1
                                          void handleUpdateAutomation(account.accountId, {
                                            rebalancingRules: {
                                              minMultiplier: value,
                                              maxMultiplier:
                                                account.rebalancingRules?.maxMultiplier || 10,
                                              adjustmentStep:
                                                account.rebalancingRules?.adjustmentStep || 0.1
                                            }
                                          })
                                        }}
                                        className="h-8 text-xs"
                                        disabled={updatingAutomation[account.accountId]}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Max Multiplier</Label>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        max="10"
                                        value={
                                          account.rebalancingRules?.maxMultiplier || 10
                                        }
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value) || 10
                                          void handleUpdateAutomation(account.accountId, {
                                            rebalancingRules: {
                                              minMultiplier:
                                                account.rebalancingRules?.minMultiplier || 0.1,
                                              maxMultiplier: value,
                                              adjustmentStep:
                                                account.rebalancingRules?.adjustmentStep || 0.1
                                            }
                                          })
                                        }}
                                        className="h-8 text-xs"
                                        disabled={updatingAutomation[account.accountId]}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Step</Label>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={
                                          account.rebalancingRules?.adjustmentStep || 0.1
                                        }
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value) || 0.1
                                          void handleUpdateAutomation(account.accountId, {
                                            rebalancingRules: {
                                              minMultiplier:
                                                account.rebalancingRules?.minMultiplier || 0.1,
                                              maxMultiplier:
                                                account.rebalancingRules?.maxMultiplier || 10,
                                              adjustmentStep: value
                                            }
                                          })
                                        }}
                                        className="h-8 text-xs"
                                        disabled={updatingAutomation[account.accountId]}
                                      />
                                    </div>
                                  </div>
                                  {account.lastRebalancedAt && (
                                    <p className="text-xs">
                                      Last rebalanced: {formatDate(account.lastRebalancedAt)}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Auto-Pause */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Auto-Pause (Drawdown Protection)</Label>
                                <Switch
                                  checked={account.autoPauseEnabled || false}
                                  onCheckedChange={(checked) => {
                                    void handleUpdateAutomation(account.accountId, {
                                      autoPauseEnabled: checked,
                                      maxDrawdownPercent: checked
                                        ? account.maxDrawdownPercent || 20
                                        : undefined
                                    })
                                  }}
                                  disabled={updatingAutomation[account.accountId]}
                                />
                              </div>
                              {account.autoPauseEnabled && (
                                <div className="ml-6 space-y-2 text-xs text-muted-foreground">
                                  <div>
                                    <Label className="text-xs">Max Drawdown %</Label>
                                    <Input
                                      type="number"
                                      step="1"
                                      min="1"
                                      max="100"
                                      value={account.maxDrawdownPercent || 20}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 20
                                        void handleUpdateAutomation(account.accountId, {
                                          maxDrawdownPercent: value
                                        })
                                      }}
                                      className="h-8 text-xs"
                                      disabled={updatingAutomation[account.accountId]}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Auto-Resume</Label>
                                    <Switch
                                      checked={account.autoResumeEnabled || false}
                                      onCheckedChange={(checked) => {
                                        void handleUpdateAutomation(account.accountId, {
                                          autoResumeEnabled: checked,
                                          resumeDrawdownPercent: checked
                                            ? account.resumeDrawdownPercent || 15
                                            : undefined
                                        })
                                      }}
                                      disabled={updatingAutomation[account.accountId]}
                                    />
                                  </div>
                                  {account.autoResumeEnabled && (
                                    <div>
                                      <Label className="text-xs">Resume Drawdown %</Label>
                                      <Input
                                        type="number"
                                        step="1"
                                        min="1"
                                        max="100"
                                        value={account.resumeDrawdownPercent || 15}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 15
                                          void handleUpdateAutomation(account.accountId, {
                                            resumeDrawdownPercent: value
                                          })
                                        }}
                                        className="h-8 text-xs"
                                        disabled={updatingAutomation[account.accountId]}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Auto-Disconnect */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Auto-Disconnect (Error Protection)</Label>
                                <Switch
                                  checked={account.autoDisconnectEnabled || false}
                                  onCheckedChange={(checked) => {
                                    void handleUpdateAutomation(account.accountId, {
                                      autoDisconnectEnabled: checked,
                                      maxConsecutiveErrors: checked
                                        ? account.maxConsecutiveErrors || 5
                                        : undefined,
                                      errorWindowMinutes: checked
                                        ? account.errorWindowMinutes || 60
                                        : undefined
                                    })
                                  }}
                                  disabled={updatingAutomation[account.accountId]}
                                />
                              </div>
                              {account.autoDisconnectEnabled && (
                                <div className="ml-6 space-y-2 text-xs text-muted-foreground">
                                  <div>
                                    <Label className="text-xs">Max Consecutive Errors</Label>
                                    <Input
                                      type="number"
                                      step="1"
                                      min="1"
                                      max="20"
                                      value={account.maxConsecutiveErrors || 5}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 5
                                        void handleUpdateAutomation(account.accountId, {
                                          maxConsecutiveErrors: value
                                        })
                                      }}
                                      className="h-8 text-xs"
                                      disabled={updatingAutomation[account.accountId]}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Error Window (minutes)</Label>
                                    <Input
                                      type="number"
                                      step="5"
                                      min="5"
                                      max="1440"
                                      value={account.errorWindowMinutes || 60}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 60
                                        void handleUpdateAutomation(account.accountId, {
                                          errorWindowMinutes: value
                                        })
                                      }}
                                      className="h-8 text-xs"
                                      disabled={updatingAutomation[account.accountId]}
                                    />
                                  </div>
                                  {account.consecutiveErrorCount !== undefined &&
                                    account.consecutiveErrorCount > 0 && (
                                      <p className="text-xs text-orange-600 dark:text-orange-400">
                                        Current errors: {account.consecutiveErrorCount}/
                                        {account.maxConsecutiveErrors || 5}
                                      </p>
                                    )}
                                </div>
                              )}
                            </div>

                            {/* Trade Alerts */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Trade Alerts</Label>
                                <Switch
                                  checked={account.tradeAlertsEnabled || false}
                                  onCheckedChange={(checked) => {
                                    void handleUpdateAutomation(account.accountId, {
                                      tradeAlertsEnabled: checked,
                                      alertTypes: checked
                                        ? account.alertTypes || ['largeTrade', 'highProfit', 'dailySummary']
                                        : undefined
                                    })
                                  }}
                                  disabled={updatingAutomation[account.accountId]}
                                />
                              </div>
                              {account.tradeAlertsEnabled && (
                                <div className="ml-6 space-y-3">
                                  {/* Alert Configuration Summary */}
                                  <div className="rounded border bg-muted/30 p-2 space-y-1 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Status:</span>
                                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                        Enabled
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Alert Types:</span>
                                      <span className="font-medium">
                                        {account.alertTypes && account.alertTypes.length > 0
                                          ? account.alertTypes.join(', ')
                                          : 'None selected'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Min Trade Size:</span>
                                      <span className="font-medium">{account.minTradeSizeForAlert || 0.1} lots</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Min Profit:</span>
                                      <span className="font-medium">${account.minProfitForAlert || 100}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Min Loss:</span>
                                      <span className="font-medium">${account.minLossForAlert || -100}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Telegram:</span>
                                      <Badge
                                        variant="outline"
                                        className={
                                          user?.profileSettings?.telegramUserId
                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                            : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                                        }
                                      >
                                        {user?.profileSettings?.telegramUserId ? 'Linked' : 'Not Linked'}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Warnings */}
                                  {(!account.alertTypes || account.alertTypes.length === 0) && (
                                    <Alert variant="destructive" className="py-2">
                                      <AlertCircle className="h-3 w-3" />
                                      <AlertDescription className="text-xs">
                                        No alert types selected. Please select at least one alert type.
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  {!user?.profileSettings?.telegramUserId && (
                                    <Alert className="py-2 border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
                                      <AlertCircle className="h-3 w-3" />
                                      <AlertDescription className="text-xs">
                                        Telegram User ID not set. Go to Profile Settings to link your Telegram account for alerts.
                                      </AlertDescription>
                                    </Alert>
                                  )}

                                  {/* Test Alert Button */}
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => void handleTestAlert(account.accountId)}
                                      disabled={testingAlert[account.accountId] || updatingAutomation[account.accountId]}
                                      className="text-xs"
                                    >
                                      {testingAlert[account.accountId] ? (
                                        <>
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                          Sending...
                                        </>
                                      ) : (
                                        'Test Alert'
                                      )}
                                    </Button>
                                    {testAlertResult[account.accountId] && (
                                      <span
                                        className={`text-xs ${
                                          testAlertResult[account.accountId].success
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                        }`}
                                      >
                                        {testAlertResult[account.accountId].message}
                                      </span>
                                    )}
                                  </div>

                                  {/* Alert Settings */}
                                  <div className="space-y-2 text-xs text-muted-foreground">
                                    <div>
                                      <Label className="text-xs">Min Trade Size for Alert</Label>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={account.minTradeSizeForAlert || 0.1}
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value) || 0.1
                                          void handleUpdateAutomation(account.accountId, {
                                            minTradeSizeForAlert: value
                                          })
                                        }}
                                        className="h-8 text-xs"
                                        disabled={updatingAutomation[account.accountId]}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Min Profit for Alert ($)</Label>
                                      <Input
                                        type="number"
                                        step="10"
                                        min="0"
                                        value={account.minProfitForAlert || 100}
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value) || 100
                                          void handleUpdateAutomation(account.accountId, {
                                            minProfitForAlert: value
                                          })
                                        }}
                                        className="h-8 text-xs"
                                        disabled={updatingAutomation[account.accountId]}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Min Loss for Alert ($)</Label>
                                      <Input
                                        type="number"
                                        step="10"
                                        max="0"
                                        value={account.minLossForAlert || -100}
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value) || -100
                                          void handleUpdateAutomation(account.accountId, {
                                            minLossForAlert: value
                                          })
                                        }}
                                        className="h-8 text-xs"
                                        disabled={updatingAutomation[account.accountId]}
                                      />
                                    </div>
                                  </div>

                                  {/* Info Message */}
                                  <Alert className="py-2">
                                    <AlertCircle className="h-3 w-3" />
                                    <AlertDescription className="text-xs">
                                      Alerts are sent when trades meet your configured thresholds. You'll receive notifications in-app and via Telegram (if linked).
                                    </AlertDescription>
                                  </Alert>
                                </div>
                              )}
                            </div>

                            {updatingAutomation[account.accountId] && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Updating...
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 dark:text-red-400"
                          onClick={() => handleDisconnect(account.accountId)}
                          disabled={disconnectingAccountId === account.accountId}
                        >
                          {disconnectingAccountId === account.accountId ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Disconnect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connect a New MetaTrader Account</CardTitle>
            <CardDescription>
              You can connect multiple MT4/MT5 accounts and choose which strategy to copy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="strategy">Choose Master Strategy</Label>
                <Select
                  value={formData.strategyId}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      strategyId: value,
                      symbolMapping: ''
                    }))
                    setUseCustomSymbolMapping(false)
                    const selected = strategies.find((strategy) => strategy.id === value)
                    setDefaultSymbolMappingText(formatSymbolMappingText(selected?.symbolMapping))
                  }}
                  disabled={loadingStrategies || strategies.length === 0}
                  required
                >
                  <SelectTrigger id="strategy">
                    <SelectValue
                      placeholder={
                        loadingStrategies
                          ? 'Loading strategies...'
                          : strategies.length === 0
                          ? 'No strategies available'
                          : 'Select strategy'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.name}
                        {strategy.id === primaryStrategy?.id ? ' (Recommended)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only active master strategies appear here. Contact support if you need access to a
                  specific strategy.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-label">Account Label (optional)</Label>
                <Input
                  id="account-label"
                  placeholder="e.g. My funded account"
                  value={formData.label}
                  maxLength={60}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, label: event.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded border border-dashed p-3">
                <div>
                  <Label className="text-sm font-medium">Reverse Copy Trading</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, trades are mirrored (buy ⇄ sell). Useful for hedging strategies.
                  </p>
                </div>
                <Switch
                  checked={formData.reverseTrading}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, reverseTrading: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="broker">Broker</Label>
                  <Input
                    id="broker"
                    placeholder="e.g. IC Markets"
                    value={formData.broker}
                    onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="server">Server</Label>
                  <Input
                    id="server"
                    placeholder="e.g. ICMarkets-Demo01"
                    value={formData.server}
                    onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login">Login</Label>
                  <Input
                    id="login"
                    placeholder="Your MT account login"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Your MT account password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value: 'mt4' | 'mt5') =>
                      setFormData((prev) => ({ ...prev, platform: value }))
                    }
                  >
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mt4">MT4</SelectItem>
                      <SelectItem value="mt5">MT5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risk">Risk Multiplier</Label>
                  <Input
                    id="risk"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    placeholder="1.0"
                    value={formData.riskMultiplier}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        riskMultiplier: parseFloat(e.target.value)
                      })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    0.5 = half risk, 1 = same risk, 2 = double risk
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-risk">Max Risk Fraction (optional)</Label>
                <Input
                  id="max-risk"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="0.01 (1%)"
                  value={formData.maxRiskPercent}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxRiskPercent: event.target.value
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Caps risk per trade as a fraction of balance (e.g., 0.03 = 3%).
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">Symbol Mapping</Label>
                    <p className="text-xs text-muted-foreground">
                      Default instrument remaps defined by the master strategy.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Override</span>
                    <Switch
                      id="custom-symbol-mapping"
                      checked={useCustomSymbolMapping}
                      disabled={!formData.strategyId}
                      onCheckedChange={(checked) => {
                        setUseCustomSymbolMapping(checked)
                        setFormData((prev) => ({
                          ...prev,
                          symbolMapping:
                            checked && prev.symbolMapping.trim().length === 0
                              ? defaultSymbolMappingText
                              : checked
                              ? prev.symbolMapping
                              : ''
                        }))
                      }}
                    />
                  </div>
                </div>

                {defaultSymbolMappingText ? (
                  <pre className="rounded border bg-muted/40 p-3 text-xs font-mono whitespace-pre-wrap">
                    {defaultSymbolMappingText}
                  </pre>
                ) : (
                  <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
                    No universal mapping provided for this strategy. Symbols will be copied as-is unless
                    you add a custom override.
                  </div>
                )}

                {useCustomSymbolMapping && (
                  <div className="space-y-2">
                    <Textarea
                      id="symbol-mapping"
                      placeholder={`e.g. [\n  {"from": "XAUUSD", "to": "GOLD.lmax"}\n]`}
                      value={formData.symbolMapping}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, symbolMapping: event.target.value }))
                      }
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide a JSON array of objects with `"from"`/`"to"` keys or leave blank to fall
                      back to the master defaults.
                    </p>
                  </div>
                )}
              </div>

              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Security Notice</AlertTitle>
                <AlertDescription>
                  Your password is encrypted and stored securely. We never share your trading
                  credentials with third parties.
                </AlertDescription>
              </Alert>

              <Button type="submit" disabled={connecting || !canSubmit} className="w-full">
                {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect & Start Copy Trading
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

