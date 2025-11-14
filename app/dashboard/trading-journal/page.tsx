'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardDecorativeOrb } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/ui/stats-card'
import { Skeleton } from '@/components/ui/skeleton'
import { createTrade, getTradesByAccount, updateTrade, deleteTrade } from '@/lib/tradeService'
import { 
  PlusIcon, 
  EditIcon, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Database,
  Upload,
  Image,
  FileText,
  Brain,
  Zap,
  Eye,
  Save,
  X,
  Calculator,
  Activity,
  PieChart,
  BookOpen,
  Info,
  Settings,
  User,
  ChevronUp,
  ChevronDown,
  History
} from 'lucide-react'
import { CURRENCY_PAIRS, calculatePips, calculateProfit, getCategoryIcon, getPriceColor, formatRealPrice, getCurrencyPair } from '@/lib/currencyDatabase'
import { CurrencyDatabaseService } from '@/lib/currencyDatabaseService'
import { Trade, ICTAnalysis } from '@/types/trade'
import { useAuth } from '@/contexts/AuthContext'
import { AccountSelector } from '@/components/dashboard/account-selector'
import { getUserLinkedAccounts, getActiveAccount, LinkedAccount } from '@/lib/accountService'
import { useRouter } from 'next/navigation'
import { getActivePromotions } from '@/lib/promotionService'
import { Promotion } from '@/types/promotion'
import PromotionBanner from '@/components/promotions/promotion-banner'
import { RefreshCw, Zap as ZapIcon, Calendar as CalendarIcon, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Checkbox } from '@/components/ui/checkbox'

