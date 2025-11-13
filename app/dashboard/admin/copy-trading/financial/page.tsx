'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Wallet
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface FinancialData {
  cashFlow: {
    totalInflow: number
    totalOutflow: number
    netCashFlow: number
    period: string
  }
  revenue: {
    total: number
    commissions: number
    fees: number
    period: string
  }
  expenses: {
    total: number
    apiCosts: number
    infrastructure: number
    period: string
  }
  profitLoss: {
    netProfit: number
    grossProfit: number
    period: string
  }
  accountBalances: Array<{
    date: string
    balance: number
    equity: number
  }>
  transactions: Array<{
    id: string
    type: 'inflow' | 'outflow'
    amount: number
    description: string
    date: string
    category: string
  }>
}

export default function FinancialManagementTab() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch statistics data (read-only, existing endpoint)
      let statsResponse
      try {
        statsResponse = await fetch('/api/admin/copyfactory/followers/statistics', {
          headers: {
            'x-user-id': user?.uid || '',
            'x-user-email': user?.email || ''
          }
        })
      } catch (fetchError) {
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
      }

      if (!statsResponse.ok) {
        let errorText = ''
        try {
          errorText = await statsResponse.text()
        } catch {
          errorText = `HTTP ${statsResponse.status}`
        }
        throw new Error(`Failed to fetch statistics data: ${errorText}`)
      }

      let statsData
      try {
        statsData = await statsResponse.json()
      } catch (jsonError) {
        throw new Error('Failed to parse statistics response as JSON')
      }

      if (!statsData || !statsData.success) {
        throw new Error(statsData?.error || 'Failed to load statistics')
      }

      // Calculate financial metrics from statistics
      const totals = statsData.totals || {}
      const followers = Array.isArray(statsData.followers) ? statsData.followers : []
      const performance = statsData.performance || {}

      // Calculate cash flow (simplified - using equity changes as proxy)
      const totalInflow = typeof totals.totalEquity === 'number' && !isNaN(totals.totalEquity) ? totals.totalEquity : 0
      const totalOutflow = typeof totals.totalMargin === 'number' && !isNaN(totals.totalMargin) ? totals.totalMargin : 0
      const netCashFlow = totalInflow - totalOutflow

      // Calculate revenue (using profit/loss as revenue proxy)
      const totalProfitLoss = typeof performance.totalProfitLoss === 'number' && !isNaN(performance.totalProfitLoss) ? performance.totalProfitLoss : 0
      const totalRevenue = totalProfitLoss > 0 ? totalProfitLoss : 0
      const commissions = totalRevenue * 0.1 // 10% commission estimate
      const fees = totalRevenue * 0.05 // 5% fees estimate

      // Calculate expenses (simplified)
      const accountCount = Array.isArray(followers) ? followers.length : 0
      const apiCosts = accountCount * 10 // $10 per account estimate
      const infrastructure = 100 // Fixed infrastructure cost
      const totalExpenses = apiCosts + infrastructure

      // Calculate profit/loss
      const grossProfit = totalRevenue
      const netProfit = grossProfit - totalExpenses

      // Generate account balance history (simplified)
      const accountBalances = followers
        .filter((f: any) => {
          if (!f || f.status !== 'success') return false
          const balance = typeof f.balance === 'number' ? f.balance : 0
          const equity = typeof f.equity === 'number' ? f.equity : 0
          // Filter out invalid data
          if (isNaN(balance) || isNaN(equity) || !isFinite(balance) || !isFinite(equity)) return false
          return true
        })
        .map((f: any) => {
          const balance = typeof f.balance === 'number' && !isNaN(f.balance) && isFinite(f.balance) ? f.balance : 0
          const equity = typeof f.equity === 'number' && !isNaN(f.equity) && isFinite(f.equity) ? f.equity : 0
          return {
            date: new Date().toISOString().split('T')[0],
            balance,
            equity
          }
        })

      // Generate sample transactions
      const transactions = followers
        .filter((f: any) => {
          // Ensure follower object exists and has required properties
          if (!f || f.status !== 'success') return false
          if (!f.accountId) return false
          // Ensure balance and equity are valid numbers
          const balance = typeof f.balance === 'number' ? f.balance : 0
          const equity = typeof f.equity === 'number' ? f.equity : 0
          // Filter out invalid data
          if (isNaN(balance) || isNaN(equity) || !isFinite(balance) || !isFinite(equity)) return false
          return true
        })
        .map((f: any, index: number) => {
          try {
            const accountId = f.accountId || `account-${index}`
            const accountIdStr = typeof accountId === 'string' ? accountId : String(accountId)
            const login = f.login || (accountIdStr.length > 8 ? accountIdStr.substring(0, 8) : accountIdStr)
            const equity = typeof f.equity === 'number' && !isNaN(f.equity) && isFinite(f.equity) ? f.equity : 0
            const balance = typeof f.balance === 'number' && !isNaN(f.balance) && isFinite(f.balance) ? f.balance : 0
            const profitLoss = equity - balance
            
            // Ensure profitLoss is a valid number
            if (isNaN(profitLoss) || !isFinite(profitLoss)) {
              return null
            }
            
            return {
              id: `txn-${accountIdStr}-${index}`,
              type: profitLoss >= 0 ? 'inflow' : 'outflow',
              amount: Math.abs(profitLoss),
              description: `Account ${login} - ${profitLoss >= 0 ? 'Profit' : 'Loss'}`,
              date: new Date().toISOString().split('T')[0],
              category: 'Trading'
            }
          } catch (error) {
            const accountId = f?.accountId || 'unknown'
            console.warn(`Error processing transaction for follower ${accountId}:`, error)
            return null
          }
        })
        .filter((txn: any) => txn !== null) // Remove any null entries
        .slice(0, 20) // Limit to 20 most recent

      // Ensure all values are valid numbers before setting state
      const safeFinancialData: FinancialData = {
        cashFlow: {
          totalInflow: isFinite(totalInflow) ? totalInflow : 0,
          totalOutflow: isFinite(totalOutflow) ? totalOutflow : 0,
          netCashFlow: isFinite(netCashFlow) ? netCashFlow : 0,
          period: selectedPeriod
        },
        revenue: {
          total: isFinite(totalRevenue) ? totalRevenue : 0,
          commissions: isFinite(commissions) ? commissions : 0,
          fees: isFinite(fees) ? fees : 0,
          period: selectedPeriod
        },
        expenses: {
          total: isFinite(totalExpenses) ? totalExpenses : 0,
          apiCosts: isFinite(apiCosts) ? apiCosts : 0,
          infrastructure: isFinite(infrastructure) ? infrastructure : 0,
          period: selectedPeriod
        },
        profitLoss: {
          netProfit: isFinite(netProfit) ? netProfit : 0,
          grossProfit: isFinite(grossProfit) ? grossProfit : 0,
          period: selectedPeriod
        },
        accountBalances: Array.isArray(accountBalances) ? accountBalances : [],
        transactions: Array.isArray(transactions) ? transactions : []
      }

      setFinancialData(safeFinancialData)
    } catch (err) {
      console.error('Error loading financial data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadFinancialData()
    }
  }, [user, selectedPeriod, dateRange])

  const cashFlowChartData = useMemo(() => {
    if (!financialData) return []
    return [
      { name: 'Inflow', value: financialData.cashFlow.totalInflow },
      { name: 'Outflow', value: financialData.cashFlow.totalOutflow }
    ]
  }, [financialData])

  const revenueChartData = useMemo(() => {
    if (!financialData) return []
    return [
      { name: 'Commissions', value: financialData.revenue.commissions },
      { name: 'Fees', value: financialData.revenue.fees }
    ]
  }, [financialData])

  if (loading && !financialData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading financial data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Management</h2>
          <p className="text-muted-foreground">Banking-style funds management and reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadFinancialData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">
                  ${financialData?.revenue.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                <p className="text-2xl font-bold mt-1">
                  ${financialData?.expenses.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${(financialData?.profitLoss.netProfit || 0) >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} text-white border-0 shadow-lg`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Net Profit</p>
                <p className="text-2xl font-bold mt-1">
                  ${financialData?.profitLoss.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              {(financialData?.profitLoss.netProfit || 0) >= 0 ? (
                <ArrowUpRight className="h-8 w-8 text-white/80" />
              ) : (
                <ArrowDownRight className="h-8 w-8 text-white/80" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Net Cash Flow</p>
                <p className="text-2xl font-bold mt-1">
                  ${financialData?.cashFlow.netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cash Flow Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow</CardTitle>
                <CardDescription>Inflow vs Outflow</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={cashFlowChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {cashFlowChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Commissions vs Fees</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#8b5cf6'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Analysis</CardTitle>
              <CardDescription>Detailed cash flow breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Inflow</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    ${financialData?.cashFlow.totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Outflow</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">
                    ${financialData?.cashFlow.totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                  <p className={`text-2xl font-bold mt-1 ${(financialData?.cashFlow.netCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${financialData?.cashFlow.netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analysis</CardTitle>
              <CardDescription>Revenue breakdown by source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1">
                    ${financialData?.revenue.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Commissions</p>
                  <p className="text-2xl font-bold mt-1">
                    ${financialData?.revenue.commissions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Fees</p>
                  <p className="text-2xl font-bold mt-1">
                    ${financialData?.revenue.fees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent financial transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-right p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialData?.transactions.map((txn) => (
                      <tr key={txn.id} className="border-b">
                        <td className="p-2">{new Date(txn.date).toLocaleDateString()}</td>
                        <td className="p-2">
                          <Badge variant={txn.type === 'inflow' ? 'default' : 'destructive'}>
                            {txn.type === 'inflow' ? 'Inflow' : 'Outflow'}
                          </Badge>
                        </td>
                        <td className="p-2">{txn.description}</td>
                        <td className="p-2">{txn.category}</td>
                        <td className={`p-2 text-right ${txn.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.type === 'inflow' ? '+' : '-'}${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {(!financialData?.transactions || financialData.transactions.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>Generate and download financial reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                  <FileText className="h-6 w-6 mb-2" />
                  <span>P&L Statement</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  <span>Balance Sheet</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                  <PieChartIcon className="h-6 w-6 mb-2" />
                  <span>Cash Flow Statement</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                  <Download className="h-6 w-6 mb-2" />
                  <span>Export All Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

