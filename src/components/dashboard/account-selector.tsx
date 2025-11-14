'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { LinkedAccount, getUserLinkedAccounts, getActiveAccount } from '@/lib/accountService'
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
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface AccountSelectorProps {
  onAccountLinked?: () => void
  onAccountChanged?: (accountLinkId: string | null) => void
}

export function AccountSelector({ onAccountLinked, onAccountChanged }: AccountSelectorProps) {
  const { user } = useAuth()
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<LinkedAccount | null>(null)
  const [copyTradingAccounts, setCopyTradingAccounts] = useState<UserCopyTradingAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [mt5AccountId, setMt5AccountId] = useState('')
  const [mt5AccountName, setMt5AccountName] = useState('')
  const [selectedCopyTradingAccountId, setSelectedCopyTradingAccountId] = useState('')
  
  // Track account creation errors
  const [accountCreationError, setAccountCreationError] = useState<{
    accountId: string
    accountName: string
    error: string
  } | null>(null)
  
  const [accountType, setAccountType] = useState<'mt5' | 'copy-trading' | 'create-mt5'>('mt5')
  const [isExpanded, setIsExpanded] = useState(false) // Collapsible state
  
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

  // Load linked accounts and active account
  useEffect(() => {
    const loadAccounts = async () => {
      if (!user?.uid) return
      
      try {
        setLoadingAccounts(true)
        const accounts = await getUserLinkedAccounts(user.uid)
        setLinkedAccounts(accounts)
        
        const active = await getActiveAccount(user.uid)
        setActiveAccount(active)
        
        if (active && onAccountChanged) {
          onAccountChanged(active.id)
        }
      } catch (error) {
        console.error('Error loading accounts:', error)
        toast.error('Failed to load accounts')
      } finally {
        setLoadingAccounts(false)
      }
    }

    loadAccounts()
  }, [user?.uid, onAccountChanged])

  // Load copy trading accounts
  useEffect(() => {
    const loadCopyTradingAccounts = async () => {
      if (!user?.uid) return
      
      try {
        const accounts = await listUserCopyTradingAccounts(user.uid)
        setCopyTradingAccounts(accounts)
      } catch (error) {
        console.error('Error loading copy trading accounts:', error)
      }
    }

    loadCopyTradingAccounts()
  }, [user?.uid])

  // Track if form has been manually edited by user
  const [isFormManuallyEdited, setIsFormManuallyEdited] = useState(false)
  
  // Update form state when active account changes (only on initial load, not when user is adding new account)
  useEffect(() => {
    // Only auto-populate form if user hasn't manually edited it
    // This prevents resetting form when user is trying to add a new account
    if (!isFormManuallyEdited) {
      if (activeAccount) {
        if (activeAccount.mt5AccountId) {
          setMt5AccountId(activeAccount.mt5AccountId)
          setMt5AccountName(activeAccount.accountName)
          setAccountType('mt5')
        } else if (activeAccount.copyTradingAccountId) {
          setSelectedCopyTradingAccountId(activeAccount.copyTradingAccountId)
          setAccountType('copy-trading')
        }
      } else {
        // No account linked, show MT5 form by default
        setAccountType('mt5')
        setMt5AccountId('')
        setMt5AccountName('')
        setSelectedCopyTradingAccountId('')
      }
    }
  }, [activeAccount, isFormManuallyEdited])

  const handleLinkAccount = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to link an account')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/accounts/link', {
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
          accountName: accountType === 'mt5' ? mt5AccountName : undefined,
          copyTradingAccountId: accountType === 'copy-trading' ? selectedCopyTradingAccountId : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link account')
      }

      toast.success('Account linked successfully')
      
      // Clear any account creation errors
      setAccountCreationError(null)
      
      // Reset form and allow auto-population again
      setMt5AccountId('')
      setMt5AccountName('')
      setSelectedCopyTradingAccountId('')
      setAccountType('mt5')
      setIsFormManuallyEdited(false)
      
      // Reload accounts
      const accounts = await getUserLinkedAccounts(user.uid)
      setLinkedAccounts(accounts)
      
      const active = await getActiveAccount(user.uid)
      setActiveAccount(active)
      
      if (active && onAccountChanged) {
        onAccountChanged(active.id)
      }
      
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

      // Account created successfully, now link it
      const accountId = data.account.id
      const accountName = data.account.name
      
      setMt5AccountId(accountId)
      setMt5AccountName(accountName)
      setAccountType('mt5')
      
      toast.success('Account created successfully! Now linking...')
      
      // Automatically link the account
      setLoading(true)
      try {
        const linkResponse = await fetch('/api/accounts/link', {
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
            accountName: accountName,
          }),
        })

        const linkData = await linkResponse.json()

        if (!linkResponse.ok) {
          throw new Error(linkData.error || 'Failed to link account')
        }

        toast.success('Account created and linked successfully!')
        
        setNewAccountData({
          broker: '',
          server: '',
          login: '',
          password: '',
          platform: 'mt5',
          name: ''
        })
        
        setAccountType('mt5')
        setIsFormManuallyEdited(false) // Reset flag after successful link
        
        // Reload accounts
        const accounts = await getUserLinkedAccounts(user.uid)
        setLinkedAccounts(accounts)
        
        const active = await getActiveAccount(user.uid)
        setActiveAccount(active)
        
        if (active && onAccountChanged) {
          onAccountChanged(active.id)
        }
        
        if (onAccountLinked) {
          onAccountLinked()
        }
      } catch (linkError) {
        console.error('Error linking account:', linkError)
        const errorMsg = linkError instanceof Error ? linkError.message : 'Failed to link account'
        
        toast.error(
          `⚠️ Account created in MetaAPI (ID: ${accountId}) but linking failed: ${errorMsg}. Please see the alert below to manually link the account.`,
          { duration: 10000 }
        )
        
        setAccountCreationError({
          accountId,
          accountName,
          error: errorMsg
        })
        
        setMt5AccountId(accountId)
        setMt5AccountName(accountName)
        setAccountType('mt5')
      } finally {
        setLoading(false)
        setCreatingAccount(false)
      }
    } catch (error) {
      console.error('Error creating account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
      
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
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

  const handleUnlinkAccount = async (accountLinkId: string) => {
    if (!user?.uid) {
      toast.error('You must be logged in to unlink an account')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/accounts/${accountLinkId}/unlink`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.uid,
          'x-user-email': user.email || '',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unlink account')
      }

      toast.success('Account unlinked successfully')
      
      // Reload accounts
      const accounts = await getUserLinkedAccounts(user.uid)
      setLinkedAccounts(accounts)
      
      const active = await getActiveAccount(user.uid)
      setActiveAccount(active)
      
      if (onAccountChanged) {
        onAccountChanged(active?.id || null)
      }
      
      if (onAccountLinked) {
        onAccountLinked()
      }
    } catch (error) {
      console.error('Error unlinking account:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to unlink account')
    } finally {
      setLoading(false)
    }
  }

  const isAccountLinked = linkedAccounts.length > 0

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800/50 shadow-lg">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isAccountLinked ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              {isAccountLinked ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                Account Linking
                {isAccountLinked && (
                  <Badge variant="default" className="ml-2 bg-green-500 hover:bg-green-600">
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {isAccountLinked 
                  ? `${linkedAccounts.length} account${linkedAccounts.length > 1 ? 's' : ''} linked • Click to ${isExpanded ? 'collapse' : 'expand'} or add more accounts`
                  : 'Link an MT5 account or copy trading account to automatically sync trades to your journal'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAccountLinked && !isExpanded && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(true)
                  // Reset form for new account
                  setAccountType('mt5')
                  setMt5AccountId('')
                  setMt5AccountName('')
                  setSelectedCopyTradingAccountId('')
                  setIsFormManuallyEdited(false) // Allow fresh start
                }}
                className="text-xs"
              >
                <Link2 className="w-3 h-3 mr-1" />
                Add Account
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {(isExpanded || !isAccountLinked) && (
        <CardContent className="space-y-4 pt-0">
        {/* Show prominent alert if account was created but linking failed */}
        {accountCreationError && (
          <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="text-orange-900 dark:text-orange-100">
              Account Created but Linking Failed
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200 space-y-2">
              <p>
                Your MetaAPI account was created successfully, but linking failed. 
                The account ID has been saved below - you can manually link it now.
              </p>
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium mb-1">Account Details:</p>
                <div className="space-y-1 text-sm">
                  <p><strong>Account ID:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{accountCreationError.accountId}</code></p>
                  <p><strong>Account Name:</strong> {accountCreationError.accountName}</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Show linked accounts */}
        {isAccountLinked && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Linked Accounts</Label>
              <Badge variant="secondary">{linkedAccounts.length} linked</Badge>
            </div>
            {linkedAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={account.isActive ? 'default' : 'secondary'}>
                    {account.accountType === 'MT5' ? 'MT5' : 'Copy Trading'}
                  </Badge>
                  <div>
                    <p className="font-medium">{account.accountName}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.mt5AccountId || account.copyTradingAccountId}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnlinkAccount(account.id)}
                  disabled={loading}
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Unlink
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add Another Account Section */}
        {isAccountLinked && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-base font-semibold">Add Another Account</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Link additional accounts to view trades from multiple accounts
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Account type selector */}
        <div className="space-y-2">
          <Label>{isAccountLinked ? 'New Account Type' : 'Account Type'}</Label>
          <Select 
            value={accountType} 
            onValueChange={(value: any) => {
              setIsFormManuallyEdited(true)
              setAccountType(value)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mt5">Link Existing MT5 Account</SelectItem>
              <SelectItem value="create-mt5">Create New MT5 Account</SelectItem>
              <SelectItem value="copy-trading">Link Copy Trading Account</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Create new MT5 account form */}
        {accountType === 'create-mt5' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              <Label className="text-base font-semibold">Create New MT5 Account</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="server">Server *</Label>
                <Input
                  id="server"
                  value={newAccountData.server}
                  onChange={(e) => setNewAccountData({ ...newAccountData, server: e.target.value })}
                  placeholder="e.g., Demo-Server"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login">Login *</Label>
                <Input
                  id="login"
                  type="text"
                  inputMode="numeric"
                  value={newAccountData.login}
                  onChange={(e) => setNewAccountData({ ...newAccountData, login: e.target.value })}
                  placeholder="Account number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAccountData.password}
                  onChange={(e) => setNewAccountData({ ...newAccountData, password: e.target.value })}
                  placeholder="Account password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={newAccountData.name}
                  onChange={(e) => setNewAccountData({ ...newAccountData, name: e.target.value })}
                  placeholder="Optional display name"
                />
              </div>
            </div>
            
            <Button
              onClick={handleCreateAccount}
              disabled={creatingAccount || loading}
              className="w-full"
            >
              {creatingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </div>
        )}

        {/* Link existing MT5 account form */}
        {accountType === 'mt5' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mt5AccountId">MetaAPI Account ID *</Label>
              <Input
                id="mt5AccountId"
                value={mt5AccountId}
                onChange={(e) => {
                  setIsFormManuallyEdited(true)
                  setMt5AccountId(e.target.value)
                }}
                placeholder="Enter your MetaAPI account ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mt5AccountName">Account Name</Label>
              <Input
                id="mt5AccountName"
                value={mt5AccountName}
                onChange={(e) => {
                  setIsFormManuallyEdited(true)
                  setMt5AccountName(e.target.value)
                }}
                placeholder="Optional display name"
              />
            </div>
            
            <Button
              onClick={handleLinkAccount}
              disabled={loading || !mt5AccountId}
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
          </div>
        )}

        {/* Link copy trading account form */}
        {accountType === 'copy-trading' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="copyTradingAccount">Copy Trading Account</Label>
              <Select
                value={selectedCopyTradingAccountId}
                onValueChange={(value) => {
                  setIsFormManuallyEdited(true)
                  setSelectedCopyTradingAccountId(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a copy trading account" />
                </SelectTrigger>
                <SelectContent>
                  {copyTradingAccounts.map((account) => (
                    <SelectItem key={account.accountId} value={account.accountId}>
                      {account.strategyName} - {account.accountId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={handleLinkAccount}
              disabled={loading || !selectedCopyTradingAccountId}
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
          </div>
        )}
        </CardContent>
      )}
    </Card>
  )
}



