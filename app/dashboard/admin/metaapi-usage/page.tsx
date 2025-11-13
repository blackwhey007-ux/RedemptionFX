'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Activity,
  AlertCircle,
  BarChart,
  CreditCard,
  DollarSign,
  Loader2,
  RefreshCw,
  Server,
  TrendingUp,
  Users,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Progress } from '@/components/ui/progress'

interface CreditUsage {
  used: number
  available: number
  remaining: number
  percentage: number
}

interface Quota {
  accounts: { max: number; used: number }
  subscriptionSlots: { max: number; used: number }
  provisioningProfiles: { max: number; used: number }
}

interface BillingInfo {
  currentPeriod: {
    startDate: string
    endDate: string
    creditsUsed: number
    apiCalls: number
  }
  subscription: {
    plan: string
    status: string
  }
}

interface UsageData {
  credits: CreditUsage | null
  quota: Quota | null
  billing: BillingInfo | null
  accounts: {
    total: number
    list: Array<{
      id: string
      name: string
      login: number
      server: string
      state: string
      connectionStatus: string
    }>
  }
  accountMetadata?: {
    id: string
    name: string
    login: number
    server: string
    platform: string
    state: string
    connectionStatus: string
    region?: string
    regionId?: string
    [key: string]: any
  } | null
  diagnostics?: {
    endpointsTried: Array<{
      type: string
      endpoint?: string
      endpoints?: string[]
      error?: string
      note?: string
      timestamp: string
    }>
    sdkAvailable: boolean
    restApiAvailable: boolean
  }
  autoSelectedAccountId?: string
  lastUpdated: string
  warnings?: string[]
}

