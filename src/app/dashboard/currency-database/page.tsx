'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Database,
  Search,
  Filter,
  Edit3,
  Trash2 as TrashIcon,
  Plus as PlusIcon
} from 'lucide-react'
import { CURRENCY_PAIRS, getPriceColor, formatRealPrice, getCategoryIcon } from '@/lib/currencyDatabase'
import { CurrencyDatabaseService } from '@/lib/currencyDatabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import PipCalculator from '@/components/currency/PipCalculator'

interface CurrencyPair {
  symbol: string
  name: string
  category: 'forex' | 'indices' | 'commodities' | 'crypto'
  pipValue: number
  pipPosition: number
  pipDisplayMultiplier: number
  baseCurrency: string
  quoteCurrency: string
  description: string
  tradingHours: string
  realPrice: number
  spread: string
}

export default function CurrencyDatabasePage() {
  const { user } = useAuth()
  const [currencyPairs, setCurrencyPairs] = useState<CurrencyPair[]>([])
  const [editingPair, setEditingPair] = useState<CurrencyPair | null>(null)
  const [isAddingPair, setIsAddingPair] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load currency pairs from database
  useEffect(() => {
    const loadCurrencyPairs = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const pairs = await CurrencyDatabaseService.getCurrencyPairs(user.uid)
        // Ensure all pairs have pipDisplayMultiplier field
        const pairsWithMultiplier = pairs.map(pair => ({
          ...pair,
          pipDisplayMultiplier: pair.pipDisplayMultiplier || 1
        }))
        setCurrencyPairs(pairsWithMultiplier)
        console.log('Loaded currency pairs from database:', pairsWithMultiplier.length)
      } catch (error) {
        console.error('Error loading currency pairs:', error)
        // Fallback to static data
        setCurrencyPairs(CURRENCY_PAIRS)
        toast.error('Failed to load currency pairs. Using default values.')
      } finally {
        setLoading(false)
      }
    }

    loadCurrencyPairs()
  }, [user?.uid])

  // Filter currency pairs based on search and category
  const filteredCurrencyPairs = currencyPairs.filter(pair => {
    const matchesSearch = pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pair.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || pair.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleSavePair = async () => {
    if (!editingPair || !user?.uid) return

    try {
      setSaving(true)
      
      // Check if it's a new pair or editing existing
      const existingIndex = currencyPairs.findIndex(pair => pair.symbol === editingPair.symbol)
      let updatedPairs
      
      if (existingIndex >= 0) {
        // Update existing pair
        updatedPairs = currencyPairs.map(pair => 
          pair.symbol === editingPair.symbol ? editingPair : pair
        )
      } else {
        // Add new pair
        updatedPairs = [...currencyPairs, editingPair]
      }

      // Save to database
      await CurrencyDatabaseService.saveCurrencyPairs(user.uid, updatedPairs)
      setCurrencyPairs(updatedPairs)
      
      toast.success(`Currency pair ${editingPair.symbol} saved successfully!`)
      console.log('Currency pair saved to database:', editingPair.symbol, editingPair.pipValue, 'pipDisplayMultiplier:', editingPair.pipDisplayMultiplier)
    } catch (error) {
      console.error('Error saving currency pair:', error)
      toast.error('Failed to save currency pair')
    } finally {
      setSaving(false)
      setIsAddingPair(false)
      setEditingPair(null)
    }
  }

  const handleDeletePair = async (symbol: string) => {
    if (!user?.uid) return

    try {
      setSaving(true)
      const updatedPairs = currencyPairs.filter(pair => pair.symbol !== symbol)
      
      // Save to database
      await CurrencyDatabaseService.saveCurrencyPairs(user.uid, updatedPairs)
      setCurrencyPairs(updatedPairs)
      
      toast.success(`Currency pair ${symbol} deleted successfully!`)
      console.log('Currency pair deleted from database:', symbol)
    } catch (error) {
      console.error('Error deleting currency pair:', error)
      toast.error('Failed to delete currency pair')
    } finally {
      setSaving(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('all')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Database className="w-12 h-12 text-red-500 animate-pulse mx-auto mb-4" />
          <p className="text-lg text-slate-600 dark:text-slate-400">Loading currency pairs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Currency Database Management */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-6 h-6 text-red-500" />
                Currency Database Management
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                Edit and manage all currency pairs, indices, and commodities for automatic pip calculation
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                setEditingPair({
                  symbol: '',
                  name: '',
                  category: 'forex',
                  pipValue: 10,
                  pipPosition: 4,
                  pipDisplayMultiplier: 1,
                  baseCurrency: '',
                  quoteCurrency: '',
                  description: '',
                  tradingHours: '24/5',
                  realPrice: 0,
                  spread: ''
                })
                setIsAddingPair(true)
              }}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Pair
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search currency pairs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-red-500/30 dark:border-red-500/50"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48 border-red-500/30 dark:border-red-500/50">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="forex">💱 Forex</SelectItem>
                <SelectItem value="indices">📈 Indices</SelectItem>
                <SelectItem value="commodities">🥇 Commodities</SelectItem>
                <SelectItem value="crypto">₿ Crypto</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="border-red-500/30 dark:border-red-500/50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Results Counter */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing {filteredCurrencyPairs.length} of {currencyPairs.length} currency pairs
            </p>
          </div>

          {/* Currency Pairs Table */}
          {filteredCurrencyPairs.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No currency pairs found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchQuery || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by adding your first currency pair'
                }
              </p>
              {(searchQuery || categoryFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="border-red-500/30 dark:border-red-500/50"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Symbol</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Pip Value</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Real Price</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCurrencyPairs.map((pair) => (
                    <tr key={pair.symbol} className="border-b border-slate-100 dark:border-red-500/20 hover:bg-slate-50 dark:hover:bg-black/80">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(pair.category)}
                          <span className="font-medium text-slate-900 dark:text-white">{pair.symbol}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{pair.name}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {pair.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{pair.pipValue}</td>
                      <td className="py-3 px-4">
                        <span className={`font-mono text-sm ${getPriceColor(pair.realPrice)}`}>
                          {formatRealPrice(pair.realPrice)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPair({
                                ...pair,
                                pipDisplayMultiplier: pair.pipDisplayMultiplier || 1
                              })
                              setIsAddingPair(true)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePair(pair.symbol)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Pair Modal */}
      {isAddingPair && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <Database className="w-5 h-5 mr-2 text-red-500" />
                {editingPair ? 'Edit Currency Pair' : 'Add New Currency Pair'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="symbol">Symbol *</Label>
                  <Input
                    id="symbol"
                    value={editingPair?.symbol || ''}
                    onChange={(e) => setEditingPair({...editingPair, symbol: e.target.value})}
                    placeholder="e.g., EUR/USD"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={editingPair?.name || ''}
                    onChange={(e) => setEditingPair({...editingPair, name: e.target.value})}
                    placeholder="e.g., Euro vs US Dollar"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={editingPair?.category || 'forex'} 
                    onValueChange={(value) => setEditingPair({...editingPair, category: value as any})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forex">💱 Forex</SelectItem>
                      <SelectItem value="indices">📈 Indices</SelectItem>
                      <SelectItem value="commodities">🥇 Commodities</SelectItem>
                      <SelectItem value="crypto">₿ Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pipValue">Pip Value *</Label>
                  <Input
                    id="pipValue"
                    type="text"
                    value={editingPair?.pipValue?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty string, numbers, decimal points, and partial decimal input
                      if (value === '' || /^(\d+\.?\d*|\.\d+|\.?)$/.test(value)) {
                        setEditingPair({...editingPair, pipValue: parseFloat(value) || 0})
                      }
                    }}
                    placeholder="e.g., 10 or 0.1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pipPosition">Pip Position *</Label>
                  <Input
                    id="pipPosition"
                    type="number"
                    min="0"
                    max="4"
                    value={editingPair?.pipPosition || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      setEditingPair({...editingPair, pipPosition: isNaN(value) ? 4 : value})
                    }}
                    placeholder="e.g., 0 (indices), 2 (JPY), 4 (forex)"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Pip Calculator Section */}
              <div className="mt-4">
                <PipCalculator
                  pipValue={editingPair?.pipValue || 0}
                  pipPosition={editingPair?.pipPosition || 4}
                  baseCurrency={editingPair?.baseCurrency || ''}
                  quoteCurrency={editingPair?.quoteCurrency || ''}
                  pipDisplayMultiplier={editingPair?.pipDisplayMultiplier || 1}
                  onValidationChange={(isValid) => {
                    // You can use this to show validation status in the form
                    console.log('Pip validation result:', isValid)
                  }}
                  onPipDisplayMultiplierChange={(multiplier) => {
                    if (editingPair) {
                      setEditingPair({ ...editingPair, pipDisplayMultiplier: multiplier })
                    }
                  }}
                />
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <Label htmlFor="baseCurrency">Base Currency *</Label>
                  <Input
                    id="baseCurrency"
                    value={editingPair?.baseCurrency || ''}
                    onChange={(e) => setEditingPair({...editingPair, baseCurrency: e.target.value})}
                    placeholder="e.g., EUR"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quoteCurrency">Quote Currency *</Label>
                  <Input
                    id="quoteCurrency"
                    value={editingPair?.quoteCurrency || ''}
                    onChange={(e) => setEditingPair({...editingPair, quoteCurrency: e.target.value})}
                    placeholder="e.g., USD"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tradingHours">Trading Hours</Label>
                  <Input
                    id="tradingHours"
                    value={editingPair?.tradingHours || ''}
                    onChange={(e) => setEditingPair({...editingPair, tradingHours: e.target.value})}
                    placeholder="e.g., 24/5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="spread">Spread</Label>
                  <Input
                    id="spread"
                    value={editingPair?.spread || ''}
                    onChange={(e) => setEditingPair({...editingPair, spread: e.target.value})}
                    placeholder="e.g., 0.5-1.5 pips"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingPair?.description || ''}
                  onChange={(e) => setEditingPair({...editingPair, description: e.target.value})}
                  placeholder="Brief description of the currency pair..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddingPair(false)
                    setEditingPair(null)
                  }}
                  className="border-red-500/30 dark:border-red-500/50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSavePair}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={!editingPair?.symbol || !editingPair?.name || saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : (editingPair ? 'Update Pair' : 'Add Pair')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
