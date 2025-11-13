'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Edit3,
  Loader2,
  RefreshCw,
  Settings,
  Trash2,
  Users,
  Plus,
  DollarSign,
  TrendingUp,
  Shield,
  BarChart
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { exportToCSV, exportToPDF } from '@/lib/exportUtils'
import { LineChart, Line, PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import FinancialManagementTab from './financial/page'
import { TradeHistoryViewer } from '@/components/copy-trading/TradeHistoryViewer'
import { PerformanceCalendarTab } from './performance-tab'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ManagedStrategy {
  strategyId: string
  name: string
  description?: string
  accountId: string
  status: 'active' | 'inactive'
  isPrimary: boolean
  hasToken: boolean
  createdAt: string | Date
  updatedAt: string | Date
  symbolMapping?: Array<{ from: string; to: string }>
}

interface RemoteStrategy {
  id: string
  name: string
  description?: string
  accountId: string
}

interface Follower {
  userId: string
  email: string
  accountId: string
  strategyId: string
  strategyName?: string
  riskMultiplier: number
  status: 'active' | 'inactive' | 'error'
  broker: string
  server: string
  login: string
  platform: 'mt4' | 'mt5'
  createdAt: string | Date
  lastError?: string
  label?: string
  reverseTrading?: boolean
  symbolMapping?: Record<string, string>
  maxRiskPercent?: number
}

interface FollowerStats {
  userId: string
  email: string
  accountId: string
  strategyId: string
  strategyName: string
  balance: number
  equity: number
  margin: number
  freeMargin: number
  marginLevel: number
  currency: string
  login: string
  server: string
  platform: string
  status: 'success' | 'error'
  error?: string
  // New fields (non-breaking additions)
  profitLoss?: number
  openPositions?: number
  totalVolume?: number
  accountAge?: number
  createdAt?: Date | string
}

interface StatisticsData {
  totals: {
    totalCapital: number
    totalEquity: number
    totalMargin: number
    totalFreeMargin: number
    averageMarginLevel: number
    successfulFetches: number
    failedFetches: number
  }
  followers: FollowerStats[]
  count: number
  // New fields (non-breaking additions)
  performance?: {
    totalProfitLoss: number
    winRate: number
    averageProfit: number
    totalTrades: number
    winningTrades: number
    losingTrades: number
    largestWin: number
    largestLoss: number
    averageWin: number
    averageLoss: number
    profitFactor: number
  }
  risk?: {
    totalExposure: number
    maxDrawdown: number
    currentDrawdown: number
    riskPerAccount: number
    accountsAtRisk: number
  }
  trading?: {
    openPositions: number
    totalVolume: number
    averageTradeSize: number
    activeAccounts: number
    inactiveAccounts: number
  }
  lastUpdated?: string
}

const formatDate = (value: string | Date | undefined) => {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  return isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const initialForm = (setActiveDefault = false) => ({
  name: '',
  description: '',
  accountId: '',
  token: '',
  symbolMapping: '',
  setActive: setActiveDefault
})

export default function AdminCopyTradingPage() {
  const { user } = useAuth()

  const [loadingStrategies, setLoadingStrategies] = useState(true)
  const [loadingFollowers, setLoadingFollowers] = useState(false)
  const [loadingStatistics, setLoadingStatistics] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncingStrategies, setSyncingStrategies] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [strategies, setStrategies] = useState<ManagedStrategy[]>([])
  const [followers, setFollowers] = useState<Follower[]>([])
  const [statistics, setStatistics] = useState<StatisticsData | null>(null)
  const [deletingFollower, setDeletingFollower] = useState<string | null>(null)
  const [availableStrategies, setAvailableStrategies] = useState<RemoteStrategy[]>([])
  
  // Filter and sort state (new additions)
  const [filterStrategy, setFilterStrategy] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('email')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedFollowerForHistory, setSelectedFollowerForHistory] = useState<{
    accountId: string
    userId: string
    strategyId: string
    accountName?: string
  } | null>(null)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null)
  const [formHasToken, setFormHasToken] = useState(false)
  const [formData, setFormData] = useState(initialForm(true))
  const [initialSymbolMapping, setInitialSymbolMapping] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const activeStrategy = useMemo(
    () => strategies.find((strategy) => strategy.isPrimary || strategy.status === 'active') ?? null,
    [strategies]
  )

  const strategyMap = useMemo(() => {
    return strategies.reduce<Record<string, ManagedStrategy>>((map, strategy) => {
      map[strategy.strategyId] = strategy
      return map
    }, {})
  }, [strategies])

  const normalizeSymbolMappingValue = (value: unknown): Array<{ from: string; to: string }> => {
    if (!value) return []

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return normalizeSymbolMappingValue(parsed)
      } catch {
        return []
      }
    }

    let entries: Array<{ from?: unknown; to?: unknown }> = []

    if (Array.isArray(value)) {
      entries = value as Array<{ from?: unknown; to?: unknown }>
    } else if (typeof value === 'object') {
      entries = Object.entries(value as Record<string, unknown>).map(([from, to]) => ({
        from,
        to
      }))
    }

    return entries
      .map((entry) => {
        const from = typeof entry.from === 'string' ? entry.from.trim() : ''
        const to = typeof entry.to === 'string' ? entry.to.trim() : ''
        if (!from || !to) return null
        return { from, to }
      })
      .filter((entry): entry is { from: string; to: string } => entry !== null)
  }

  const formatSymbolMappingText = (mapping?: Array<{ from: string; to: string }>): string => {
    if (!mapping || mapping.length === 0) return ''
    return JSON.stringify(mapping, null, 2)
  }

  const parseSymbolMappingText = (text: string): Array<{ from: string; to: string }> => {
    const trimmed = text.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (!Array.isArray(parsed) && typeof parsed !== 'object') {
        throw new Error('Symbol mapping must be a JSON array or object.')
      }
      const normalized = normalizeSymbolMappingValue(parsed)
      return normalized
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Symbol mapping must be valid JSON (array or object).'
      )
    }
  }

  useEffect(() => {
    if (user?.isAdmin) {
      void loadStrategies()
      void loadFollowers()
    }
  }, [user])

  const loadStrategies = async () => {
    try {
      setLoadingStrategies(true)
      const response = await fetch('/api/copyfactory/master/list', {
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      const data = await response.json()

      if (data.success) {
        const fetched: ManagedStrategy[] = (data.strategies || []).map((strategy: any) => {
          const symbolMapping = normalizeSymbolMappingValue(strategy.symbolMapping)
          return {
            ...strategy,
            createdAt: strategy.createdAt,
            updatedAt: strategy.updatedAt,
            symbolMapping: symbolMapping.length > 0 ? symbolMapping : undefined
          }
        })
        setStrategies(fetched)

        if (fetched.length === 0) {
          setFormMode('create')
          setSelectedStrategyId(null)
          setFormHasToken(false)
          setFormData(initialForm(true))
          setAvailableStrategies([])
          return
        }

        if (selectedStrategyId) {
          const current = fetched.find((strategy) => strategy.strategyId === selectedStrategyId)
          if (current) {
            applyStrategyToForm(current)
            return
          }
        }

        const active = fetched.find((strategy) => strategy.isPrimary || strategy.status === 'active')
        const defaultStrategy = active ?? fetched[0]
        applyStrategyToForm(defaultStrategy)
      } else {
        setError(data.error || 'Failed to load strategies')
      }
    } catch (err) {
      console.error('Error loading strategies:', err)
      setError('Failed to load master strategies')
    } finally {
      setLoadingStrategies(false)
    }
  }

  const loadFollowers = async () => {
    try {
      setLoadingFollowers(true)
      const response = await fetch('/api/admin/copyfactory/followers', {
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      const data = await response.json()

      if (data.success) {
        const followerList: Follower[] =
          data.followers?.map((follower: any) => {
            let symbolMapping: Record<string, string> | undefined
            if (follower.symbolMapping) {
              if (typeof follower.symbolMapping === 'string') {
                try {
                  const parsed = JSON.parse(follower.symbolMapping)
                  if (parsed && typeof parsed === 'object') {
                    symbolMapping = parsed
                  }
                } catch (error) {
                  console.warn('Failed to parse follower symbol mapping', error)
                }
              } else {
                symbolMapping = follower.symbolMapping
              }
            }

            return {
              ...follower,
              createdAt: follower.createdAt,
              strategyName: follower.strategyName,
              label: follower.label,
              symbolMapping
            }
          }) || []
        setFollowers(followerList)
      } else {
        setError(data.error || 'Failed to fetch followers')
      }
    } catch (err) {
      console.error('Error loading followers:', err)
      setError('Failed to load followers.')
    } finally {
      setLoadingFollowers(false)
    }
  }

  const loadStatistics = async () => {
    try {
      setLoadingStatistics(true)
      setError(null)
      const response = await fetch('/api/admin/copyfactory/followers/statistics', {
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      const data = await response.json()

      if (data.success) {
        setStatistics(data)
        if (data.errors && data.errors.length > 0) {
          console.warn('Some accounts failed to fetch:', data.errors)
        }
      } else {
        setError(data.error || 'Failed to fetch statistics')
      }
    } catch (err) {
      console.error('Error loading statistics:', err)
      setError('Failed to load statistics.')
    } finally {
      setLoadingStatistics(false)
    }
  }

  // Filter and sort functions (new additions)
  const filteredAndSortedFollowers = useMemo(() => {
    if (!statistics?.followers) return []

    let filtered = [...statistics.followers]

    // Apply filters
    if (filterStrategy !== 'all') {
      filtered = filtered.filter((f) => f.strategyId === filterStrategy)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((f) => f.status === filterStatus)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (f) =>
          f.email.toLowerCase().includes(query) ||
          f.accountId.toLowerCase().includes(query) ||
          f.strategyName.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortBy) {
        case 'email':
          aVal = a.email
          bVal = b.email
          break
        case 'balance':
          aVal = a.balance
          bVal = b.balance
          break
        case 'equity':
          aVal = a.equity
          bVal = b.equity
          break
        case 'profitLoss':
          aVal = a.profitLoss || 0
          bVal = b.profitLoss || 0
          break
        case 'marginLevel':
          aVal = a.marginLevel
          bVal = b.marginLevel
          break
        case 'accountAge':
          aVal = a.accountAge || 0
          bVal = b.accountAge || 0
          break
        default:
          aVal = a.email
          bVal = b.email
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

    return filtered
  }, [statistics?.followers, filterStrategy, filterStatus, searchQuery, sortBy, sortOrder])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        void loadStatistics()
      }, 30000) // Refresh every 30 seconds
      setAutoRefreshInterval(interval)
      return () => {
        if (interval) clearInterval(interval)
      }
    } else {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval)
        setAutoRefreshInterval(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh])

  const applyStrategyToForm = (strategy: ManagedStrategy) => {
    setFormMode('edit')
    setSelectedStrategyId(strategy.strategyId)
    setFormHasToken(strategy.hasToken)
    const symbolMappingText = formatSymbolMappingText(strategy.symbolMapping)
    setFormData({
      name: strategy.name,
      description: strategy.description || '',
      accountId: strategy.accountId,
      token: '',
      symbolMapping: symbolMappingText,
      setActive: strategy.isPrimary
    })
    setInitialSymbolMapping(symbolMappingText)
    setAvailableStrategies([])
  }

  const handleDeleteFollower = async (userId: string, accountId: string) => {
    if (
      !confirm(
        'Remove this follower? This will disconnect their MetaTrader account from CopyFactory.'
      )
    ) {
      return
    }

    setDeletingFollower(accountId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/copyfactory/followers/${userId}/${accountId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('Follower removed successfully.')
        setFollowers((prev) => prev.filter((follower) => follower.accountId !== accountId))
      } else {
        setError(data.error || 'Failed to remove follower.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to remove follower.')
    } finally {
      setDeletingFollower(null)
    }
  }

  const startCreateMode = () => {
    setFormMode('create')
    setSelectedStrategyId(null)
    setFormHasToken(false)
    setFormData(initialForm(strategies.length === 0))
    setInitialSymbolMapping('')
    setAvailableStrategies([])
    setError(null)
    setSuccess(null)
  }

  const handleSyncStrategies = async () => {
    if (!formData.accountId) {
      setError('Please provide a MetaApi account ID before syncing strategies.')
      return
    }

    setError(null)
    setSuccess(null)
    setSyncingStrategies(true)

    try {
      const response = await fetch('/api/copyfactory/master/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        },
        body: JSON.stringify({
          accountId: formData.accountId,
          strategyId: selectedStrategyId || undefined,
          token: formData.token ? formData.token.trim() : undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        const fetched: RemoteStrategy[] = data.strategies || []
        setAvailableStrategies(fetched)

        if (fetched.length === 0) {
          setSuccess('No strategies found for this account ID.')
        } else {
          setSuccess('Strategies synced successfully.')
        }
      } else {
        setError(data.error || 'Failed to fetch strategies from MetaApi')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Network error while syncing strategies.')
    } finally {
      setSyncingStrategies(false)
    }
  }

  const handleApplyRemoteStrategy = (strategy: RemoteStrategy) => {
    setFormData((prev) => ({
      ...prev,
      name: strategy.name,
      description: strategy.description || '',
      accountId: strategy.accountId
    }))
    setSuccess(`Loaded details from strategy ${strategy.id}.`)
  }

  const handleCreateStrategy = async () => {
    if (!formData.name.trim() || !formData.accountId.trim()) {
      setError('Please provide strategy name and account ID.')
      return
    }

    setError(null)
    setSuccess(null)
    setCreating(true)

    try {
      let symbolMappingPayload: Array<{ from: string; to: string }> | undefined
      if (formData.symbolMapping.trim().length > 0) {
        symbolMappingPayload = parseSymbolMappingText(formData.symbolMapping)
      }

      const response = await fetch('/api/copyfactory/master/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          accountId: formData.accountId.trim(),
          token: formData.token?.trim() || undefined,
          setActive: formData.setActive,
          symbolMapping: symbolMappingPayload
        })
      })

      const data = await response.json()

      if (data.success && data.strategy) {
        setSuccess('Master strategy created successfully.')
        setSelectedStrategyId(data.strategy.strategyId)
        setFormHasToken(Boolean(data.strategy.hasToken))
        setFormMode('edit')
        setFormData((prev) => ({
          ...prev,
          token: '',
          symbolMapping: prev.symbolMapping,
          setActive: data.strategy.isPrimary
        }))
        setInitialSymbolMapping(formData.symbolMapping)
        await loadStrategies()
      } else {
        setError(data.error || 'Failed to create master strategy.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to create master strategy.')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateStrategy = async () => {
    if (!selectedStrategyId) {
      setError('No strategy selected.')
      return
    }

    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        accountId: formData.accountId.trim(),
        setActive: formData.setActive
      }

      if (formData.token.trim().length > 0) {
        payload.token = formData.token.trim()
      }

       const mappingChanged =
         formData.symbolMapping.trim() !== initialSymbolMapping.trim()

       if (mappingChanged) {
         if (formData.symbolMapping.trim().length === 0) {
           payload.symbolMapping = []
         } else {
           payload.symbolMapping = parseSymbolMappingText(formData.symbolMapping)
         }
       }

      const response = await fetch(`/api/copyfactory/master/${selectedStrategyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success && data.strategy) {
        setSuccess('Strategy updated successfully.')
        setFormHasToken(Boolean(data.strategy.hasToken))
        setFormData((prev) => ({
          ...prev,
          token: '',
          symbolMapping: prev.symbolMapping,
          setActive: data.strategy.isPrimary
        }))
        setInitialSymbolMapping(formData.symbolMapping)
        await loadStrategies()
      } else {
        setError(data.error || 'Failed to update strategy.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to update strategy.')
    } finally {
      setSaving(false)
    }
  }

  const handleSetActive = async (strategyId: string) => {
    setActivatingId(strategyId)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/copyfactory/master/${strategyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        },
        body: JSON.stringify({ setActive: true })
      })
      const data = await response.json()
      if (data.success) {
        setSuccess('Strategy activated.')
        setSelectedStrategyId(strategyId)
        await loadStrategies()
      } else {
        setError(data.error || 'Failed to activate strategy.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to activate strategy.')
    } finally {
      setActivatingId(null)
    }
  }

  const handleDeleteStrategy = async (strategyId: string) => {
    const confirmDelete = window.confirm(
      'Deleting this strategy will remove it from the dashboard (but not from MetaApi). Continue?'
    )
    if (!confirmDelete) return

    setDeletingId(strategyId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/copyfactory/master/${strategyId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('Strategy removed.')
        if (selectedStrategyId === strategyId) {
          startCreateMode()
        }
        await loadStrategies()
      } else {
        setError(data.error || 'Failed to delete strategy.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to delete strategy.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Admin access required</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loadingStrategies) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading strategies...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Copy className="h-8 w-8" />
          Copy Trading Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage master CopyFactory strategies, configuration, and followers.
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

      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configuration">Strategies</TabsTrigger>
          <TabsTrigger value="followers">
            Followers
            {followers.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {followers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="performance">Performance Calendar</TabsTrigger>
          <TabsTrigger value="financial">Financial Management</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Saved Master Strategies</span>
                <Button variant="outline" onClick={startCreateMode}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Strategy
                </Button>
              </CardTitle>
              <CardDescription>
                Manage the list of CopyFactory master strategies available to your subscribers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategies.length === 0 ? (
                <div className="rounded border border-dashed p-6 text-center">
                  <p className="text-muted-foreground">
                    No strategies saved yet. Create one using the form below.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {strategies.map((strategy) => (
                    <div
                      key={strategy.strategyId}
                      className={`rounded-lg border p-4 ${
                        strategy.isPrimary ? 'border-green-500/60 bg-green-50 dark:border-green-600/60 dark:bg-green-900/10' : 'border-border'
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">
                              {strategy.name || strategy.strategyId}
                            </h3>
                            {strategy.isPrimary && (
                              <Badge className="bg-green-600 text-white flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground break-all">
                            Strategy ID: {strategy.strategyId}
                          </p>
                          <p className="text-sm text-muted-foreground break-all">
                            Account ID: {strategy.accountId || '—'}
                          </p>
                          {strategy.description && (
                            <p className="text-sm text-muted-foreground">{strategy.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
                            <span>Status: {strategy.status}</span>
                            <span>Token: {strategy.hasToken ? 'Stored' : 'Not set'}</span>
                            <span>Created: {formatDate(strategy.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 md:w-48">
                          <Button
                            variant="secondary"
                            onClick={() => applyStrategyToForm(strategy)}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          {!strategy.isPrimary && (
                            <Button
                              variant="outline"
                              disabled={activatingId === strategy.strategyId}
                              onClick={() => handleSetActive(strategy.strategyId)}
                            >
                            {activatingId === strategy.strategyId ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                              Set Active
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            disabled={deletingId === strategy.strategyId}
                            onClick={() => handleDeleteStrategy(strategy.strategyId)}
                          >
                            {deletingId === strategy.strategyId ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {formMode === 'create' ? 'Create Master Strategy' : 'Edit Master Strategy'}
              </CardTitle>
              <CardDescription>
                {formMode === 'create'
                  ? 'Provision a new CopyFactory strategy and store it for subscribers.'
                  : 'Update the selected strategy configuration.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {formMode === 'edit' && selectedStrategyId && (
                <div className="rounded border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Editing strategy <span className="font-mono">{selectedStrategyId}</span>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="strategy-name">Strategy Name</Label>
                  <Input
                    id="strategy-name"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="e.g. RedemptionFX Master Strategy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strategy-description">Description</Label>
                  <Input
                    id="strategy-description"
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Short description shown to followers"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="account-id">MetaApi Account ID</Label>
                  <Input
                    id="account-id"
                    value={formData.accountId}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, accountId: event.target.value }))
                    }
                    placeholder="Account ID that executes the master trades"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="master-token">MetaApi Token</Label>
                  <Input
                    id="master-token"
                    type="password"
                    value={formData.token}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, token: event.target.value }))
                    }
                    placeholder={
                      formMode === 'edit' && formHasToken
                        ? '•••••••••••• (leave blank to keep existing)'
                        : 'Paste token with CopyFactory permissions'
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Tokens are encrypted before storage. Leave blank to keep the current token.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol-mapping">Universal Symbol Mapping (JSON)</Label>
                <Textarea
                  id="symbol-mapping"
                  value={formData.symbolMapping}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, symbolMapping: event.target.value }))
                  }
                  placeholder='[{"from": "XAUUSD", "to": "GOLD.lmax"}] or {"XAUUSD": "GOLD.lmax"}'
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Define symbol remaps applied to every follower of this strategy. Provide a JSON array
                  of objects with `"from"`/`"to"` keys, or a JSON object mapping provider symbols to
                  subscriber symbols. Leave blank to use symbols as-is.
                </p>
              </div>

              <div className="flex items-center justify-between rounded border border-dashed p-3">
                <div>
                  <Label className="text-sm font-medium">Set as active master strategy</Label>
                  <p className="text-xs text-muted-foreground">
                    Followers will copy trades from the active strategy.
                  </p>
                </div>
                <Switch
                  checked={formData.setActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, setActive: checked }))
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Sync strategies from MetaApi</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSyncStrategies}
                    disabled={syncingStrategies || !formData.accountId.trim()}
                  >
                    {syncingStrategies ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Sync
                  </Button>
                </div>
                {availableStrategies.length > 0 && (
                  <div className="rounded border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Select a remote strategy to prefill this form.
                    </p>
                    <div className="space-y-2">
                      {availableStrategies.map((strategy) => (
                        <div
                          key={strategy.id}
                          className="flex items-center justify-between rounded bg-background p-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{strategy.name}</p>
                            <p className="text-xs text-muted-foreground break-all">
                              {strategy.id} • {strategy.accountId}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApplyRemoteStrategy(strategy)}
                          >
                            Apply
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {formMode === 'edit' ? (
                  <Button onClick={handleUpdateStrategy} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                ) : (
                  <Button onClick={handleCreateStrategy} disabled={creating}>
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Strategy
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Copy Trading Followers
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadFollowers}
                  disabled={loadingFollowers}
                >
                  {loadingFollowers ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </CardTitle>
              <CardDescription>Users currently connected to copy your master strategies.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFollowers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : followers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No followers yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Users will appear here after they connect their trading accounts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {followers.map((follower) => {
                    const strategy = strategyMap[follower.strategyId]
                    return (
                      <div key={follower.accountId} className="rounded border p-4 space-y-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <Label className="text-sm text-muted-foreground">User Email</Label>
                              <p className="font-medium break-all">{follower.email || 'N/A'}</p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Linked Strategy</Label>
                              <p className="font-medium break-all">
                                {strategy
                                  ? strategy.name
                                  : follower.strategyName || follower.strategyId}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Label</Label>
                              <p className="font-medium break-all">{follower.label || '—'}</p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Account ID</Label>
                              <p className="font-mono text-xs break-all">{follower.accountId}</p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Status</Label>
                              <Badge
                                className={
                                  follower.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : follower.status === 'error'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {follower.status}
                              </Badge>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Broker / Server</Label>
                              <p className="font-medium">
                                {follower.broker} / {follower.server}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Platform</Label>
                              <p className="font-medium uppercase">{follower.platform}</p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Risk Multiplier</Label>
                              <p className="font-medium">{follower.riskMultiplier}x</p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Reverse Copy</Label>
                              <p className="font-medium">
                                {follower.reverseTrading ? 'Enabled' : 'Disabled'}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Max Risk %</Label>
                              <p className="font-medium">
                                {typeof follower.maxRiskPercent === 'number'
                                  ? `${(follower.maxRiskPercent * 100).toFixed(2)}%`
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Connected</Label>
                              <p className="font-medium">{formatDate(follower.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-start justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 dark:text-red-400"
                              onClick={() => handleDeleteFollower(follower.userId, follower.accountId)}
                              disabled={deletingFollower === follower.accountId}
                            >
                              {deletingFollower === follower.accountId ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Remove
                            </Button>
                          </div>
                        </div>
                        {follower.symbolMapping && (
                          <div className="rounded bg-muted/40 p-3 text-xs font-mono">
                            <Label className="text-sm text-muted-foreground">Symbol Mapping</Label>
                            <pre className="mt-1 whitespace-pre-wrap">
                              {JSON.stringify(follower.symbolMapping, null, 2)}
                            </pre>
                          </div>
                        )}
                        {follower.lastError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Last Error</AlertTitle>
                            <AlertDescription>{follower.lastError}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Follower Account Statistics
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadStatistics}
                  disabled={loadingStatistics}
                >
                  {loadingStatistics ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Real-time account statistics for all copy trading followers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStatistics ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading statistics...</span>
                </div>
              ) : !statistics ? (
                <div className="text-center py-12">
                  <BarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No statistics loaded</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click refresh to fetch account statistics from MetaAPI.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-100 text-sm font-medium">Total Capital</p>
                            <p className="text-2xl font-bold mt-1">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: statistics.totals.totalCapital > 0 ? 'USD' : 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(statistics.totals.totalCapital)}
                            </p>
                          </div>
                          <DollarSign className="h-8 w-8 text-blue-200" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-100 text-sm font-medium">Total Equity</p>
                            <p className="text-2xl font-bold mt-1">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(statistics.totals.totalEquity)}
                            </p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-green-200" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-amber-100 text-sm font-medium">Total Margin</p>
                            <p className="text-2xl font-bold mt-1">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(statistics.totals.totalMargin)}
                            </p>
                          </div>
                          <Shield className="h-8 w-8 text-amber-200" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-100 text-sm font-medium">Avg Margin Level</p>
                            <p className="text-2xl font-bold mt-1">
                              {statistics.totals.averageMarginLevel && statistics.totals.averageMarginLevel > 0
                                ? `${statistics.totals.averageMarginLevel.toFixed(2)}%`
                                : '—'}
                            </p>
                          </div>
                          <BarChart className="h-8 w-8 text-purple-200" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Status Summary */}
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {statistics.totals.successfulFetches} Successful
                    </Badge>
                    {statistics.totals.failedFetches > 0 && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {statistics.totals.failedFetches} Failed
                      </Badge>
                    )}
                    <span className="text-muted-foreground">
                      Total Accounts: {statistics.count}
                    </span>
                    {statistics.lastUpdated && (
                      <span className="text-muted-foreground text-xs">
                        Last updated: {new Date(statistics.lastUpdated).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Performance Metrics Section */}
                  {statistics.performance && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Total P/L</p>
                            <p className={`text-2xl font-bold mt-1 ${statistics.performance.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(statistics.performance.totalProfitLoss)}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Win Rate</p>
                            <p className="text-2xl font-bold mt-1">
                              {statistics.performance.winRate != null ? `${statistics.performance.winRate.toFixed(2)}%` : '—'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {statistics.performance.winningTrades ?? 0}W / {statistics.performance.losingTrades ?? 0}L
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Average Profit</p>
                            <p className={`text-2xl font-bold mt-1 ${statistics.performance.averageProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(statistics.performance.averageProfit)}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Profit Factor</p>
                            <p className="text-2xl font-bold mt-1">
                              {statistics.performance.profitFactor == null
                                ? '—'
                                : statistics.performance.profitFactor === Infinity
                                ? '∞'
                                : statistics.performance.profitFactor.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Risk Analysis Section */}
                  {statistics.risk && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Risk Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Total Exposure</p>
                            <p className="text-xl font-bold mt-1">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(statistics.risk.totalExposure)}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Current Drawdown</p>
                            <p className={`text-xl font-bold mt-1 ${statistics.risk.currentDrawdown != null && statistics.risk.currentDrawdown > 10 ? 'text-red-600' : 'text-amber-600'}`}>
                              {statistics.risk.currentDrawdown != null ? `${statistics.risk.currentDrawdown.toFixed(2)}%` : '—'}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Max Drawdown</p>
                            <p className={`text-xl font-bold mt-1 ${statistics.risk.maxDrawdown != null && statistics.risk.maxDrawdown > 10 ? 'text-red-600' : 'text-amber-600'}`}>
                              {statistics.risk.maxDrawdown != null ? `${statistics.risk.maxDrawdown.toFixed(2)}%` : '—'}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Risk Per Account</p>
                            <p className="text-xl font-bold mt-1">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(statistics.risk.riskPerAccount)}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Accounts At Risk</p>
                            <p className={`text-xl font-bold mt-1 ${statistics.risk.accountsAtRisk > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {statistics.risk.accountsAtRisk}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Margin &lt; 200%</p>
                          </div>
                        </div>
                        {statistics.risk.accountsAtRisk > 0 && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Warning</AlertTitle>
                            <AlertDescription>
                              {statistics.risk.accountsAtRisk} account(s) have margin levels below the safe threshold (200%).
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Trading Activity Section */}
                  {statistics.trading && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Trading Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Open Positions</p>
                            <p className="text-2xl font-bold mt-1">{statistics.trading.openPositions}</p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Total Volume</p>
                            <p className="text-xl font-bold mt-1">
                              {statistics.trading.totalVolume != null ? `${statistics.trading.totalVolume.toFixed(2)} lots` : '—'}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Avg Trade Size</p>
                            <p className="text-xl font-bold mt-1">
                              {statistics.trading.averageTradeSize != null ? `${statistics.trading.averageTradeSize.toFixed(2)} lots` : '—'}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-900/20">
                            <p className="text-sm text-muted-foreground">Active Accounts</p>
                            <p className="text-2xl font-bold mt-1 text-green-600">
                              {statistics.trading.activeAccounts}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-900/20">
                            <p className="text-sm text-muted-foreground">Inactive Accounts</p>
                            <p className="text-2xl font-bold mt-1 text-gray-600">
                              {statistics.trading.inactiveAccounts}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Visualizations */}
                  {statistics.followers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Visualizations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Account Distribution Pie Chart */}
                          {statistics.trading && (
                            <div>
                              <h3 className="text-sm font-medium mb-4">Account Status Distribution</h3>
                              <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Active', value: statistics.trading.activeAccounts, color: '#10b981' },
                                      { name: 'Inactive', value: statistics.trading.inactiveAccounts, color: '#6b7280' }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {[
                                      { name: 'Active', value: statistics.trading.activeAccounts, color: '#10b981' },
                                      { name: 'Inactive', value: statistics.trading.inactiveAccounts, color: '#6b7280' }
                                    ].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Margin Level Distribution */}
                          {statistics.followers.filter((f) => f.status === 'success').length > 0 && (
                            <div>
                              <h3 className="text-sm font-medium mb-4">Margin Level Distribution</h3>
                              <ResponsiveContainer width="100%" height={250}>
                                <RechartsBarChart
                                  data={[
                                    {
                                      range: '0-100%',
                                      count: statistics.followers.filter((f) => f.status === 'success' && f.marginLevel >= 0 && f.marginLevel < 100).length
                                    },
                                    {
                                      range: '100-200%',
                                      count: statistics.followers.filter((f) => f.status === 'success' && f.marginLevel >= 100 && f.marginLevel < 200).length
                                    },
                                    {
                                      range: '200-500%',
                                      count: statistics.followers.filter((f) => f.status === 'success' && f.marginLevel >= 200 && f.marginLevel < 500).length
                                    },
                                    {
                                      range: '500%+',
                                      count: statistics.followers.filter((f) => f.status === 'success' && f.marginLevel >= 500).length
                                    }
                                  ]}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="range" />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#3b82f6" />
                                </RechartsBarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Equity vs Balance Comparison */}
                          {statistics.followers.filter((f) => f.status === 'success').length > 0 && (
                            <div>
                              <h3 className="text-sm font-medium mb-4">Top 10 Accounts: Equity vs Balance</h3>
                              <ResponsiveContainer width="100%" height={250}>
                                <RechartsBarChart
                                  data={statistics.followers
                                    .filter((f) => f.status === 'success')
                                    .sort((a, b) => b.equity - a.equity)
                                    .slice(0, 10)
                                    .map((f) => ({
                                      account: f.email?.substring(0, 15) || f.accountId.substring(0, 8),
                                      balance: f.balance,
                                      equity: f.equity
                                    }))}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="account" angle={-45} textAnchor="end" height={80} />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="balance" fill="#8b5cf6" />
                                  <Bar dataKey="equity" fill="#10b981" />
                                </RechartsBarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Profit/Loss Distribution */}
                          {statistics.followers.filter((f) => f.status === 'success' && typeof f.profitLoss === 'number').length > 0 && (
                            <div>
                              <h3 className="text-sm font-medium mb-4">Profit/Loss Distribution</h3>
                              <ResponsiveContainer width="100%" height={250}>
                                <RechartsBarChart
                                  data={[
                                    {
                                      range: 'Loss >$100',
                                      count: statistics.followers.filter((f) => f.status === 'success' && typeof f.profitLoss === 'number' && f.profitLoss < -100).length
                                    },
                                    {
                                      range: 'Loss $0-$100',
                                      count: statistics.followers.filter((f) => f.status === 'success' && typeof f.profitLoss === 'number' && f.profitLoss < 0 && f.profitLoss >= -100).length
                                    },
                                    {
                                      range: 'Break Even',
                                      count: statistics.followers.filter((f) => f.status === 'success' && typeof f.profitLoss === 'number' && f.profitLoss === 0).length
                                    },
                                    {
                                      range: 'Profit $0-$100',
                                      count: statistics.followers.filter((f) => f.status === 'success' && typeof f.profitLoss === 'number' && f.profitLoss > 0 && f.profitLoss <= 100).length
                                    },
                                    {
                                      range: 'Profit >$100',
                                      count: statistics.followers.filter((f) => f.status === 'success' && typeof f.profitLoss === 'number' && f.profitLoss > 100).length
                                    }
                                  ]}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="range" angle={-45} textAnchor="end" height={100} />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#3b82f6" />
                                </RechartsBarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Filters and Export */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex flex-wrap gap-3 flex-1">
                          <div className="flex-1 min-w-[200px]">
                            <Input
                              placeholder="Search by email, account ID, or strategy..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <Select value={filterStrategy} onValueChange={setFilterStrategy}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Filter by Strategy" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Strategies</SelectItem>
                              {strategies.map((strategy) => (
                                <SelectItem key={strategy.strategyId} value={strategy.strategyId}>
                                  {strategy.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="success">Active</SelectItem>
                              <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="balance">Balance</SelectItem>
                              <SelectItem value="equity">Equity</SelectItem>
                              <SelectItem value="profitLoss">Profit/Loss</SelectItem>
                              <SelectItem value="marginLevel">Margin Level</SelectItem>
                              <SelectItem value="accountAge">Account Age</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={autoRefresh}
                              onCheckedChange={setAutoRefresh}
                              id="auto-refresh"
                            />
                            <Label htmlFor="auto-refresh" className="text-sm">
                              Auto-refresh
                            </Label>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              exportToCSV(
                                filteredAndSortedFollowers,
                                statistics.totals,
                                statistics.performance,
                                statistics.risk,
                                statistics.trading
                              )
                            }
                          >
                            Export CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              exportToPDF(
                                filteredAndSortedFollowers,
                                statistics.totals,
                                statistics.performance,
                                statistics.risk,
                                statistics.trading
                              )
                            }
                          >
                            Export PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Data Table */}
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Account ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Balance
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Equity
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Margin
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Free Margin
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Margin Level
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              P/L
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Positions
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Age (days)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredAndSortedFollowers.map((follower, index) => (
                            <tr
                              key={follower.accountId}
                              className={`hover:bg-muted/50 transition-colors ${
                                index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                              }`}
                            >
                              <td className="px-4 py-3 text-sm font-medium break-all">
                                {follower.email}
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-xs break-all">
                                {follower.accountId.substring(0, 8)}...
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {follower.status === 'success'
                                  ? new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: follower.currency || 'USD',
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    }).format(follower.balance)
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {follower.status === 'success'
                                  ? new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: follower.currency || 'USD',
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    }).format(follower.equity)
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {follower.status === 'success'
                                  ? new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: follower.currency || 'USD',
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    }).format(follower.margin)
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {follower.status === 'success'
                                  ? new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: follower.currency || 'USD',
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    }).format(follower.freeMargin)
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {follower.status === 'success' && follower.marginLevel != null && follower.marginLevel > 0
                                  ? `${follower.marginLevel.toFixed(2)}%`
                                  : '—'}
                              </td>
                              <td className="px-4 py-3">
                                {follower.status === 'success' ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="destructive"
                                    title={follower.error || 'Failed to fetch'}
                                  >
                                    Error
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {follower.status === 'success' && typeof follower.profitLoss === 'number'
                                  ? (
                                      <span className={follower.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency: follower.currency || 'USD',
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        }).format(follower.profitLoss)}
                                      </span>
                                    )
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {follower.status === 'success' && typeof follower.openPositions === 'number'
                                  ? follower.openPositions
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {typeof follower.accountAge === 'number' ? follower.accountAge : '—'}
                              </td>
                              <td className="px-4 py-3">
                                {follower.status === 'success' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedFollowerForHistory({
                                        accountId: follower.accountId,
                                        userId: follower.userId,
                                        strategyId: follower.strategyId,
                                        accountName: follower.email
                                      })
                                      setShowHistoryModal(true)
                                    }}
                                  >
                                    <BarChart className="h-4 w-4 mr-2" />
                                    View History
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {filteredAndSortedFollowers.length === 0 && statistics.followers.length > 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No followers match the current filters</p>
                    </div>
                  )}
                  {statistics.followers.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No follower statistics available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FinancialManagementTab />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceCalendarTab />
        </TabsContent>
      </Tabs>

      {/* Trade History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trade History</DialogTitle>
          </DialogHeader>
          {selectedFollowerForHistory && (
            <TradeHistoryViewer
              accountId={selectedFollowerForHistory.accountId}
              userId={selectedFollowerForHistory.userId}
              strategyId={selectedFollowerForHistory.strategyId}
              accountName={selectedFollowerForHistory.accountName}
              onClose={() => setShowHistoryModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

