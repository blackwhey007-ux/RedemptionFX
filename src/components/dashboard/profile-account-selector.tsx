'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TradingProfile } from '@/types/profile'
import { UserCopyTradingAccount } from '@/lib/copyTradingRepo'
import { listUserCopyTradingAccounts } from '@/lib/copyTradingRepo'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Link2, 
  Unlink, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Copy,
  Server,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ProfileAccountSelectorProps {
  profile: TradingProfile
  onAccountLinked?: () => void
}

export function ProfileAccountSelector({ profile, onAccountLinked }: ProfileAccountSelectorProps) {
  const { user } = useAuth()
  const [copyTradingAccounts, setCopyTradingAccounts] = useState<UserCopyTradingAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [mt5AccountId, setMt5AccountId] = useState(profile.mt5AccountId || '')
  const [mt5AccountName, setMt5AccountName] = useState(profile.mt5AccountName || '')
  const [selectedCopyTradingAccountId, setSelectedCopyTradingAccountId] = useState(profile.copyTradingAccountId || '')
  
  // Track account creation errors (when account is created but linking fails)
  // MUST be declared before accountType and before any useEffect that uses it
  const [accountCreationError, setAccountCreationError] = useState<{
    accountId: string
    accountName: string
    error: string
  } | null>(null)
  
  const [accountType, setAccountType] = useState<'mt5' | 'copy-trading' | 'create-mt5' | 'none'>(
    profile.copyTradingAccountId ? 'copy-trading' : profile.mt5AccountId ? 'mt5' : 'mt5'
  )
  
  // MT5 account creation form state
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [newAccountData, setNewAccountData] = useState({
    broker: '',
    server: '',
    login: '',
    password: '',
    platform: 'mt5' as 'mt4' | 'mt5',
    name: ''
  })
  
  // Reset account type when profile changes
  // Only update if profile actually changed (not on every render)
  // IMPORTANT: Don't reset if we have an accountCreationError - user needs to retry linking
  useEffect(() => {
    // If there's an account creation error, don't reset state - user needs to retry
    if (accountCreationError) {
      return
    }
    
    // Check if profile has account linked
    if (profile.copyTradingAccountId) {
      if (accountType !== 'copy-trading' || selectedCopyTradingAccountId !== profile.copyTradingAccountId) {
        setAccountType('copy-trading')
        setSelectedCopyTradingAccountId(profile.copyTradingAccountId)
      }
    } else if (profile.mt5AccountId) {
      if (accountType !== 'mt5' || mt5AccountId !== profile.mt5AccountId) {
        setAccountType('mt5')
        setMt5AccountId(profile.mt5AccountId)
        setMt5AccountName(profile.mt5AccountName || '')
      }
    } else {
      // When no account is linked, default to 'mt5' to show the account ID input field
      // This allows users to immediately enter their existing MetaAPI account ID
      // Only change if we're not in the middle of creating an account or handling an error
      if (accountType !== 'create-mt5' && accountType !== 'mt5' && !accountCreationError) {
        setAccountType('mt5')
      }
    }
  }, [profile.id, profile.mt5AccountId, profile.copyTradingAccountId, profile.mt5AccountName, accountCreationError])

  // Load copy trading accounts
  useEffect(() => {
    const loadCopyTradingAccounts = async () => {
      if (!user?.uid) return
      
      try {
        setLoadingAccounts(true)
        const accounts = await listUserCopyTradingAccounts(user.uid)
        setCopyTradingAccounts(accounts)
      } catch (error) {
        console.error('Error loading copy trading accounts:', error)
        toast.error('Failed to load copy trading accounts')
      } finally {
        setLoadingAccounts(false)
      }
    }

    loadCopyTradingAccounts()
  }, [user?.uid])

  const handleLinkAccount = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to link an account')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/profiles/${profile.id}/link-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'x-user-email': user.email || '',
        },
        body: JSON.stringify({
          accountType,
          mt5AccountId: accountType === 'mt5' ? mt5AccountId : undefined,
          mt5AccountName: accountType === 'mt5' ? mt5AccountName : undefined,
          copyTradingAccountId: accountType === 'copy-trading' ? selectedCopyTradingAccountId : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link account')
      }

      toast.success('Account linked successfully')
      
      // Clear any account creation errors since linking succeeded
      setAccountCreationError(null)
      
      if (onAccountLinked) {
        onAccountLinked()
      }
    } catch (error) {
      console.error('Error linking account:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to link account')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to create an account')
      return
    }

    if (!newAccountData.server || !newAccountData.login || !newAccountData.password) {
      toast.error('Please fill in all required fields')
      return
    }

    setCreatingAccount(true)
    try {
      const response = await fetch('/api/mt5-accounts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'x-user-email': user.email || '',
        },
        body: JSON.stringify(newAccountData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Account created successfully, now link it to the profile
      const accountId = data.account.id
      const accountName = data.account.name
      
      setMt5AccountId(accountId)
      setMt5AccountName(accountName)
      setAccountType('mt5')
      
      toast.success('Account created successfully! Now linking to profile...')
      
      // Automatically link the account
      setLoading(true)
      try {
        const linkResponse = await fetch(`/api/profiles/${profile.id}/link-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid,
            'x-user-email': user.email || '',
          },
          body: JSON.stringify({
            accountType: 'mt5',
            mt5AccountId: accountId,
            mt5AccountName: accountName,
          }),
        })

        const linkData = await linkResponse.json()

        if (!linkResponse.ok) {
          throw new Error(linkData.error || 'Failed to link account')
        }

        toast.success('Account created and linked successfully!')
        
        // Reset form
        setNewAccountData({
          broker: '',
          server: '',
          login: '',
          password: '',
          platform: 'mt5',
          name: ''
        })
        
        // Reset account type to show linked state
        setAccountType('mt5')
        
        // Call callback to refresh profile data
        if (onAccountLinked) {
          try {
            await onAccountLinked()
          } catch (callbackError) {
            console.error('[ProfileAccountSelector] Error in onAccountLinked callback:', callbackError)
            // Don't fail the whole operation if callback fails
          }
        }
      } catch (linkError) {
        console.error('[ProfileAccountSelector] Error linking account:', linkError)
        const errorMsg = linkError instanceof Error ? linkError.message : 'Failed to link account'
        
        // CRITICAL: Account was created but linking failed - this costs money!
        // Show a prominent error and provide the account ID for manual linking
        toast.error(
          `⚠️ Account created in MetaAPI (ID: ${accountId}) but linking failed: ${errorMsg}. Please see the alert below to manually link the account.`,
          { duration: 10000 }
        )
        
        // Set error state to show prominent alert
        setAccountCreationError({
          accountId,
          accountName,
          error: errorMsg
        })
        
        // Keep the account ID in state so user can retry linking
        // Don't reset the form completely - user needs to manually link
        setMt5AccountId(accountId)
        setMt5AccountName(accountName)
        setAccountType('mt5') // Set to mt5 so they can see the account ID and retry
      } finally {
        setLoading(false)
        setCreatingAccount(false)
      }
    } catch (error) {
      console.error('[ProfileAccountSelector] Error creating account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
      console.error('[ProfileAccountSelector] Full error details:', {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Check if it's a 404/endpoint not found error
      if (errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('endpoint is not available')) {
        toast.error(
          'Account creation via API is not available. Please create your MT5 account in the MetaAPI dashboard first, then link it using "Link Existing MT5 Account" option.',
          { duration: 8000 }
        )
      } else {
        toast.error(`Failed to create account: ${errorMessage}`, { duration: 6000 })
      }
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleUnlinkAccount = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to unlink an account')
      return
    }

    if (!profile?.id) {
      toast.error('Profile ID is missing')
      return
    }

    setLoading(true)
    try {
      console.log('[ProfileAccountSelector] Unlinking account for profile:', profile.id)
      
      const response = await fetch(`/api/profiles/${profile.id}/link-account`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.uid,
          'x-user-email': user.email || '',
        },
      })

      console.log('[ProfileAccountSelector] Unlink response status:', response.status)

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = 'Failed to unlink account'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorMessage = `${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Parse JSON response
      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : { success: true }
      } catch (parseError) {
        console.warn('[ProfileAccountSelector] Could not parse response as JSON, assuming success')
        data = { success: true }
      }

      console.log('[ProfileAccountSelector] Account unlinked successfully:', data)

      toast.success('Account unlinked successfully')
      
      // Reset state - default to 'mt5' to show account ID input field immediately
      setAccountType('mt5')
      setMt5AccountId('')
      setMt5AccountName('')
      setSelectedCopyTradingAccountId('')
      
      // Refresh profile data
      if (onAccountLinked) {
        await onAccountLinked()
      }
    } catch (error) {
      console.error('[ProfileAccountSelector] Error unlinking account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlink account'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Check if account is actually linked in the profile, not just the UI state
  const isAccountLinked = !!(profile.mt5AccountId || profile.copyTradingAccountId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Account Linking
        </CardTitle>
        <CardDescription>
          Link an MT5 account or copy trading account to automatically sync trades to this journal profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show prominent alert if account was created but linking failed */}
        {accountCreationError && (
          <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="text-orange-900 dark:text-orange-100">
              Account Created but Linking Failed
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200 space-y-2">
              <p>
                Your MetaAPI account was created successfully, but linking to your profile failed. 
                The account ID has been saved below - you can manually link it now.
              </p>
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium mb-1">Account Details:</p>
                <div className="space-y-1 text-sm">
                  <p><strong>Account ID:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{accountCreationError.accountId}</code></p>
                  <p><strong>Account Name:</strong> {accountCreationError.accountName}</p>
                  <p><strong>Error:</strong> {accountCreationError.error}</p>
                </div>
              </div>
              <p className="text-sm mt-2">
                The account ID is already filled in below. Click "Link Account" to retry linking.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAccountCreationError(null)}
                className="mt-2 border-orange-300 dark:border-orange-700"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {isAccountLinked && accountType !== 'create-mt5' && !accountCreationError ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Account Linked
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {accountType === 'copy-trading' 
                      ? `Copy Trading: ${copyTradingAccounts.find(a => a.accountId === selectedCopyTradingAccountId)?.strategyName || selectedCopyTradingAccountId}`
                      : `MT5: ${mt5AccountName || mt5AccountId}`
                    }
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlinkAccount}
                disabled={loading}
                className="border-red-200 dark:border-red-800"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Unlink
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Account Type</Label>
              <Select 
                value={accountType === 'none' ? undefined : accountType} 
                onValueChange={(value) => {
                  console.log('[ProfileAccountSelector] Account type changed to:', value)
                  setAccountType(value as typeof accountType)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mt5">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      Link Existing MT5 Account (Recommended)
                    </div>
                  </SelectItem>
                  <SelectItem value="create-mt5">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      Create New MT5 Account
                    </div>
                  </SelectItem>
                  <SelectItem value="copy-trading">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4" />
                      Copy Trading Account
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                If you already have a MetaAPI account ID, use "Link Existing MT5 Account" and enter your account ID.
              </p>
            </div>

            {accountType === 'mt5' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Link Your Existing MetaAPI Account
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    Enter your MetaAPI account ID below. You can find this in your MetaAPI dashboard or use an account you created earlier.
                  </p>
                </div>
                <div>
                  <Label htmlFor="mt5AccountId">MetaAPI Account ID *</Label>
                  <Input
                    id="mt5AccountId"
                    value={mt5AccountId}
                    onChange={(e) => setMt5AccountId(e.target.value)}
                    placeholder="e.g., c95162fb-61f7-4fd4-b20b-03e4e40bfea2"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This is the account ID from your MetaAPI dashboard. If you just created an account, use the ID shown in the alert above.
                  </p>
                </div>
                <div>
                  <Label htmlFor="mt5AccountName">Account Name (Optional)</Label>
                  <Input
                    id="mt5AccountName"
                    value={mt5AccountName}
                    onChange={(e) => setMt5AccountName(e.target.value)}
                    placeholder="e.g., My Live Account"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    A friendly name to identify this account in your journal
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAccountType('create-mt5')}
                  className="w-full"
                >
                  Don't have an account? Create a new one
                </Button>
              </div>
            )}

            {accountType === 'create-mt5' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Create New MT5 Account
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    Enter your MT5 account credentials to create a MetaAPI connection. This will be used for streaming trades to your journal.
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 italic">
                    Note: If account creation fails, you can create the account in the MetaAPI dashboard first, then use "Link Existing MT5 Account" to link it.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="broker">Broker Name (Optional - Not Used by MetaAPI)</Label>
                  <Input
                    id="broker"
                    value={newAccountData.broker}
                    onChange={(e) => setNewAccountData({...newAccountData, broker: e.target.value})}
                    placeholder="e.g., IC Markets, FXTM (for reference only)"
                    disabled
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Note: MetaAPI doesn't use the broker field. It's stored for your reference only.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="server">Server *</Label>
                  <Input
                    id="server"
                    value={newAccountData.server}
                    onChange={(e) => setNewAccountData({...newAccountData, server: e.target.value})}
                    placeholder="e.g., ICMarkets-Demo, FXTM-Demo"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="login">Login (Account Number) *</Label>
                  <Input
                    id="login"
                    type="text"
                    inputMode="numeric"
                    value={newAccountData.login}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/\D/g, '')
                      setNewAccountData({...newAccountData, login: value})
                    }}
                    placeholder="Your MT5 account number (numbers only)"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter your MT5 account number (numeric only)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAccountData.password}
                    onChange={(e) => setNewAccountData({...newAccountData, password: e.target.value})}
                    placeholder="Your MT5 account password"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="platform">Platform *</Label>
                  <Select
                    value={newAccountData.platform}
                    onValueChange={(v) => setNewAccountData({...newAccountData, platform: v as 'mt4' | 'mt5'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mt5">MT5</SelectItem>
                      <SelectItem value="mt4">MT4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="accountName">Account Name (Optional)</Label>
                  <Input
                    id="accountName"
                    value={newAccountData.name}
                    onChange={(e) => setNewAccountData({...newAccountData, name: e.target.value})}
                    placeholder="e.g., My Live Account"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAccountType('mt5')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateAccount}
                    disabled={creatingAccount || !newAccountData.server || !newAccountData.login || !newAccountData.password}
                    className="flex-1"
                  >
                    {creatingAccount ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {accountType === 'copy-trading' && (
              <div>
                <Label>Copy Trading Account</Label>
                {loadingAccounts ? (
                  <div className="flex items-center gap-2 p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-500">Loading accounts...</span>
                  </div>
                ) : copyTradingAccounts.length === 0 ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      No copy trading accounts found. Create one in the Copy Trading section first.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={selectedCopyTradingAccountId}
                    onValueChange={setSelectedCopyTradingAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select copy trading account" />
                    </SelectTrigger>
                    <SelectContent>
                      {copyTradingAccounts.map((account) => (
                        <SelectItem key={account.accountId} value={account.accountId}>
                          <div className="flex flex-col">
                            <span className="font-medium">{account.strategyName}</span>
                            <span className="text-xs text-gray-500">
                              {account.broker} - {account.login}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {accountType !== 'create-mt5' && (
              <Button
                onClick={handleLinkAccount}
                disabled={loading || accountType === 'none' || 
                  (accountType === 'mt5' && !mt5AccountId) ||
                  (accountType === 'copy-trading' && !selectedCopyTradingAccountId)}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Link Account
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

