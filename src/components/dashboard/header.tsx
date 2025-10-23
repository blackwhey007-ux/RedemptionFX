'use client'

import { signOutUser } from '@/lib/firebaseAuth'
import { LogOut, User, Crown, Star, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { useRouter } from 'next/navigation'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RedemptionLogo } from '@/components/ui/redemption-logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  user: {
    uid: string
    displayName: string | null
    email: string | null
    role: string
    photoURL: string | null
    status?: string
    paymentInfo?: {
      plan?: string
      amount?: number
      currency?: string
      paidAt?: string
      expiresAt?: string
    }
  }
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const result = await signOutUser()
    if (result.success) {
      router.push('/sign-in')
    }
  }

  const getRoleBadge = () => {
    switch (user.role) {
      case 'admin':
        return {
          icon: <Crown className="h-3 w-3" />,
          text: 'Admin',
          variant: 'default' as const,
          className: 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
        }
      case 'vip':
        return {
          icon: <Star className="h-3 w-3" />,
          text: 'VIP Member',
          variant: 'secondary' as const,
          className: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
        }
      case 'guest':
        return {
          icon: <Eye className="h-3 w-3" />,
          text: 'Guest',
          variant: 'outline' as const,
          className: 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
        }
      default:
        return {
          icon: <User className="h-3 w-3" />,
          text: 'Member',
          variant: 'outline' as const,
          className: 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
        }
    }
  }

  const roleBadge = getRoleBadge()

  return (
    <header className="bg-gradient-to-r from-white/90 to-red-50/90 dark:from-black/90 dark:to-red-900/20 backdrop-blur-sm border-b border-red-200/30 dark:border-red-800/30 px-4 md:px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        {/* Logo and Welcome Message */}
        <div className="flex items-center space-x-4">
          <RedemptionLogo size="md" className="text-red-600 dark:text-red-400" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-orange-500 dark:from-red-400 dark:via-red-300 dark:to-orange-400 bg-clip-text text-transparent">
              Welcome back, {user.displayName?.split(' ')[0] || 'Trader'}!
            </h1>
          </div>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Unified Notifications for All Users */}
          <NotificationBell 
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
            maxNotifications={10}
            showSettings={true}
          />
          
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-auto px-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                    <AvatarFallback className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold">
                      {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-32">
                      {user.displayName || 'User'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-32">
                      {user.email}
                    </span>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <DropdownMenuLabel className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                  <AvatarFallback className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold">
                    {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{user.displayName || 'User'}</span>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Role Badge in Dropdown */}
              <DropdownMenuItem className="flex items-center space-x-2 cursor-default">
                {roleBadge.icon}
                <span className="font-medium">{roleBadge.text}</span>
              </DropdownMenuItem>
              
              {/* Subscription Status for VIP/Guest */}
              {user.role === 'vip' && user.paymentInfo && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          VIP Subscription
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          Plan: {user.paymentInfo.plan || 'VIP'}
                        </p>
                        {user.paymentInfo.expiresAt && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">
                            Expires: {(() => {
                              try {
                                const date = new Date(user.paymentInfo.expiresAt);
                                if (isNaN(date.getTime())) {
                                  return 'Not set';
                                }
                                return date.toLocaleDateString();
                              } catch (error) {
                                return 'Not set';
                              }
                            })()}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
                        Active
                      </Badge>
                    </div>
                  </div>
                </>
              )}

              {user.role === 'guest' && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/20 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          Guest Access
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Limited features available
                        </p>
                      </div>
                      <Badge variant="outline" className="border-gray-500 text-gray-600 bg-gray-50 dark:bg-gray-900/20">
                        Free
                      </Badge>
                    </div>
                  </div>
                </>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => router.push('/dashboard/profile')}
              >
                <User className="h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                className="flex items-center space-x-2 cursor-pointer text-red-600 dark:text-red-400"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}