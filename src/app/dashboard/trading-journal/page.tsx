'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createTrade, getTradesByProfile, updateTrade, deleteTrade } from '@/lib/tradeService'
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
  ChevronDown
} from 'lucide-react'
import { CURRENCY_PAIRS, calculatePips, calculateProfit, getCategoryIcon, getPriceColor, formatRealPrice, getCurrencyPair } from '@/lib/currencyDatabase'
import { CurrencyDatabaseService } from '@/lib/currencyDatabaseService'
import { Trade, ICTAnalysis } from '@/types/trade'
import { useProfile, ProfileProvider } from '@/contexts/ProfileContext'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileSelector } from '@/components/dashboard/profile-selector'
import { useRouter } from 'next/navigation'
import { getActivePromotions } from '@/lib/promotionService'
import { Promotion } from '@/types/promotion'
import PromotionBanner from '@/components/promotions/promotion-banner'

function TradingJournalPageContent() {
  const { user: authUser } = useAuth()
  const { currentProfile, userRole, canEdit, isLoading: profileLoading } = useProfile()
  const router = useRouter()
  
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

  // Function to load trades
  const loadTrades = async () => {
    if (!currentProfile?.id) {
      console.log('Trading Journal: No profile selected, clearing trades')
      setTrades([])
      return
    }

    try {
      console.log(`Trading Journal: Loading trades for profile ${currentProfile.id}`)
      console.log('Trading Journal: Current profile details:', currentProfile)
      setTradesLoading(true)
      const profileTrades = await getTradesByProfile(currentProfile.id)
      console.log(`Trading Journal: Loaded ${profileTrades.length} trades for profile ${currentProfile.id}`)
      console.log('Trading Journal: Loaded trade IDs:', profileTrades.map(t => t.id))
      console.log('Trading Journal: Raw trades data:', profileTrades)
      
      // Filter out any invalid trades before setting state
      const validTrades = profileTrades.filter(trade => 
        trade && typeof trade === 'object' && trade.id && trade.id.trim() !== ''
      )
      
      if (validTrades.length !== profileTrades.length) {
        console.warn(`Trading Journal: Filtered out ${profileTrades.length - validTrades.length} invalid trades`)
      }
      
      console.log('Trading Journal: Setting valid trades to state:', validTrades)
      setTrades(validTrades)
    } catch (error) {
      console.error('Trading Journal: Error loading trades from Firestore:', error)
      setTrades([])
    } finally {
      setTradesLoading(false)
      setIsInitialized(true)
    }
  }

  // Load trades from Firestore when profile changes
  useEffect(() => {
    loadTrades()
  }, [currentProfile?.id])

  // Reload trades when component becomes visible (user navigates back to page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentProfile?.id) {
        console.log('Trading Journal: Page became visible, reloading trades')
        loadTrades()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [currentProfile?.id])

  // No need to save to localStorage since we're using Firestore

  // Update newTrade when profile or user changes
  useEffect(() => {
    if (currentProfile && userRole) {
      setNewTrade(prev => ({
        ...prev,
        profileId: currentProfile.id,
        userId: userRole.userId
      }))
    }
  }, [currentProfile, userRole])

         // Load promotions when viewing admin profiles
         useEffect(() => {
           const loadPromotions = async () => {
             
             // Only show promotions if:
             // 1. Current profile is public (isPublic === true)
             // 2. Current profile belongs to admin (userId !== authUser.uid)
             // 3. User is VIP or Guest (not admin)
             if (currentProfile?.isPublic && 
                 currentProfile?.userId !== authUser?.uid && 
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

           if (currentProfile && authUser) {
             loadPromotions()
          }
        }, [currentProfile, authUser])

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
    .filter(trade => 
      currentProfile ? trade.profileId === currentProfile.id : true
    )
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
    profileId: currentProfile?.id || '',
    userId: userRole?.userId || '',
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
        profileId: currentProfile?.id || '',
        userId: userRole?.userId || '',
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

    if (!currentProfile?.id || !userRole?.userId) {
      alert('Profile or user information missing')
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
        profileId: currentProfile.id,
        userId: userRole.userId
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
        
        if (!tradeData.pair || !tradeData.entryPrice || !tradeData.exitPrice || !tradeData.profileId || !tradeData.userId) {
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
      console.log('Trading Journal: Resetting form, currentProfile:', currentProfile, 'userRole:', userRole)
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
        profileId: currentProfile?.id || '',
        userId: userRole?.userId || '',
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
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading trading profiles...</p>
        </div>
      </div>
    )
  }

  // No profile selected
  if (!currentProfile) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Profile Selected</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please select a trading profile to view and manage trades.
          </p>
          <ProfileSelector 
            onCreateProfile={() => {
              router.push('/dashboard/profiles')
            }}
            onManageProfiles={() => {
              router.push('/dashboard/profiles')
            }}
          />
        </div>
      </div>
    )
  }

  // Debug: Log current state
  console.log('Trading Journal: Component render - currentProfile:', currentProfile?.id, 'trades count:', trades.length, 'isLoading:', tradesLoading)

  return (
    <div className="space-y-8">
      {/* Trading Journal Management */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-red-500" />
                Trading Journal Management
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                Pro
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Refresh Button */}
              <Button
                onClick={loadTrades}
                disabled={tradesLoading}
                variant="outline"
                size="sm"
                className="border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {tradesLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Refresh Trades
                  </>
                )}
              </Button>
              
              {/* Profile Selector */}
              <ProfileSelector 
                onCreateProfile={() => {
                  router.push('/dashboard/profiles')
                }}
                onManageProfiles={() => {
                  router.push('/dashboard/profiles')
                }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Win Rate</p>
                <p className="text-3xl font-bold">{winRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Total Trades</p>
                <p className="text-3xl font-bold">{totalTrades}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Pips</p>
                <p className="text-3xl font-bold">{totalPips.toFixed(1)}</p>
              </div>
              <Target className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Total Profit</p>
                <p className="text-3xl font-bold">${totalProfit.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Trade Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Trade Entries
          {currentProfile && (
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
              ({currentProfile.name})
            </span>
          )}
        </h2>
        <Button
          onClick={handleAddTrade}
          disabled={!canEdit() || profileLoading || !authUser || (authUser.role !== 'admin' && authUser.role !== 'vip')}
          className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          {isAddingTrade ? 'Cancel' : 'Add New Trade'}
        </Button>
      </div>

      {/* Promotional Offers - Only shown to VIP/Guest viewing admin profiles */}
      {promotions.length > 0 && (
        <PromotionBanner 
          promotions={promotions} 
          userRole={authUser?.role as 'vip' | 'guest'} 
        />
      )}
      
      {/* Add/Edit Trade Form */}
      {isAddingTrade && (
        <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
              <Brain className="w-5 h-5 mr-2 text-red-500" />
              {editingTrade ? 'Edit Trade' : 'New Trade Entry'}
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Fill in the trade details below. Pips and profit will be calculated automatically.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
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

      {/* Trades List */}
      <div className="space-y-4">
        {tradesLoading ? (
          <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
            <CardContent className="text-center py-12">
              <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Loading trades...</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Please wait while we fetch the trades for this profile.
              </p>
            </CardContent>
          </Card>
        ) : trades.length === 0 ? (
          <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
            <CardContent className="text-center py-12">
              <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No trades recorded</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Start by adding your first trade analysis above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Search and Filter Bar */}
            <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search trades by pair, type, or notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40 bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="pair">Pair</SelectItem>
                        <SelectItem value="pips">Pips</SelectItem>
                        <SelectItem value="profit">Profit</SelectItem>
                        <SelectItem value="rr">R:R Ratio</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50"
                    >
                      {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Excel-Style Trade Table */}
            <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    {/* Table Header */}
                    <thead className="bg-slate-50 dark:bg-red-900/20 border-b border-red-500/30 dark:border-red-500/50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          #
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          Date/Time
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          Pair
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          Type
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          Entry
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          Exit
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          Pips
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          P&L
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          R:R
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide border-r border-red-500/30 dark:border-red-500/50">
                          Status
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    
                    {/* Table Body */}
                    <tbody>
                      {filteredTrades.map((trade, index) => {
                        // Skip trades without valid IDs
                        if (!trade || typeof trade !== 'object' || !trade.id || trade.id.trim() === '') {
                          if (trade && typeof trade === 'object') {
                            console.warn('Trading Journal: Skipping trade without valid ID:', trade)
                          }
                          return null
                        }
                        
                        const isExpanded = expandedTrades.has(trade.id)
                        const canEdit = (currentProfile?.userId === authUser?.uid || authUser?.role === 'admin')
                        
                        // Debug: Log trade ID for each row
                        if (index === 0) {
                          console.log('Trading Journal: Rendering trades with IDs:', filteredTrades.map(t => t.id))
                        }
                        
                        return (
                          <React.Fragment key={trade.id}>
                            {/* Main Trade Row */}
                            <tr 
                              className={`border-b border-red-500/30 dark:border-red-500/50 hover:bg-slate-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer ${
                                index % 2 === 0 ? 'bg-white dark:bg-black/90' : 'bg-slate-50/50 dark:bg-red-900/10'
                              }`}
                              onClick={() => canEdit && toggleTradeExpansion(trade.id)}
                            >
                              {/* Row Number */}
                              <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 font-mono border-r border-red-500/30 dark:border-red-500/50">
                                {index + 1}
                              </td>
                              
                              {/* Date/Time */}
                              <td className="py-3 px-4 border-r border-red-500/30 dark:border-red-500/50">
                                <div className="text-sm text-slate-900 dark:text-white">
                                  <div className="font-medium">{new Date(trade.date).toLocaleDateString()}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">{trade.time}</div>
                                </div>
                              </td>
                              
                              {/* Pair */}
                              <td className="py-3 px-4 border-r border-red-500/30 dark:border-red-500/50">
                                <div className="flex items-center space-x-2">
                                  {getCategoryIcon(getCurrencyPair(trade.pair)?.category || 'forex')}
                                  <span className="font-bold text-slate-900 dark:text-white">{trade.pair}</span>
                                </div>
                              </td>
                              
                              {/* Type */}
                              <td className="py-3 px-4 border-r border-red-500/30 dark:border-red-500/50">
                                <Badge className={getTypeColor(trade.type)}>
                                  {trade.type}
                                </Badge>
                              </td>
                              
                              {/* Entry Price */}
                              <td className="py-3 px-4 text-right border-r border-red-500/30 dark:border-red-500/50">
                                <span className="font-mono text-sm text-slate-900 dark:text-white">
                                  {trade.entryPrice.toFixed(4)}
                                </span>
                              </td>
                              
                              {/* Exit Price */}
                              <td className="py-3 px-4 text-right border-r border-red-500/30 dark:border-red-500/50">
                                <span className="font-mono text-sm text-slate-900 dark:text-white">
                                  {trade.exitPrice.toFixed(4)}
                                </span>
                              </td>
                              
                              {/* Pips */}
                              <td className="py-3 px-4 text-right border-r border-red-500/30 dark:border-red-500/50">
                                <span className={`font-mono text-sm font-bold ${trade.pips >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {trade.pips >= 0 ? '+' : ''}{trade.pips.toFixed(1)}
                                </span>
                              </td>
                              
                              {/* Profit/Loss */}
                              <td className="py-3 px-4 text-right border-r border-red-500/30 dark:border-red-500/50">
                                <span className={`font-mono text-sm font-bold ${trade.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  ${trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                                </span>
                              </td>
                              
                              {/* R:R Ratio */}
                              <td className="py-3 px-4 text-right border-r border-red-500/30 dark:border-red-500/50">
                                <span className="font-mono text-sm text-slate-900 dark:text-white">
                                  {trade.rr.toFixed(2)}:1
                                </span>
                              </td>
                              
                              {/* Status */}
                              <td className="py-3 px-4 text-center border-r border-red-500/30 dark:border-red-500/50">
                                <div className="flex items-center justify-center">
                                  {canEdit ? (
                                    <div className="flex flex-col space-y-1">
                                      <Select 
                                        value={trade.status} 
                                        onValueChange={(value) => {
                                          console.log('Dropdown triggered - Trade ID:', trade.id, 'Trade object:', trade)
                                          console.log('New status:', value)
                                          console.log('All trade IDs in current state:', trades.map(t => t.id))
                                          handleStatusChange(trade.id, value)
                                        }}
                                      >
                                        <SelectTrigger className="w-32 h-8 text-xs">
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="OPEN">OPEN</SelectItem>
                                          <SelectItem value="CLOSED">CLOSED</SelectItem>
                                          <SelectItem value="LOSS">LOSS</SelectItem>
                                          <SelectItem value="BREAKEVEN">BREAKEVEN</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <div className="text-xs text-center">
                                        {trade.status === 'OPEN' && <span className="text-yellow-600">●</span>}
                                        {trade.status === 'CLOSED' && <span className="text-green-600">●</span>}
                                        {trade.status === 'LOSS' && <span className="text-red-600">●</span>}
                                        {trade.status === 'BREAKEVEN' && <span className="text-gray-600">●</span>}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center space-x-2">
                                      <Badge className={getStatusColor(trade.status)}>
                                        {trade.status}
                                      </Badge>
                                      {trade.status !== 'OPEN' && (
                                        <div className="flex items-center space-x-1">
                                          {getResultIcon(trade.result)}
                                          <span className={`text-xs font-medium ${getResultColor(trade.result)}`}>
                                            {trade.result > 0 ? 'WIN' : trade.result < 0 ? 'LOSS' : 'BREAKEVEN'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              {/* Actions */}
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center space-x-1">
                                  {canEdit && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleTradeExpansion(trade.id)
                                        }}
                                        className="text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 h-8 w-8 p-0"
                                      >
                                        <Info className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEditTrade(trade)
                                        }}
                                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                      >
                                        <EditIcon className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setShowDeleteConfirm(trade.id)
                                        }}
                                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                            
                            {/* Expanded Row Details */}
                            {isExpanded && canEdit && (
                              <tr className="bg-slate-50 dark:bg-red-900/20 border-b border-red-500/30 dark:border-red-500/50">
                                <td colSpan={11} className="p-6">
                                  <div className="space-y-6">
                                    {/* Additional Trade Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                      <div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Lot Size</p>
                                        <p className="text-slate-900 dark:text-white font-medium">{trade.lotSize}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Risk</p>
                                        <p className="text-slate-900 dark:text-white font-medium">${trade.risk.toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Source</p>
                                        <Badge variant="outline">{trade.source || 'MANUAL'}</Badge>
                                      </div>
                                      <div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Result</p>
                                        <div className="flex items-center space-x-1">
                                          {getResultIcon(trade.result)}
                                          <span className={getResultColor(trade.result)}>
                                            {getResultText(trade.result)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Chart Analysis */}
                                    {(trade.chartImage || trade.tradingViewLink) && (
                                      <div>
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                                          <Eye className="w-4 h-4 mr-2 text-red-500" />
                                          Chart Analysis
                                        </h4>
                                        
                                        {trade.chartImage && (
                                          <div className="mb-4">
                                            <img
                                              src={trade.chartImage}
                                              alt="Trade chart"
                                              className="max-w-full h-48 object-contain rounded-lg border border-red-500/30 dark:border-red-500/50"
                                            />
                                          </div>
                                        )}

                                        {trade.tradingViewLink && (
                                          <div className="space-y-2">
                                            <a
                                              href={trade.tradingViewLink}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center space-x-2 text-sm text-red-600 dark:text-red-400 hover:underline bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800/50"
                                            >
                                              <Eye className="w-4 h-4" />
                                              <span>View on TradingView</span>
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* ICT Strategy Analysis */}
                                    {trade.ictAnalysis && (
                                      <div className="p-4 bg-slate-100 dark:bg-black/80 rounded-lg border border-red-500/20">
                                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                                          <Brain className="w-4 h-4 mr-2 text-red-500" />
                                          ICT Strategy Analysis
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                          <div className="space-y-2">
                                            <p><span className="text-slate-600 dark:text-slate-400">Timeframe:</span> <span className="text-slate-900 dark:text-white">{trade.ictAnalysis.timeframe}</span></p>
                                            <p><span className="text-slate-600 dark:text-slate-400">Context:</span> <span className="text-slate-900 dark:text-white">{trade.ictAnalysis.context}</span></p>
                                            <p><span className="text-slate-600 dark:text-slate-400">Session:</span> <span className="text-slate-900 dark:text-white">{trade.ictAnalysis.sessionKillZone}</span></p>
                                            <p><span className="text-slate-600 dark:text-slate-400">LTF:</span> <span className="text-slate-900 dark:text-white">{trade.ictAnalysis.lowTimeframe}</span></p>
                                          </div>
                                          <div className="space-y-2">
                                            {trade.ictAnalysis.fvg && <p><span className="text-slate-600 dark:text-slate-400">FVG:</span> <span className="text-slate-900 dark:text-white">{trade.ictAnalysis.fvg}</span></p>}
                                            {trade.ictAnalysis.breaker && <p><span className="text-slate-600 dark:text-slate-400">Breaker:</span> <span className="text-slate-900 dark:text-white">{trade.ictAnalysis.breaker}</span></p>}
                                            {trade.ictAnalysis.entry && <p><span className="text-slate-600 dark:text-slate-400">Entry:</span> <span className="text-slate-900 dark:text-white">{trade.ictAnalysis.entry}</span></p>}
                                          </div>
                                        </div>
                                        {trade.ictAnalysis.notes && (
                                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                            <p className="text-sm text-slate-600 dark:text-slate-400">Notes:</p>
                                            <p className="text-slate-900 dark:text-white">{trade.ictAnalysis.notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Trade Notes */}
                                    {trade.notes && (
                                      <div>
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Notes</h4>
                                        <p className="text-slate-900 dark:text-white">{trade.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Table Footer - Simple count only */}
                {filteredTrades.length > 0 && (
                  <div className="border-t border-red-500/30 dark:border-red-500/50 bg-slate-50 dark:bg-red-900/20 px-6 py-3">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Showing {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

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