export default function MetaAPIUsagePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const loadUsageData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/metaapi/usage', {
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      const data = await response.json()

      if (data.success) {
        setUsageData(data.data)
        // Show warnings if any (but don't treat as errors)
        if (data.data.warnings && data.data.warnings.length > 0) {
          console.warn('Usage data warnings:', data.data.warnings)
        }
      } else {
        setError(data.error || 'Failed to fetch usage data')
      }
    } catch (err) {
      console.error('Error loading usage data:', err)
      setError('Failed to load usage data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsageData()
  }, [])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        void loadUsageData()
      }, 5 * 60 * 1000) // Refresh every 5 minutes
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-amber-600'
    return 'text-green-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MetaAPI Usage & Billing</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your MetaAPI credit usage, quotas, and billing information
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <Label htmlFor="auto-refresh" className="text-sm">
              Auto-refresh (5 min)
            </Label>
          </div>
          <Button
            variant="outline"
            onClick={loadUsageData}
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {usageData?.warnings && usageData.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Note</AlertTitle>
          <AlertDescription>
            Some data may not be available: {usageData.warnings.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {loading && !usageData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading usage data...</span>
        </div>
      ) : usageData ? (
        <div className="space-y-6">
          {/* Account Metadata from SDK (this should work) */}
          {usageData.accountMetadata && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Account Information (via SDK)
                </CardTitle>
                <CardDescription>
                  Account details retrieved using MetaAPI SDK
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Account Name</p>
                    <p className="text-lg font-bold mt-1">
                      {usageData.accountMetadata.name || `Account ${usageData.accountMetadata.login}`}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Login</p>
                    <p className="text-lg font-bold mt-1">
                      {usageData.accountMetadata.login}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Server</p>
                    <p className="text-lg font-bold mt-1">
                      {usageData.accountMetadata.server}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Platform</p>
                    <p className="text-lg font-bold mt-1">
                      {usageData.accountMetadata.platform}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">State</p>
                    <Badge variant={usageData.accountMetadata.state === 'DEPLOYED' ? 'default' : 'secondary'}>
                      {usageData.accountMetadata.state}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Connection Status</p>
                    <Badge variant={usageData.accountMetadata.connectionStatus === 'CONNECTED' ? 'default' : 'outline'}>
                      {usageData.accountMetadata.connectionStatus}
                    </Badge>
                  </div>
                  {usageData.accountMetadata.region && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Region</p>
                      <p className="text-lg font-bold mt-1">
                        {usageData.accountMetadata.region}
                      </p>
                    </div>
                  )}
                  {usageData.accountMetadata.regionId && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Region ID</p>
                      <p className="text-lg font-bold mt-1">
                        {usageData.accountMetadata.regionId}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnostics Section */}
          {usageData.diagnostics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Diagnostics
                </CardTitle>
                <CardDescription>
                  API endpoint availability and connection status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {usageData.diagnostics.sdkAvailable ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">SDK Available:</span>
                      <Badge variant={usageData.diagnostics.sdkAvailable ? 'default' : 'destructive'}>
                        {usageData.diagnostics.sdkAvailable ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {usageData.diagnostics.restApiAvailable ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">REST API Available:</span>
                      <Badge variant={usageData.diagnostics.restApiAvailable ? 'default' : 'destructive'}>
                        {usageData.diagnostics.restApiAvailable ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  
                  {usageData.diagnostics.endpointsTried && usageData.diagnostics.endpointsTried.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Endpoints Attempted:</h4>
                      <div className="space-y-2">
                        {usageData.diagnostics.endpointsTried.map((attempt, idx) => (
                          <div key={idx} className="text-sm p-2 rounded border bg-muted/50">
                            <div className="font-medium">{attempt.type}</div>
                            {attempt.endpoint && (
                              <div className="text-muted-foreground font-mono text-xs mt-1">
                                {attempt.endpoint}
                              </div>
                            )}
                            {attempt.endpoints && (
                              <div className="text-muted-foreground font-mono text-xs mt-1">
                                {attempt.endpoints.join(', ')}
                              </div>
                            )}
                            {attempt.error && (
                              <div className="text-red-600 text-xs mt-1">
                                Error: {attempt.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CPU Credits Section */}
          {usageData.credits ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  CPU Credits Usage
                  {usageData.autoSelectedAccountId && (
                    <Badge variant="outline" className="ml-2">
                      Auto-selected account
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {usageData.autoSelectedAccountId 
                    ? `Showing credits for account ${usageData.autoSelectedAccountId.substring(0, 8)}... (auto-selected)`
                    : 'Track your CPU credit consumption across MetaAPI accounts'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Used Credits</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatNumber(usageData.credits.used)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Available Credits</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatNumber(usageData.credits.available)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Remaining Credits</p>
                    <p className={`text-2xl font-bold mt-1 ${getPercentageColor(usageData.credits.percentage)}`}>
                      {formatNumber(usageData.credits.remaining)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Usage Percentage</p>
                    <p className={`text-2xl font-bold mt-1 ${getPercentageColor(usageData.credits.percentage)}`}>
                      {usageData.credits.percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Credit Usage</span>
                    <span className={getPercentageColor(usageData.credits.percentage)}>
                      {usageData.credits.percentage.toFixed(2)}%
                    </span>
                  </div>
                  <Progress 
                    value={usageData.credits.percentage} 
                    className="h-2"
                  />
                </div>
                {usageData.credits.percentage >= 90 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      You have used {usageData.credits.percentage.toFixed(2)}% of your CPU credits. Consider monitoring usage closely.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  CPU Credits Usage
                </CardTitle>
                <CardDescription>
                  Credit usage data is not available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 space-y-2">
                  <p className="text-muted-foreground">
                    {usageData.accounts && usageData.accounts.total > 0
                      ? 'Credit usage data is not available. This may be because the credit usage endpoint is not accessible for your account, or your MetaAPI plan does not include credit tracking.'
                      : 'No accounts found to fetch credit usage. Please ensure you have at least one MetaTrader account configured in MetaAPI, or set MT5_ACCOUNT_ID in your environment variables.'}
                  </p>
                  {usageData.accounts && usageData.accounts.total === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Tip: You can set MT5_ACCOUNT_ID in your .env.local file to specify which account to use for credit tracking.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quota Section */}
          {usageData.quota ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Account Quotas
                </CardTitle>
                <CardDescription>
                  Monitor your account limits and current usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Accounts Quota */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Accounts</span>
                      </div>
                      <Badge variant="secondary">
                        {usageData.quota.accounts.used} / {usageData.quota.accounts.max}
                      </Badge>
                    </div>
                    <Progress 
                      value={(usageData.quota.accounts.used / usageData.quota.accounts.max) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {usageData.quota.accounts.max - usageData.quota.accounts.used} accounts remaining
                    </p>
                  </div>

                  {/* Subscription Slots Quota */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Subscription Slots</span>
                      </div>
                      <Badge variant="secondary">
                        {usageData.quota.subscriptionSlots.used} / {usageData.quota.subscriptionSlots.max}
                      </Badge>
                    </div>
                    <Progress 
                      value={(usageData.quota.subscriptionSlots.used / usageData.quota.subscriptionSlots.max) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {usageData.quota.subscriptionSlots.max - usageData.quota.subscriptionSlots.used} slots remaining
                    </p>
                  </div>

                  {/* Provisioning Profiles Quota */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Provisioning Profiles</span>
                      </div>
                      <Badge variant="secondary">
                        {usageData.quota.provisioningProfiles.used} / {usageData.quota.provisioningProfiles.max}
                      </Badge>
                    </div>
                    <Progress 
                      value={(usageData.quota.provisioningProfiles.used / usageData.quota.provisioningProfiles.max) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {usageData.quota.provisioningProfiles.max - usageData.quota.provisioningProfiles.used} profiles remaining
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Account Quotas
                </CardTitle>
                <CardDescription>
                  Quota information is not available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Quota information is not available. This may require specific API permissions.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing Section */}
          {usageData.billing ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Billing Information
                </CardTitle>
                <CardDescription>
                  Current subscription and usage period details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-3">Subscription</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Plan:</span>
                        <span className="font-medium">{usageData.billing.subscription.plan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant={usageData.billing.subscription.status === 'active' ? 'default' : 'secondary'}>
                          {usageData.billing.subscription.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-3">Current Period</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Period:</span>
                        <span className="text-sm">
                          {formatDate(usageData.billing.currentPeriod.startDate)} - {formatDate(usageData.billing.currentPeriod.endDate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Credits Used:</span>
                        <span className="font-medium">{formatNumber(usageData.billing.currentPeriod.creditsUsed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">API Calls:</span>
                        <span className="font-medium">{formatNumber(usageData.billing.currentPeriod.apiCalls)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Billing Information
                </CardTitle>
                <CardDescription>
                  Billing information is not available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Billing information may not be available in your MetaAPI plan or may require additional permissions.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accounts List */}
          {usageData.accounts && usageData.accounts.total > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Connected Accounts ({usageData.accounts.total})
                </CardTitle>
                <CardDescription>
                  List of all MetaAPI accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usageData.accounts.list.slice(0, 10).map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{account.name || `Account ${account.login}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.server} • Login: {account.login}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={account.state === 'DEPLOYED' ? 'default' : 'secondary'}>
                          {account.state}
                        </Badge>
                        <Badge variant={account.connectionStatus === 'CONNECTED' ? 'default' : 'outline'}>
                          {account.connectionStatus}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {usageData.accounts.list.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      ... and {usageData.accounts.list.length - 10} more accounts
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Connected Accounts
                </CardTitle>
                <CardDescription>
                  Account listing is not available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Account listing requires specific API permissions. This feature is optional and the page works without it.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Helpful Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Additional Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Note: Credit usage, quota, and billing information may not be available through the REST API.
                  These features may require:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-4">
                  <li>Specific API permissions on your MetaAPI token</li>
                  <li>Access to MetaAPI dashboard for manual checking</li>
                  <li>Different API endpoints (may vary by plan)</li>
                </ul>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://app.metaapi.cloud/', '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open MetaAPI Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last Updated */}
          <div className="text-sm text-muted-foreground text-center">
            Last updated: {new Date(usageData.lastUpdated).toLocaleString()}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No usage data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Make sure METAAPI_TOKEN is configured in your environment variables
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