function TradingJournalPageContent() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  
  // Account state
  const [activeAccount, setActiveAccount] = useState<LinkedAccount | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set()) // Multiple account selection
  const [accountsLoading, setAccountsLoading] = useState(false)
  
  // Promotions state
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [promotionsLoading, setPromotionsLoading] = useState(false)
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  
  // Currency pairs state
  const [currencyPairs, setCurrencyPairs] = useState<any[]>([])
  const [isAddingTrade, setIsAddingTrade] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set())
  
  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncDateRange, setSyncDateRange] = useState<'default' | 'custom' | 'all'>('default')
  const [syncStartDate, setSyncStartDate] = useState<string>('')
  const [syncEndDate, setSyncEndDate] = useState<string>('')
  const [showFullSyncModal, setShowFullSyncModal] = useState(false)
  const [fullSyncStartDate, setFullSyncStartDate] = useState<Date | null>(null)
  const [fullSyncEndDate, setFullSyncEndDate] = useState<Date | null>(new Date())
  // Multi-account sync state
  const [syncAccountIds, setSyncAccountIds] = useState<Set<string>>(new Set()) // Accounts to sync
  const [syncProgress, setSyncProgress] = useState<Map<string, {status: 'syncing' | 'success' | 'error', message: string, summary?: {tradesImported?: number, tradesUpdated?: number}}>>(new Map())
  
  // Search and sorting state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // Newest first by default

  // Function to load currency pairs
  const loadCurrencyPairs = async () => {
    if (!authUser?.uid) return
    
    try {
      const pairs = await CurrencyDatabaseService.getCurrencyPairs(authUser.uid)
      // Ensure all pairs have pipDisplayMultiplier field
      const pairsWithMultiplier = pairs.map(pair => ({
        ...pair,
        pipDisplayMultiplier: pair.pipDisplayMultiplier || 1
      }))
      setCurrencyPairs(pairsWithMultiplier)
      console.log('Trading Journal: Loaded currency pairs:', pairsWithMultiplier.length)
    } catch (error) {
      console.error('Error loading currency pairs:', error)
      // Fallback to static data
      setCurrencyPairs(CURRENCY_PAIRS)
    }
  }

  // Load accounts
  const loadAccounts = async () => {
    if (!authUser?.uid) return
    
    try {
      setAccountsLoading(true)
      const accounts = await getUserLinkedAccounts(authUser.uid)
      setLinkedAccounts(accounts)
      
      const active = await getActiveAccount(authUser.uid)
      setActiveAccount(active)
      
      // Restore selected accounts from localStorage (shared with closed trades page)
      try {
        const stored = localStorage.getItem('trading-journal-selected-accounts')
        if (stored) {
          const storedIds = JSON.parse(stored) as string[]
          // Only restore accounts that still exist
          const validIds = storedIds.filter(id => accounts.some(acc => acc.id === id))
          if (validIds.length > 0) {
            setSelectedAccountIds(new Set(validIds))
            setSyncAccountIds(new Set(validIds)) // Initialize sync accounts
            return
          }
        }
      } catch (e) {
        console.warn('Error reading selected accounts from localStorage:', e)
      }
      
      // Initialize selected accounts - default to active account, or all if none active
      if (active) {
        setSelectedAccountIds(new Set([active.id]))
        setSyncAccountIds(new Set([active.id])) // Initialize sync accounts
      } else if (accounts.length > 0) {
        // If no active account but accounts exist, select all
        setSelectedAccountIds(new Set(accounts.map(acc => acc.id)))
        setSyncAccountIds(new Set(accounts.map(acc => acc.id))) // Initialize sync accounts
      }
      
      // Load lastSyncAt from account
      if (active?.id) {
        try {
          const response = await fetch(`/api/accounts/${active.id}/sync`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': authUser.uid,
              'x-user-email': authUser.email || '',
            },
          })
          if (response.ok) {
            const data = await response.json()
            if (data.account?.lastSyncAt) {
              setLastSyncAt(data.account.lastSyncAt)
            }
          }
        } catch (error) {
          console.error('Error loading lastSyncAt:', error)
          // Non-critical, continue
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
      toast.error('Failed to load accounts')
    } finally {
      setAccountsLoading(false)
    }
  }

  // Save selected accounts to localStorage whenever they change (shared with closed trades page)
  useEffect(() => {
    if (selectedAccountIds.size > 0) {
      try {
        localStorage.setItem('trading-journal-selected-accounts', JSON.stringify(Array.from(selectedAccountIds)))
      } catch (e) {
        console.warn('Error saving selected accounts to localStorage:', e)
      }
    }
  }, [selectedAccountIds])

  // Function to load trades - supports multiple accounts
  const loadTrades = async () => {
    if (selectedAccountIds.size === 0 || !authUser?.uid) {
      console.log('Trading Journal: No accounts selected, clearing trades')
      setTrades([])
      return
    }

    try {
      console.log(`Trading Journal: Loading trades for ${selectedAccountIds.size} account(s)`)
      setTradesLoading(true)
      
      // Load trades from all selected accounts
      const allTrades: Trade[] = []
      
      for (const accountLinkId of selectedAccountIds) {
        const account = linkedAccounts.find(acc => acc.id === accountLinkId)
        if (!account) continue
        
        // Get the actual MT5 account ID
        let accountId = account.mt5AccountId
        if (!accountId && account.copyTradingAccountId) {
          // For copy trading, get the MetaAPI account ID from master strategy
          try {
            const { listUserCopyTradingAccounts } = await import('@/lib/copyTradingRepo')
            const { getMasterStrategy } = await import('@/lib/copyTradingRepo')
            const copyAccounts = await listUserCopyTradingAccounts(authUser.uid)
            const copyAccount = copyAccounts.find(acc => acc.accountId === account.copyTradingAccountId)
            if (copyAccount) {
              const masterStrategy = await getMasterStrategy(copyAccount.strategyId)
              accountId = masterStrategy?.accountId
            }
          } catch (error) {
            console.error('Error getting account ID for copy trading:', error)
          }
        }

        if (!accountId) {
          console.log(`Trading Journal: No account ID found for ${accountLinkId}`)
          continue
        }

        try {
          console.log(`Trading Journal: Loading trades for account ${accountId} (${account.accountName})`)
          const accountTrades = await getTradesByAccount(authUser.uid, accountId)
          console.log(`Trading Journal: Loaded ${accountTrades.length} trades for account ${accountId}`)
          
          // Filter out any invalid trades
          const validTrades = accountTrades.filter(trade => 
            trade && typeof trade === 'object' && trade.id && trade.id.trim() !== ''
          )
          
          // Add account info to each trade for filtering
          allTrades.push(...validTrades.map(trade => ({
            ...trade,
            accountLinkId: account.id,
            accountName: account.accountName
          })))
        } catch (error) {
          console.error(`Trading Journal: Error loading trades for account ${accountId}:`, error)
        }
      }
      
      // Remove duplicates based on trade ID (in case same trade appears in multiple accounts)
      const uniqueTrades = Array.from(
        new Map(allTrades.map(trade => [trade.id, trade])).values()
      )
      
      console.log(`Trading Journal: Total unique trades loaded: ${uniqueTrades.length} from ${selectedAccountIds.size} account(s)`)
      setTrades(uniqueTrades)
    } catch (error) {
      console.error('Trading Journal: Error loading trades from Firestore:', error)
      setTrades([])
    } finally {
      setTradesLoading(false)
      setIsInitialized(true)
    }
  }

  // Load accounts on mount
  useEffect(() => {
    loadAccounts()
  }, [authUser?.uid])

  // Load trades from Firestore when selected accounts change
  useEffect(() => {
    if (selectedAccountIds.size > 0 && linkedAccounts.length > 0) {
      loadTrades()
    }
  }, [selectedAccountIds, linkedAccounts.length, authUser?.uid])

  // Reload trades when component becomes visible (user navigates back to page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedAccountIds.size > 0) {
        console.log('Trading Journal: Page became visible, reloading trades')
        loadTrades()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [selectedAccountIds.size])

  // No need to save to localStorage since we're using Firestore

  // Update newTrade when account or user changes
  useEffect(() => {
    // Use first selected account or active account
    const accountToUse = linkedAccounts.find(acc => selectedAccountIds.has(acc.id)) || activeAccount
    if (accountToUse && authUser) {
      setNewTrade(prev => ({
        ...prev,
        accountId: accountToUse.mt5AccountId || accountToUse.copyTradingAccountId || '',
        accountLinkId: accountToUse.id,
        userId: authUser.uid
      }))
    }
  }, [selectedAccountIds, activeAccount, linkedAccounts, authUser])

         // Load promotions when viewing admin profiles
         useEffect(() => {
           const loadPromotions = async () => {
             
             // Only show promotions if:
             // 1. Current profile is public (isPublic === true)
             // 2. Current profile belongs to admin (userId !== authUser.uid)
             // 3. User is VIP or Guest (not admin)
             // Promotions are no longer profile-based
             if (false && 
                 authUser?.role !== 'admin' && 
                 (authUser?.role === 'vip' || authUser?.role === 'guest')) {
               
               try {
                 setPromotionsLoading(true)
                 const userRoleForPromotions = (authUser?.role as 'vip' | 'guest') || 'guest'
                 const data = await getActivePromotions(userRoleForPromotions)
                 setPromotions(data)
               } catch (error) {
                 console.error('Error loading promotions:', error)
                 // Set empty array on error to prevent the error from breaking the page
                 setPromotions([])
               } finally {
                 setPromotionsLoading(false)
               }
             } else {
               setPromotions([])
             }
           }

          if (authUser) {
            // Promotions loading can be done here if needed
          }
        }, [authUser])

  // Load currency pairs on mount
  useEffect(() => {
    loadCurrencyPairs()
  }, [authUser?.uid])

  // Filter and sort trades
  const filteredTrades = trades
    .filter(trade => {
      // Only include trades with valid IDs and basic structure
      if (!trade || typeof trade !== 'object' || !trade.id || trade.id.trim() === '') {
        if (trade && typeof trade === 'object') {
          console.warn('Trading Journal: Filtering out trade without valid ID:', trade)
        }
        return false
      }
      return true
    })
    .filter(trade => {
      // Filter by active account if available
      if (!activeAccount) return true
      // Check if trade belongs to this account
      if (activeAccount.mt5AccountId) {
        return trade.accountId === activeAccount.mt5AccountId
      }
      if (activeAccount.copyTradingAccountId) {
        // For copy trading, we'd need to check the accountId after resolving master strategy
        // For now, include all trades for the user
        return trade.userId === authUser?.uid
      }
      return trade.userId === authUser?.uid
    })
    .filter(trade => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        trade.pair.toLowerCase().includes(query) ||
        trade.type.toLowerCase().includes(query) ||
        trade.status.toLowerCase().includes(query) ||
        trade.notes?.toLowerCase().includes(query) ||
        trade.ictAnalysis?.notes?.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'date':
          // Sort by date first, then by time, then by creation time for most recent first
          const aDateTime = new Date(`${a.date}T${a.time || '00:00:00'}`).getTime()
          const bDateTime = new Date(`${b.date}T${b.time || '00:00:00'}`).getTime()
          if (aDateTime === bDateTime) {
            // If same date/time, use creation time (newest first)
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
          } else {
            aValue = aDateTime
            bValue = bDateTime
          }
          break
        case 'pair':
          aValue = a.pair
          bValue = b.pair
          break
        case 'pips':
          aValue = a.pips
          bValue = b.pips
          break
        case 'profit':
          aValue = a.profit
          bValue = b.profit
          break
        case 'rr':
          aValue = a.rr
          bValue = b.rr
          break
        default:
          // Default to date sorting with improved logic
          const defaultADateTime = new Date(`${a.date}T${a.time || '00:00:00'}`).getTime()
          const defaultBDateTime = new Date(`${b.date}T${b.time || '00:00:00'}`).getTime()
          if (defaultADateTime === defaultBDateTime) {
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
          } else {
            aValue = defaultADateTime
            bValue = defaultBDateTime
          }
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  const [newTrade, setNewTrade] = useState<Trade>({
    id: '',
    pair: '',
    type: 'BUY',
    status: 'OPEN',
    entryPrice: 0,
    exitPrice: 0,
    pips: 0,
    profit: 0,
    rr: 0,
    risk: 0,
    lotSize: 0.1,
    result: 0,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    notes: '',
    source: 'MANUAL',
    accountId: activeAccount?.mt5AccountId || activeAccount?.copyTradingAccountId || '',
    accountLinkId: activeAccount?.id || '',
    userId: authUser?.uid || '',
    ictAnalysis: {
      timeframe: '',
      context: '',
      lowTimeframe: '',
      fvg: '',
      breaker: '',
      sellSide: '',
      buySide: '',
      sessionKillZone: '',
      entry: '',
      notes: ''
    }
  })

  const [chartFile, setChartFile] = useState<File | null>(null)
  const [chartPreview, setChartPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Professional calculation function
  const calculateTradeResult = (trade: Trade) => {
    console.log('Trading Journal: Calculating trade result for:', {
      pair: trade.pair,
      type: trade.type,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      lotSize: trade.lotSize,
      risk: trade.risk
    })

    if (!trade.pair || !trade.entryPrice || !trade.exitPrice) {
      console.log('Trading Journal: Missing required fields, returning zeros')
      return { pips: 0, profit: 0, rr: 0, result: 0 }
    }

    // First try to get from loaded currency pairs (with pipDisplayMultiplier)
    let pairData = currencyPairs.find(pair => pair.symbol === trade.pair)
    
    // Fallback to getCurrencyPair function if not found in loaded pairs
    if (!pairData) {
      pairData = getCurrencyPair(trade.pair)
    }
    
    if (!pairData) {
      console.log('Trading Journal: Pair data not found for:', trade.pair)
      return { pips: 0, profit: 0, rr: 0, result: 0 }
    }

    console.log('Trading Journal: Using pair data:', pairData.symbol, 'pipDisplayMultiplier:', pairData.pipDisplayMultiplier)

    // Calculate pips based on trade direction
    let pips = 0
    if (trade.type === 'BUY') {
      // For BUY: profit when exit > entry
      pips = calculatePips(trade.entryPrice, trade.exitPrice, trade.pair)
      console.log('Trading Journal: BUY trade - Entry:', trade.entryPrice, 'Exit:', trade.exitPrice, 'Pips:', pips)
    } else {
      // For SELL: profit when exit < entry (reverse the calculation)
      pips = calculatePips(trade.exitPrice, trade.entryPrice, trade.pair)
      console.log('Trading Journal: SELL trade - Entry:', trade.entryPrice, 'Exit:', trade.exitPrice, 'Pips:', pips)
    }

    // Calculate profit based on lot size using actual pips and loaded currency pair data
    // Use the pipValue from the currency database for ALL categories (indices, forex, commodities, crypto)
    const profitPerPip = pairData.pipValue
    
    const profit = pips * profitPerPip * trade.lotSize
    console.log('Trading Journal: Calculated profit using loaded pair data:', {
      actualPips: pips,
      profitPerPip,
      lotSize: trade.lotSize,
      calculatedProfit: profit,
      pairData: pairData.symbol,
      category: pairData.category
    })
    
    // Calculate R:R ratio
    const rr = trade.risk > 0 ? Math.abs(pips) / trade.risk : 0
    console.log('Trading Journal: Calculated R:R:', rr)

    // Apply pip display multiplier for result display
    const pipDisplayMultiplier = pairData.pipDisplayMultiplier || 1
    const displayPips = Math.round(pips * pipDisplayMultiplier)
    const result = displayPips

    console.log('Trading Journal: Final calculations:', { 
      actualPips: pips, 
      pipDisplayMultiplier, 
      displayPips, 
      profit: `${profit} (based on actual pips: ${pips})`, 
      rr, 
      result 
    })
    return { pips, profit, rr, result }
  }

  // Auto-calculate when prices change
  const updateCalculations = (trade: Trade) => {
    const calculations = calculateTradeResult(trade)
    setNewTrade(prev => ({
      ...prev,
      ...calculations
    }))
  }

  // Handle chart upload
  const handleChartUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0]
      console.log('Trading Journal: Chart upload triggered, file:', file)
      if (file) {
        if (file.type.startsWith('image/')) {
          console.log('Trading Journal: Valid image file, processing...')
          setChartFile(file)
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result as string
            console.log('Trading Journal: Chart preview set:', result ? 'Yes' : 'No')
            setChartPreview(result)
          }
          reader.onerror = () => {
            console.error('Trading Journal: Error reading file')
            alert('Error reading the image file')
          }
          reader.readAsDataURL(file)
        } else {
          console.log('Trading Journal: Invalid file type:', file.type)
          alert('Please upload an image file (PNG, JPG, etc.)')
        }
      } else {
        console.log('Trading Journal: No file selected')
      }
    } catch (error) {
      console.error('Trading Journal: Error in chart upload:', error)
      alert('Error uploading chart. Please try again.')
    }
  }

  // Handle incremental sync (default - only new trades since last sync)
  const handleIncrementalSync = async () => {
    // Determine which accounts to sync
    const accountsToSync = syncAccountIds.size > 0 
      ? Array.from(syncAccountIds).filter(id => selectedAccountIds.has(id))
      : Array.from(selectedAccountIds)
    
    if (accountsToSync.length === 0 || !authUser?.uid) {
      toast.error('Please select at least one account to sync')
      return
    }

    setSyncing(true)
    setSyncProgress(new Map())
    
    const results: Array<{accountId: string, accountName: string, success: boolean, summary?: any, error?: string}> = []
    
    // Sync each account sequentially
    for (const accountLinkId of accountsToSync) {
      const account = linkedAccounts.find(acc => acc.id === accountLinkId)
      if (!account) continue
      
      try {
        // Update progress - syncing
        setSyncProgress(prev => new Map(prev).set(accountLinkId, {
          status: 'syncing',
          message: `Syncing ${account.accountName}...`
        }))
        
        const response = await fetch(`/api/accounts/${accountLinkId}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': authUser.uid,
            'x-user-email': authUser.email || '',
          },
          body: JSON.stringify({
            mode: 'incremental'
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Sync failed')
        }

        // Update progress - success
        setSyncProgress(prev => new Map(prev).set(accountLinkId, {
          status: 'success',
          message: `Completed: ${data.summary?.tradesImported || 0} imported, ${data.summary?.tradesUpdated || 0} updated`,
          summary: {
            tradesImported: data.summary?.tradesImported || 0,
            tradesUpdated: data.summary?.tradesUpdated || 0
          }
        }))
        
        results.push({
          accountId: accountLinkId,
          accountName: account.accountName,
          success: true,
          summary: data.summary
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sync trades'
        // Update progress - error
        setSyncProgress(prev => new Map(prev).set(accountLinkId, {
          status: 'error',
          message: `Failed: ${errorMessage}`
        }))
        
        results.push({
          accountId: accountLinkId,
          accountName: account.accountName,
          success: false,
          error: errorMessage
        })
      }
    }
    
    // Show summary toast
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    if (successCount > 0 && failCount === 0) {
      const totalImported = results.reduce((sum, r) => sum + (r.summary?.tradesImported || 0), 0)
      const totalUpdated = results.reduce((sum, r) => sum + (r.summary?.tradesUpdated || 0), 0)
      toast.success(
        `${successCount} account${successCount > 1 ? 's' : ''} synced: ${totalImported} imported, ${totalUpdated} updated`
      )
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(
        `${successCount} account${successCount > 1 ? 's' : ''} synced successfully, ${failCount} failed`
      )
    } else {
      toast.error(`All syncs failed`)
    }
    
    // Reload trades after all syncs complete
    await loadTrades()
    
    // Update last sync time
    setLastSyncAt(new Date().toISOString())
    
    setSyncing(false)
  }

  // Handle full sync - opens modal for date selection
  const handleFullSyncClick = () => {
    // Determine which accounts to sync
    const accountsToSync = syncAccountIds.size > 0 
      ? Array.from(syncAccountIds).filter(id => selectedAccountIds.has(id))
      : Array.from(selectedAccountIds)
    
    if (accountsToSync.length === 0 || !authUser?.uid) {
      toast.error('Please select at least one account to sync')
      return
    }
    
    setShowFullSyncModal(true)
    // Set default dates
    if (!fullSyncStartDate) {
      setFullSyncStartDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) // 1 year ago
    }
    if (!fullSyncEndDate) {
      setFullSyncEndDate(new Date())
    }
  }

  // Execute full sync with selected date range
  const executeFullSync = async (dateRange: 'default' | 'custom' | 'all', startDate?: Date, endDate?: Date) => {
    // Determine which accounts to sync
    const accountsToSync = syncAccountIds.size > 0 
      ? Array.from(syncAccountIds).filter(id => selectedAccountIds.has(id))
      : Array.from(selectedAccountIds)
    
    if (accountsToSync.length === 0 || !authUser?.uid) {
      toast.error('Please select at least one account to sync')
      return
    }

    setSyncing(true)
    setShowFullSyncModal(false)
    setSyncProgress(new Map())
    
    // Prepare date range based on selection
    let startDateStr: string | null = null
    let endDateStr: string | null = null
    
    if (dateRange === 'all') {
      startDateStr = 'all'
    } else if (dateRange === 'custom' && startDate && endDate) {
      startDateStr = startDate.toISOString().split('T')[0]
      endDateStr = endDate.toISOString().split('T')[0]
    }
    // For 'default', don't send dates (API will use 1-year default for full sync)
    
    const results: Array<{accountId: string, accountName: string, success: boolean, summary?: any, error?: string}> = []
    
    // Sync each account sequentially
    for (const accountLinkId of accountsToSync) {
      const account = linkedAccounts.find(acc => acc.id === accountLinkId)
      if (!account) continue
      
      try {
        // Update progress - syncing
        setSyncProgress(prev => new Map(prev).set(accountLinkId, {
          status: 'syncing',
          message: `Syncing ${account.accountName}...`
        }))
        
        const response = await fetch(`/api/accounts/${accountLinkId}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': authUser.uid,
            'x-user-email': authUser.email || '',
          },
          body: JSON.stringify({
            mode: 'full',
            startDate: startDateStr,
            endDate: endDateStr
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Sync failed')
        }

        // Update progress - success
        setSyncProgress(prev => new Map(prev).set(accountLinkId, {
          status: 'success',
          message: `Completed: ${data.summary?.tradesImported || 0} imported, ${data.summary?.tradesUpdated || 0} updated`,
          summary: {
            tradesImported: data.summary?.tradesImported || 0,
            tradesUpdated: data.summary?.tradesUpdated || 0
          }
        }))
        
        results.push({
          accountId: accountLinkId,
          accountName: account.accountName,
          success: true,
          summary: data.summary
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sync trades'
        // Update progress - error
        setSyncProgress(prev => new Map(prev).set(accountLinkId, {
          status: 'error',
          message: `Failed: ${errorMessage}`
        }))
        
        results.push({
          accountId: accountLinkId,
          accountName: account.accountName,
          success: false,
          error: errorMessage
        })
      }
    }
    
    // Show summary toast
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    if (successCount > 0 && failCount === 0) {
      const totalImported = results.reduce((sum, r) => sum + (r.summary?.tradesImported || 0), 0)
      const totalUpdated = results.reduce((sum, r) => sum + (r.summary?.tradesUpdated || 0), 0)
      toast.success(
        `${successCount} account${successCount > 1 ? 's' : ''} synced: ${totalImported} imported, ${totalUpdated} updated`
      )
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(
        `${successCount} account${successCount > 1 ? 's' : ''} synced successfully, ${failCount} failed`
      )
    } else {
      toast.error(`All syncs failed`)
    }
    
    // Reload trades after all syncs complete
    await loadTrades()
    
    // Update last sync time
    setLastSyncAt(new Date().toISOString())
    
    setSyncing(false)
  }

  const handleAddTrade = () => {
    if (isAddingTrade) {
      setIsAddingTrade(false)
      setEditingTrade(null)
      setNewTrade({
        id: '',
        pair: '',
        type: 'BUY',
        status: 'OPEN',
        entryPrice: 0,
        exitPrice: 0,
        pips: 0,
        profit: 0,
        rr: 0,
        risk: 0,
        lotSize: 0.1,
        result: 0,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        notes: '',
        source: 'MANUAL',
        accountId: activeAccount?.mt5AccountId || activeAccount?.copyTradingAccountId || '',
        accountLinkId: activeAccount?.id || '',
        userId: authUser?.uid || '',
        tradingViewLink: '',
        ictAnalysis: {
          timeframe: '',
          context: '',
          lowTimeframe: '',
          fvg: '',
          breaker: '',
          sellSide: '',
          buySide: '',
          sessionKillZone: '',
          entry: '',
          notes: ''
        }
      })
      setChartFile(null)
      setChartPreview(null)
    } else {
      setIsAddingTrade(true)
      setEditingTrade(null)
    }
  }

  const handleSaveTrade = async () => {
    console.log('Trading Journal: handleSaveTrade called')
    
    // Basic validation
    if (!newTrade.pair || !newTrade.entryPrice || !newTrade.exitPrice) {
      alert('Please fill in all required fields (Pair, Entry Price, Exit Price)')
      return
    }

    if (!activeAccount?.id || !authUser?.uid) {
      alert('Account or user information missing')
      return
    }
    
    // Additional validation for numeric values
    if (isNaN(newTrade.entryPrice) || isNaN(newTrade.exitPrice) || newTrade.entryPrice <= 0 || newTrade.exitPrice <= 0) {
      alert('Please enter valid entry and exit prices')
      return
    }
    
    try {
      // Create a fresh trade object with only the input data (no calculated values)
      const freshTradeData = {
        id: newTrade.id,
        pair: newTrade.pair,
        type: newTrade.type,
        status: newTrade.status,
        entryPrice: newTrade.entryPrice,
        exitPrice: newTrade.exitPrice,
        lotSize: newTrade.lotSize,
        risk: newTrade.risk,
        date: newTrade.date,
        time: newTrade.time,
        notes: newTrade.notes,
        source: newTrade.source,
        chartImage: newTrade.chartImage,
        tradingViewLink: newTrade.tradingViewLink,
        ictAnalysis: newTrade.ictAnalysis
      }
      
      // Recalculate the correct values using fresh data
      const correctCalculation = calculateTradeResult(freshTradeData as Trade)
      console.log('Trading Journal: Recalculated correct values before save:', correctCalculation)
      
      // Validate calculation results
      if (isNaN(correctCalculation.pips) || isNaN(correctCalculation.profit) || isNaN(correctCalculation.result)) {
        console.error('Trading Journal: Invalid calculation results:', correctCalculation)
        alert('Error: Unable to calculate trade results. Please check your input values.')
        return
      }
      
      // Create trade data with correct calculations
      const tradeDataToSave = {
        ...freshTradeData,
        pips: correctCalculation.pips,
        profit: correctCalculation.profit,
        rr: correctCalculation.rr,
        result: correctCalculation.result,
        accountId: activeAccount.mt5AccountId || activeAccount.copyTradingAccountId || '',
        accountLinkId: activeAccount.id,
        userId: authUser.uid
      }
      
      console.log('Trading Journal: Final trade data to save:', tradeDataToSave)
      
      if (editingTrade) {
        // Update existing trade
        console.log('Trading Journal: Updating existing trade')
        const updateData = { ...tradeDataToSave }
        
        // Only add chartImage if it exists
        if (chartPreview) {
          updateData.chartImage = chartPreview
        } else if (newTrade.chartImage && newTrade.chartImage.trim() !== '') {
          updateData.chartImage = newTrade.chartImage
        }
        // Only add tradingViewLink if it exists and is not empty
        if (newTrade.tradingViewLink && newTrade.tradingViewLink.trim() !== '') {
          updateData.tradingViewLink = newTrade.tradingViewLink
        }
        
        await updateTrade(editingTrade.id, updateData)
        
        const updatedTrade: Trade = {
          ...tradeDataToSave,
          id: editingTrade.id
        }
        
        if (chartPreview) {
          updatedTrade.chartImage = chartPreview
        } else if (newTrade.chartImage) {
          updatedTrade.chartImage = newTrade.chartImage
        }
        if (newTrade.tradingViewLink) {
          updatedTrade.tradingViewLink = newTrade.tradingViewLink
        }
        
        setTrades(trades.map(trade => 
          trade.id === editingTrade.id ? updatedTrade : trade
        ))
        setEditingTrade(null)
      } else {
        // Add new trade
        const tradeData = { ...tradeDataToSave }
        
        // Only add chartImage if chartPreview exists
        if (chartPreview) {
          tradeData.chartImage = chartPreview
        }
        // Only add tradingViewLink if it exists and is not empty
        if (newTrade.tradingViewLink && newTrade.tradingViewLink.trim() !== '') {
          tradeData.tradingViewLink = newTrade.tradingViewLink
        }
        
        console.log('Trading Journal: Creating new trade:', tradeData)
        
        if (!tradeData.pair || !tradeData.entryPrice || !tradeData.exitPrice || !tradeData.userId) {
          console.error('Trading Journal: Missing required fields in trade data:', tradeData)
          alert('Error: Missing required trade information. Please try again.')
          return
        }
        
        const createdTrade = await createTrade(tradeData)
        console.log('Trading Journal: Trade created successfully:', createdTrade)
        
        if (!createdTrade) {
          console.error('Trading Journal: createTrade returned null/undefined')
          alert('Error: Trade creation failed. Please try again.')
          return
        }
        
        if (!createdTrade || typeof createdTrade !== 'object' || !createdTrade.id || createdTrade.id.trim() === '') {
          console.error('Trading Journal: Created trade is invalid:', createdTrade)
          alert('Error: Trade was created but is invalid. Please refresh the page.')
          return
        }
        
        console.log('Trading Journal: Adding valid trade to state:', createdTrade)
        const tradeForState = {
          ...tradeDataToSave,
          id: createdTrade.id
        }
        setTrades([tradeForState, ...trades])
        console.log('Trading Journal: Trades state updated')
      }
      
      // Reset form
      console.log('Trading Journal: Resetting form, activeAccount:', activeAccount)
      setNewTrade({
        id: '',
        pair: '',
        type: 'BUY',
        status: 'OPEN',
        entryPrice: 0,
        exitPrice: 0,
        pips: 0,
        profit: 0,
        rr: 0,
        risk: 0,
        lotSize: 0.1,
        result: 0,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        notes: '',
        source: 'MANUAL',
        accountId: activeAccount?.mt5AccountId || activeAccount?.copyTradingAccountId || '',
        accountLinkId: activeAccount?.id || '',
        userId: authUser?.uid || '',
        tradingViewLink: '',
        ictAnalysis: {
          timeframe: '',
          context: '',
          lowTimeframe: '',
          fvg: '',
          breaker: '',
          sellSide: '',
          buySide: '',
          sessionKillZone: '',
          entry: '',
          notes: ''
        }
      })
      setChartFile(null)
      setChartPreview(null)
      setIsAddingTrade(false)
      
    } catch (error) {
      console.error('Trading Journal: Error saving trade:', error)
      alert('Failed to save trade. Please try again.')
      return
    }
  }

  const handleEditTrade = (trade: Trade) => {
    console.log('Trading Journal: Editing trade:', trade)
    console.log('Trading Journal: Trade chart image:', trade.chartImage)
    console.log('Trading Journal: Trade TradingView link:', trade.tradingViewLink)
    setEditingTrade(trade)
    setIsAddingTrade(true)
    setNewTrade(trade)
    if (trade.chartImage) {
      console.log('Trading Journal: Setting chart preview from existing trade')
      setChartPreview(trade.chartImage)
    } else {
      console.log('Trading Journal: No existing chart image, clearing preview')
      setChartPreview(null)
    }
    setChartFile(null) // Clear any file input
  }

  const handleDeleteTrade = async (tradeId: string) => {
    try {
      console.log('Trading Journal: Deleting trade:', tradeId)
      await deleteTrade(tradeId)
      console.log('Trading Journal: Trade deleted successfully')
      
      // Remove from local state
      setTrades(trades.filter(trade => trade.id !== tradeId))
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Trading Journal: Error deleting trade:', error)
      alert('Failed to delete trade. Please try again.')
    }
  }

        const handleStatusChange = async (tradeId: string, newStatus: string) => {
          try {
            console.log('Trading Journal: Starting status change for trade:', tradeId, 'to status:', newStatus)
            
            // Validate tradeId
            if (!tradeId || tradeId.trim() === '') {
              console.error('Trading Journal: Invalid trade ID:', tradeId)
              console.error('Trading Journal: Available trade IDs:', trades.map(t => t.id))
              alert('Error: Invalid trade ID. Please refresh the page and try again.')
              return
            }
            
            const trade = trades.find(t => t.id === tradeId)
            if (!trade) {
              console.error('Trading Journal: Trade not found:', tradeId)
              console.error('Available trade IDs:', trades.map(t => t.id))
              alert('Error: Trade not found. Please refresh the page and try again.')
              return
            }
            
            // Ensure the trade has a valid ID
            if (!trade.id || trade.id.trim() === '') {
              console.error('Trading Journal: Trade has no valid ID:', trade)
              alert('Error: Trade has no valid ID. Please refresh the page and try again.')
              return
            }

            let updatedTrade = { ...trade }
            
            // ALWAYS recalculate the original pips from entry/exit prices
            // This ensures we get the correct pips regardless of current status
            const originalCalculations = calculateTradeResult({
              ...trade,
              status: 'OPEN' // Use OPEN status to get pure calculation
            })
            const originalPips = originalCalculations.pips
            
            console.log('Trading Journal: Original pips calculation from entry/exit prices:', originalPips)
            console.log('Trading Journal: Entry price:', trade.entryPrice, 'Exit price:', trade.exitPrice)
            
            // Update status and calculate result based on new status
            if (newStatus === 'OPEN') {
              updatedTrade.status = 'OPEN'
              updatedTrade.result = 0 // Reset result for open trades
              updatedTrade.profit = 0 // Reset profit for open trades
              // Keep original pips for future calculations
              updatedTrade.pips = originalPips
            } else if (newStatus === 'CLOSE' || newStatus === 'CLOSED') {
              updatedTrade.status = 'CLOSED'
              // Use original pips for wins
              updatedTrade.pips = originalPips
              updatedTrade.result = originalPips
              // Calculate profit using the proper function
              updatedTrade.profit = calculateProfit(trade.entryPrice, trade.exitPrice, trade.lotSize, trade.pair)
            } else if (newStatus === 'LOSS') {
              updatedTrade.status = 'LOSS' // Keep as LOSS status
              // For losses, use the risk amount as negative pips
              const lossPips = -Math.abs(trade.risk || 0)
              updatedTrade.pips = lossPips
              updatedTrade.result = lossPips
              // Calculate profit based on risk amount using proper pip value
              const pair = getCurrencyPair(trade.pair)
              let profitPerPip: number
              if (pair?.category === 'indices') {
                profitPerPip = 1.0 // $1 per point for indices
              } else {
                profitPerPip = pair?.pipValue || 10 // Use pipValue for forex/commodities
              }
              updatedTrade.profit = Math.abs(lossPips) * profitPerPip * trade.lotSize * -1 // Make it negative
            } else if (newStatus === 'BREAKEVEN') {
              updatedTrade.status = 'BREAKEVEN' // Keep as BREAKEVEN status
              // For breakeven, pips, result and profit should be 0
              updatedTrade.pips = 0
              updatedTrade.result = 0
              updatedTrade.profit = 0
            } else {
              console.error('Trading Journal: Invalid status:', newStatus)
              return
            }

            console.log('Trading Journal: Status change calculations:')
            console.log('- Entry price:', trade.entryPrice)
            console.log('- Exit price:', trade.exitPrice)
            console.log('- Trade type:', trade.type)
            console.log('- Original pips (recalculated):', originalPips)
            console.log('- Current pips (before change):', trade.pips)
            console.log('- New status:', newStatus)
            console.log('- Calculated result:', updatedTrade.result)
            console.log('- Calculated profit:', updatedTrade.profit)
            console.log('Trading Journal: Updated trade data:', updatedTrade)
            console.log('Trading Journal: Calling updateTrade with tradeId:', tradeId)
            
            // Ensure we have a valid trade ID before calling updateTrade
            if (!tradeId || tradeId.trim() === '') {
              console.error('Trading Journal: Cannot update trade with empty ID')
              alert('Error: Cannot update trade with empty ID. Please refresh the page and try again.')
              return
            }
            
            // Only pass the fields that need to be updated
            const updateData = {
              status: updatedTrade.status,
              pips: updatedTrade.pips,
              profit: updatedTrade.profit,
              result: updatedTrade.result
            }
            
            console.log('Trading Journal: Update data being sent:', updateData)
            await updateTrade(tradeId, updateData)
            console.log('Trading Journal: Trade status updated successfully in database')
            
            // Update local state
            setTrades(prevTrades => prevTrades.map(t => t.id === tradeId ? updatedTrade : t))
            console.log('Trading Journal: Local state updated')
            
          } catch (error) {
            console.error('Trading Journal: Error updating trade status:', error)
            console.error('Error details:', error)
            alert('Failed to update trade status. Please try again.')
          }
        }

  const toggleTradeExpansion = (tradeId: string) => {
    setExpandedTrades(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tradeId)) {
        newSet.delete(tradeId)
      } else {
        newSet.add(tradeId)
      }
      return newSet
    })
  }

  const getResultIcon = (result: number) => {
    if (result > 0) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (result < 0) return <XCircle className="w-4 h-4 text-red-500" />
    return <AlertCircle className="w-4 h-4 text-yellow-500" />
  }

  const getResultColor = (result: number) => {
    if (result > 0) return 'text-green-600 dark:text-green-400'
    if (result < 0) return 'text-red-600 dark:text-red-400'
    return 'text-yellow-600 dark:text-yellow-400'
  }

  const getResultText = (result: number) => {
    // Result already contains display pips from calculateTradeResult
    if (result > 0) return `+${result.toFixed(1)} pips`
    if (result < 0) return `${result.toFixed(1)} pips`
    return 'Breakeven'
  }

  const getTypeColor = (type: string) => {
    return type === 'BUY' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'CLOSED': 
      case 'CLOSE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'LOSS': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'BREAKEVEN': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  // Calculate statistics - only from closed trades (CLOSED, LOSS, BREAKEVEN statuses)
  const closedTrades = filteredTrades.filter(t => ['CLOSED', 'LOSS', 'BREAKEVEN'].includes(t.status))
  const totalTrades = closedTrades.length
  const winTrades = closedTrades.filter(t => t.result > 0).length
  const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0
  const totalPips = closedTrades.reduce((sum, t) => sum + t.pips, 0)
  const totalProfit = closedTrades.reduce((sum, t) => sum + t.profit, 0)
  const avgRr = totalTrades > 0 ? closedTrades.reduce((sum, t) => sum + t.rr, 0) / totalTrades : 0

  // Debug: Log statistics calculation
  console.log('Trading Journal: Statistics calculation:')
  console.log('- Total trades:', totalTrades)
  console.log('- Win trades:', winTrades)
  console.log('- Win rate:', winRate)
  console.log('- Total pips:', totalPips)
  console.log('- Total profit:', totalProfit)
  console.log('- Closed trades:', closedTrades.map(t => ({ id: t.id, status: t.status, pips: t.pips, profit: t.profit, result: t.result })))


  // Loading state
  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading accounts...</p>
        </div>
      </div>
    )
  }

  // No account linked
  if (!activeAccount) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Account Linked</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please link an MT5 account or copy trading account to view and manage trades.
          </p>
          <AccountSelector 
            onAccountLinked={async () => {
              await loadAccounts()
            }}
            onAccountChanged={(accountLinkId) => {
              loadTrades()
            }}
          />
        </div>
      </div>
    )
  }

  // Debug: Log current state
  console.log('Trading Journal: Component render - activeAccount:', activeAccount?.id, 'trades count:', trades.length, 'isLoading:', tradesLoading)

  // Calculate stats for StatsCard display - Only show OPEN trades stats
  // Closed trades stats are in the Closed Trades page
  const openTradesOnly = trades.filter(t => t.status === 'OPEN')
  const allTradesCount = openTradesOnly.length
  const profitableTradesCount = openTradesOnly.filter(t => (t.profit || 0) > 0).length
  const overallWinRate = allTradesCount > 0 ? ((profitableTradesCount / allTradesCount) * 100).toFixed(0) : '0'
  const netProfit = openTradesOnly.reduce((sum, t) => sum + (t.profit || 0), 0)
  const closedTradesCount = trades.filter(t => t.status !== 'OPEN').length

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full box-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-500" />
            Trading Journal
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track and analyze your trading performance
          </p>
        </div>
        
        {/* Account selector will be shown below */}
      </div>


      {/* Account Linking & Sync */}
      <div className="space-y-4">
        <AccountSelector 
          onAccountLinked={async () => {
            // Reload accounts and trades
            await loadAccounts()
            await loadTrades()
          }}
          onAccountChanged={(accountLinkId) => {
            // Reload trades when account changes
            loadTrades()
          }}
        />
        
        {/* Multiple Account Selector */}
        {linkedAccounts.length > 1 && (
          <Card>
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-3 block">Select Accounts to View</Label>
              <div className="space-y-2">
                {linkedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`account-${account.id}`}
                      checked={selectedAccountIds.has(account.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedAccountIds)
                        if (checked) {
                          newSelected.add(account.id)
                        } else {
                          newSelected.delete(account.id)
                        }
                        setSelectedAccountIds(newSelected)
                      }}
                    />
                    <label
                      htmlFor={`account-${account.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      <div className="flex items-center justify-between">
                        <span>{account.accountName}</span>
                        <Badge variant={account.isActive ? 'default' : 'secondary'} className="ml-2">
                          {account.accountType}
                        </Badge>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                {selectedAccountIds.size === 0 
                  ? 'Select at least one account to view trades'
                  : `Viewing trades from ${selectedAccountIds.size} account${selectedAccountIds.size > 1 ? 's' : ''}`
                }
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Sync Controls */}
        {selectedAccountIds.size > 0 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Sync Trades</p>
                  {lastSyncAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last sync: {new Date(lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Account Selection for Sync */}
              {linkedAccounts.length > 1 && (
                <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Select Accounts to Sync</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSyncAccountIds(new Set(selectedAccountIds))
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSyncAccountIds(new Set())
                        }}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {linkedAccounts
                      .filter(acc => selectedAccountIds.has(acc.id))
                      .map((account) => (
                        <div key={account.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sync-account-${account.id}`}
                            checked={syncAccountIds.has(account.id)}
                            onCheckedChange={(checked) => {
                              const newSyncAccounts = new Set(syncAccountIds)
                              if (checked) {
                                newSyncAccounts.add(account.id)
                              } else {
                                newSyncAccounts.delete(account.id)
                              }
                              setSyncAccountIds(newSyncAccounts)
                            }}
                            disabled={syncing}
                          />
                          <label
                            htmlFor={`sync-account-${account.id}`}
                            className="text-sm font-medium leading-none cursor-pointer flex-1"
                          >
                            <div className="flex items-center justify-between">
                              <span>{account.accountName}</span>
                              <Badge variant={account.isActive ? 'default' : 'secondary'} className="ml-2 text-xs">
                                {account.accountType}
                              </Badge>
                            </div>
                          </label>
                        </div>
                      ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {syncAccountIds.size === 0 
                      ? 'Select at least one account to sync'
                      : `${syncAccountIds.size} account${syncAccountIds.size > 1 ? 's' : ''} selected for sync`
                    }
                  </p>
                </div>
              )}
              
              {/* Sync Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleIncrementalSync}
                  disabled={syncing || (syncAccountIds.size === 0 && linkedAccounts.length > 1)}
                  variant="default"
                  className="w-full"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing 
                    ? 'Syncing...' 
                    : linkedAccounts.length > 1 && syncAccountIds.size > 0
                      ? `Quick Sync (${syncAccountIds.size} account${syncAccountIds.size > 1 ? 's' : ''})`
                      : linkedAccounts.length > 1
                        ? 'Quick Sync (Select accounts)'
                        : 'Quick Sync'
                  }
                </Button>
                <Button
                  onClick={handleFullSyncClick}
                  disabled={syncing || (syncAccountIds.size === 0 && linkedAccounts.length > 1)}
                  variant="outline"
                  className="w-full"
                >
                  <CalendarIcon className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing 
                    ? 'Syncing...' 
                    : linkedAccounts.length > 1 && syncAccountIds.size > 0
                      ? `Full Sync (${syncAccountIds.size} account${syncAccountIds.size > 1 ? 's' : ''})`
                      : linkedAccounts.length > 1
                        ? 'Full Sync (Select accounts)'
                        : 'Full Sync'
                  }
                </Button>
              </div>
              
              {/* Sync Progress */}
              {syncProgress.size > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Label className="text-sm font-medium">Sync Progress</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Array.from(syncProgress.entries()).map(([accountId, progress]) => {
                      const account = linkedAccounts.find(acc => acc.id === accountId)
                      if (!account) return null
                      
                      return (
                        <div
                          key={accountId}
                          className={`p-2 rounded-lg border ${
                            progress.status === 'success'
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : progress.status === 'error'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {progress.status === 'syncing' && (
                              <RefreshCw className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                            )}
                            {progress.status === 'success' && (
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            )}
                            {progress.status === 'error' && (
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{account.accountName}</p>
                              <p className={`text-xs ${
                                progress.status === 'success'
                                  ? 'text-green-700 dark:text-green-300'
                                  : progress.status === 'error'
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-blue-700 dark:text-blue-300'
                              }`}>
                                {progress.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Improved Sync Mode Explanations */}
              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <ZapIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        Quick Sync
                      </p>
                      <Badge variant="default" className="bg-blue-600 text-white text-xs">
                        Recommended
                      </Badge>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      Only fetches new trades since your last sync. Fast, saves API credits, and perfect for regular updates.
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      💡 Best for: Daily updates, checking new trades
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <CalendarIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Full Sync
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                      Fetches all trades in a date range you choose. Use when you need complete historical data or after linking a new account.
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      💡 Best for: First-time setup, complete history, specific date ranges
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Promotional Offers - Only shown to VIP/Guest viewing admin profiles */}
      {promotions.length > 0 && (
        <PromotionBanner 
          promotions={promotions} 
          userRole={authUser?.role as 'vip' | 'guest'} 
        />
      )}
      
      {/* Add/Edit Trade Form - Only for editing existing trades */}
      {isAddingTrade && editingTrade && (
        <Card variant="glass">
          <CardDecorativeOrb color="green" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Brain className="w-5 h-5 mr-2 text-green-500" />
              {editingTrade ? 'Edit Trade' : 'New Trade Entry'}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fill in the trade details below. Pips and profit will be calculated automatically.
            </p>
          </CardHeader>
          <CardContent className="relative z-10 space-y-6">
            {/* Essential Trade Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pair" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Currency Pair *
                </Label>
                <Select 
                  value={newTrade.pair} 
                  onValueChange={(value) => {
                    const selectedPair = currencyPairs.find(pair => pair.symbol === value)
                    const updatedTrade = { 
                      ...newTrade, 
                      pair: value,
                      // Auto-fill smart default prices based on currency pair
                      entryPrice: selectedPair?.realPrice || 0,
                      exitPrice: selectedPair?.realPrice ? selectedPair.realPrice + (selectedPair.category === 'indices' ? 50 : 0.005) : 0
                    }
                    setNewTrade(updatedTrade)
                    updateCalculations(updatedTrade)
                  }}
                >
                  <SelectTrigger className="border-red-200 dark:border-red-800/50">
                    <SelectValue placeholder="Select currency pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyPairs.map((pair) => (
                      <SelectItem key={pair.symbol} value={pair.symbol}>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(pair.category)}
                          <span>{pair.symbol}</span>
                          <span className="text-xs text-slate-500">- {pair.name}</span>
                          {pair.pipDisplayMultiplier !== 1 && (
                            <span className="text-xs text-blue-500">×{pair.pipDisplayMultiplier}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Trade Type *
                </Label>
                <Select 
                  value={newTrade.type} 
                  onValueChange={(value) => {
                    const updatedTrade = { ...newTrade, type: value as 'BUY' | 'SELL' }
                    setNewTrade(updatedTrade)
                    updateCalculations(updatedTrade)
                  }}
                >
                  <SelectTrigger className="border-red-200 dark:border-red-800/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">🟢 BUY (Long)</SelectItem>
                    <SelectItem value="SELL">🔴 SELL (Short)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={newTrade.date}
                  onChange={(e) => setNewTrade({...newTrade, date: e.target.value})}
                  className="border-red-200 dark:border-red-800/50"
                />
              </div>
            </div>

            {/* Price Information - Most Important */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryPrice" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Entry Price *
                </Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.0001"
                  value={newTrade.entryPrice || ''}
                  onChange={(e) => {
                    const updatedTrade = { ...newTrade, entryPrice: parseFloat(e.target.value) || 0 }
                    setNewTrade(updatedTrade)
                    updateCalculations(updatedTrade)
                  }}
                  placeholder="e.g., 1.0850"
                  className="border-red-200 dark:border-red-800/50"
                />
                <p className="text-xs text-slate-500">The price you entered the trade</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitPrice" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Exit Price *
                </Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="0.0001"
                  value={newTrade.exitPrice || ''}
                  onChange={(e) => {
                    const updatedTrade = { ...newTrade, exitPrice: parseFloat(e.target.value) || 0 }
                    setNewTrade(updatedTrade)
                    updateCalculations(updatedTrade)
                  }}
                  placeholder="e.g., 1.0900"
                  className="border-red-200 dark:border-red-800/50"
                />
                <p className="text-xs text-slate-500">The price you exited the trade</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lotSize" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Lot Size *
                </Label>
                <Input
                  id="lotSize"
                  type="number"
                  step="0.01"
                  value={newTrade.lotSize || ''}
                  onChange={(e) => {
                    const updatedTrade = { ...newTrade, lotSize: parseFloat(e.target.value) || 0.1 }
                    setNewTrade(updatedTrade)
                    updateCalculations(updatedTrade)
                  }}
                  placeholder="e.g., 0.1"
                  className="border-red-200 dark:border-red-800/50"
                />
                <p className="text-xs text-slate-500">Position size in lots</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="risk" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Risk (Pips) *
                </Label>
                <Input
                  id="risk"
                  type="number"
                  value={newTrade.risk || ''}
                  onChange={(e) => {
                    const updatedTrade = { ...newTrade, risk: parseFloat(e.target.value) || 0 }
                    setNewTrade(updatedTrade)
                    updateCalculations(updatedTrade)
                  }}
                  placeholder="e.g., 20"
                  className="border-red-200 dark:border-red-800/50"
                />
                <p className="text-xs text-slate-500">Stop loss distance in pips</p>
              </div>
            </div>

            {/* Real-time Calculated Results */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-black/50 dark:to-red-900/20 rounded-lg border border-red-500/30 dark:border-red-500/50">
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Pips Result</p>
                <p className={`text-3xl font-bold ${newTrade.result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {newTrade.result >= 0 ? '+' : ''}{newTrade.result.toFixed(1)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {newTrade.result > 0 ? 'WIN' : newTrade.result < 0 ? 'LOSS' : 'BREAKEVEN'}
                  {(() => {
                    const selectedPair = currencyPairs.find(pair => pair.symbol === newTrade.pair)
                    const multiplier = selectedPair?.pipDisplayMultiplier || 1
                    if (multiplier !== 1) {
                      return ` (×${multiplier})`
                    }
                    return ''
                  })()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Profit/Loss</p>
                <p className={`text-3xl font-bold ${newTrade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${newTrade.profit >= 0 ? '+' : ''}{newTrade.profit.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">USD</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">R:R Ratio</p>
                <p className="text-3xl font-bold text-red-600">
                  {newTrade.rr.toFixed(2)}:1
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {newTrade.rr >= 1 ? 'Good Risk/Reward' : 'Low Risk/Reward'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Actual Pips</p>
                <p className={`text-2xl font-bold ${newTrade.pips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {newTrade.pips >= 0 ? '+' : ''}{newTrade.pips.toFixed(1)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {(() => {
                    const selectedPair = currencyPairs.find(pair => pair.symbol === newTrade.pair)
                    const multiplier = selectedPair?.pipDisplayMultiplier || 1
                    if (multiplier !== 1) {
                      return 'For calculations'
                    }
                    return 'Same as display'
                  })()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Status</p>
                <div className="flex items-center justify-center">
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    OPEN
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">Will be set to OPEN</p>
              </div>
            </div>

            {/* Quick Actions for Fast Entry */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const selectedPair = currencyPairs.find(pair => pair.symbol === newTrade.pair)
                  if (selectedPair) {
                    const updatedTrade = { 
                      ...newTrade, 
                      lotSize: 0.1,
                      risk: 20
                    }
                    setNewTrade(updatedTrade)
                    updateCalculations(updatedTrade)
                  }
                }}
                className="border-red-200 dark:border-red-800/50 text-sm"
              >
                🎯 Quick Setup
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const updatedTrade = { 
                    ...newTrade, 
                    type: newTrade.type === 'BUY' ? 'SELL' as const : 'BUY' as const
                  }
                  setNewTrade(updatedTrade)
                  updateCalculations(updatedTrade)
                }}
                className="border-red-200 dark:border-red-800/50 text-sm"
              >
                🔄 Switch {newTrade.type === 'BUY' ? 'SELL' : 'BUY'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const updatedTrade = { 
                    ...newTrade, 
                    entryPrice: newTrade.exitPrice,
                    exitPrice: newTrade.entryPrice
                  }
                  setNewTrade(updatedTrade)
                  updateCalculations(updatedTrade)
                }}
                className="border-red-200 dark:border-red-800/50 text-sm"
              >
                ↔️ Swap Prices
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const now = new Date()
                  const updatedTrade = { 
                    ...newTrade, 
                    date: now.toISOString().split('T')[0],
                    time: now.toTimeString().slice(0, 5)
                  }
                  setNewTrade(updatedTrade)
                }}
                className="border-red-200 dark:border-red-800/50 text-sm"
              >
                ⏰ Now
              </Button>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={newTrade.time}
                  onChange={(e) => setNewTrade({...newTrade, time: e.target.value})}
                  className="border-red-200 dark:border-red-800/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Trade Source
                </Label>
                <Select 
                  value={newTrade.source || 'MANUAL'} 
                  onValueChange={(value) => {
                    setNewTrade({ ...newTrade, source: value as 'TELEGRAM' | 'LIVE' | 'MANUAL' })
                  }}
                >
                  <SelectTrigger className="border-red-200 dark:border-red-800/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TELEGRAM">📱 Telegram Signal</SelectItem>
                    <SelectItem value="LIVE">🔴 Live Trading (Discord)</SelectItem>
                    <SelectItem value="MANUAL">✋ Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradingViewLink" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  TradingView Link (Optional)
                </Label>
                <Input
                  id="tradingViewLink"
                  type="url"
                  placeholder="https://www.tradingview.com/chart/..."
                  value={newTrade.tradingViewLink || ''}
                  onChange={(e) => setNewTrade(prev => ({ ...prev, tradingViewLink: e.target.value }))}
                  className="border-red-200 dark:border-red-800/50"
                />
              </div>
            </div>

            {/* Chart Analysis (Optional) */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Chart Analysis (Optional)
              </Label>
              
              {/* Chart Upload Option */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-600 dark:text-slate-400">
                  Upload Chart Image
                </Label>
                <div className="flex items-center space-x-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChartUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-red-200 dark:border-red-800/50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Chart
                  </Button>
                  {chartFile && (
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {chartFile.name}
                    </span>
                  )}
                </div>
                {chartPreview && (
                  <div className="mt-4">
                    <img
                      src={chartPreview}
                      alt="Chart preview"
                      className="max-w-full h-64 object-contain rounded-lg border border-red-500/30 dark:border-red-500/50"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Trade Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Trade Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={newTrade.notes}
                onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})}
                placeholder="Add any additional notes about this trade..."
                className="border-red-200 dark:border-red-800/50"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-600">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {!newTrade.pair || !newTrade.entryPrice || !newTrade.exitPrice ? (
                  <span className="text-red-500">Please fill in all required fields</span>
                ) : (
                  <span className="text-green-600">✓ All required fields completed</span>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleAddTrade}
                  className="border-red-200 dark:border-red-800/50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTrade}
                  className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg"
                  disabled={!newTrade.pair || !newTrade.entryPrice || !newTrade.exitPrice}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingTrade ? 'Update Trade' : 'Save Trade'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Full Sync Modal */}
      <Dialog open={showFullSyncModal} onOpenChange={setShowFullSyncModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Full Sync - Select Date Range
            </DialogTitle>
            <DialogDescription>
              Choose the date range for syncing all trades. This will fetch complete historical data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Show which accounts will be synced */}
            {linkedAccounts.length > 1 && (
              <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Label className="text-sm font-medium">Accounts to Sync</Label>
                <div className="space-y-1">
                  {(syncAccountIds.size > 0 
                    ? Array.from(syncAccountIds).filter(id => selectedAccountIds.has(id))
                    : Array.from(selectedAccountIds)
                  ).map((accountId) => {
                    const account = linkedAccounts.find(acc => acc.id === accountId)
                    if (!account) return null
                    return (
                      <div key={accountId} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">{account.accountName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {account.accountType}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  {syncAccountIds.size > 0 
                    ? `${syncAccountIds.size} account${syncAccountIds.size > 1 ? 's' : ''} selected`
                    : `All ${selectedAccountIds.size} selected account${selectedAccountIds.size > 1 ? 's' : ''} will be synced`
                  }
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Date Range Option</Label>
              <Select 
                value={syncDateRange} 
                onValueChange={(value) => {
                  setSyncDateRange(value as 'default' | 'custom' | 'all')
                  if (value === 'default') {
                    setFullSyncStartDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
                    setFullSyncEndDate(new Date())
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Last 1 Year (Default)</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {syncDateRange === 'custom' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <DateTimePicker
                    value={fullSyncStartDate}
                    onChange={(date) => setFullSyncStartDate(date)}
                    showTimeSelect={false}
                    dateFormat="MMM dd, yyyy"
                    maxDate={fullSyncEndDate || new Date()}
                    placeholder="Select start date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <DateTimePicker
                    value={fullSyncEndDate}
                    onChange={(date) => setFullSyncEndDate(date)}
                    showTimeSelect={false}
                    dateFormat="MMM dd, yyyy"
                    minDate={fullSyncStartDate || undefined}
                    maxDate={new Date()}
                    placeholder="Select end date"
                  />
                </div>
              </div>
            )}

            {syncDateRange === 'all' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ <strong>Warning:</strong> This will sync all available trades from your account history. 
                  This may take a while for accounts with extensive trading history and will consume more API credits.
                </p>
              </div>
            )}

            {syncDateRange === 'default' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ℹ️ This will sync trades from the last 1 year (365 days) up to today.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFullSyncModal(false)}
              disabled={syncing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (syncDateRange === 'custom' && (!fullSyncStartDate || !fullSyncEndDate)) {
                  toast.error('Please select both start and end dates')
                  return
                }
                executeFullSync(
                  syncDateRange,
                  syncDateRange === 'custom' ? fullSyncStartDate || undefined : undefined,
                  syncDateRange === 'custom' ? fullSyncEndDate || undefined : undefined
                )
              }}
              disabled={syncing || (syncDateRange === 'custom' && (!fullSyncStartDate || !fullSyncEndDate))}
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Start Full Sync
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-black/90 border-red-500/50 dark:border-red-500/70">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Confirm Delete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Are you sure you want to delete this trade? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="border-red-200 dark:border-red-800/50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleDeleteTrade(showDeleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Trade
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function TradingJournalPage() {
  return <TradingJournalPageContent />
}