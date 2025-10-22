'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Menu,
  X,
  BarChart3,
  BookOpen,
  Database,
  ChevronDown,
  ChevronRight,
  Home,
  TrendingUp,
  PieChart,
  Activity,
  Settings,
  Users,
  CreditCard,
  Plus,
  History,
  Signal,
  Target,
  Megaphone,
  Sparkles,
  Zap,
  Calendar,
  Bot
} from 'lucide-react'

interface NavItem {
  id: string
  title: string
  icon: any
  href: string
  description: string
  badge?: string
  subcategories?: NavItem[]
}

interface SidebarProps {
  user: any
}

export function Sidebar({ user }: SidebarProps) {
  const { user: authUser, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard', 'trading'])
  const pathname = usePathname()

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-white/95 to-slate-50/95 dark:from-black/95 dark:to-black/95 backdrop-blur-xl border-r border-red-200/20 dark:border-red-800/20">
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  const toggleExpanded = (item: string) => {
    setExpandedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    )
  }

  // Filter navigation items based on user role
  const getNavigationItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        id: 'signals',
        title: 'Signals',
        icon: Signal,
        href: '/dashboard/signals',
        description: 'Trading Signals',
        subcategories: [
          {
            id: 'free-signals',
            title: 'Free Signals',
            icon: Target,
            href: '/dashboard/signals/free',
            description: 'Free Trading Signals'
          },
          {
            id: 'vip-signals',
            title: 'VIP Signals',
            icon: Zap,
            href: '/dashboard/signals/vip',
            description: 'VIP Trading Signals'
          }
        ]
      },
      {
        id: 'vip-results',
        title: 'VIP Results',
        icon: TrendingUp,
        href: '/dashboard/vip-results',
        description: 'Live Trading Performance',
        badge: 'LIVE'
      },
      {
        id: 'events',
        title: 'Events',
        icon: Calendar,
        href: '/dashboard/events',
        description: 'Browse and Apply to Events'
      },
      {
        id: 'trading',
        title: 'Trading Journal',
        icon: BookOpen,
        href: '/dashboard/trading-journal',
        description: 'Track Your Trades',
        subcategories: [
          {
            id: 'add-trades',
            title: 'Add Trades',
            icon: BookOpen,
            href: '/dashboard/trading-journal',
            description: 'Record New Trades'
          },
          {
            id: 'analytics',
            title: 'Analytics',
            icon: BarChart3,
            href: '/dashboard/analytics',
            description: 'Trading Performance Analytics'
          }
        ]
      },
      {
        id: 'database',
        title: 'Currency Database',
        icon: Database,
        href: '/dashboard/currency-database',
        description: 'Manage Currency Pairs',
        subcategories: [
          {
            id: 'currency-db',
            title: 'Currency Pairs',
            icon: Database,
            href: '/dashboard/currency-database',
            description: 'Edit Currency Database'
          }
        ]
      }
    ]

    // Only show admin section for admin users
    if (authUser?.isAdmin) {
      baseItems.push({
        id: 'admin',
        title: 'Admin',
        icon: Settings,
        href: '/dashboard/admin',
        description: 'Administration',
        subcategories: [
          {
            id: 'profiles',
            title: 'Manage Profiles',
            icon: Users,
            href: '/dashboard/profiles',
            description: 'Manage Trading Profiles'
          },
          {
            id: 'members',
            title: 'Members',
            icon: Users,
            href: '/dashboard/admin/members',
            description: 'Manage Users'
          },
          {
            id: 'admin-signals',
            title: 'Manage Signals',
            icon: Signal,
            href: '/dashboard/admin/signals',
            description: 'Create & Manage Signals'
          },
          {
            id: 'promotions',
            title: 'Promotions',
            icon: Megaphone,
            href: '/dashboard/admin/promotions',
            description: 'Manage Promotional Offers'
          },
          {
            id: 'events',
            title: 'Events',
            icon: Calendar,
            href: '/dashboard/admin/events',
            description: 'Manage Events and Applications'
          },
          {
            id: 'vip-sync',
            title: 'VIP Sync',
            icon: Activity,
            href: '/dashboard/admin/vip-sync',
            description: 'Manage VIP Trading Data Sync'
          },
          {
            id: 'telegram-settings',
            title: 'Telegram Settings',
            icon: Bot,
            href: '/dashboard/admin/telegram-settings',
            description: 'Configure Telegram Bot Integration'
          }
        ]
      })
    }

    return baseItems
  }

  const navigationItems = getNavigationItems()

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5 text-slate-900 dark:text-white" /> : <Menu className="h-5 w-5 text-slate-900 dark:text-white" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-white/95 to-slate-50/95 dark:from-black/95 dark:to-black/95 backdrop-blur-xl border-r border-red-200/20 dark:border-red-800/20 transform transition-all duration-500 ease-out shadow-2xl",
        "md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* RedemptionFX Brand Section */}
          <div className="p-6 border-b border-red-200/20 dark:border-red-800/20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 via-red-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-all duration-300">
                <span className="text-white font-black text-xl">R</span>
              </div>
              <div>
                <div className="text-xl font-black bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  REDEMPTION
                </div>
                <div className="text-xs text-red-500 dark:text-red-400 font-bold tracking-wider">
                  FX
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <div key={item.id} className="space-y-1">
                  {/* Main Category */}
                  {item.subcategories && item.subcategories.length > 0 ? (
                    <div 
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800/30 transition-all duration-300 cursor-pointer group"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-5 h-5 text-red-500 dark:text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300" />
                        <div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-red-700 dark:group-hover:text-red-300">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400">
                            {item.description}
                          </div>
                        </div>
                      </div>
                      {expandedItems.includes(item.id) ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  ) : (
                    <Link href={item.href}>
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800/30 transition-all duration-300 cursor-pointer group">
                        <div className="flex items-center space-x-3">
                          <item.icon className="w-5 h-5 text-red-500 dark:text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300" />
                          <div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-red-700 dark:group-hover:text-red-300">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400">
                              {item.description}
                            </div>
                          </div>
                        </div>
                        {item.badge && (
                          <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}

                  {/* Subcategories */}
                  {expandedItems.includes(item.id) && (
                    <div className="ml-6 space-y-1">
                      {item.subcategories.map((sub) => (
                        <div key={sub.id} className="space-y-1">
                          <Link
                            href={sub.href}
                            className={cn(
                              "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-300 group",
                              pathname === sub.href
                                ? "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50"
                            )}
                          >
                            <sub.icon className={cn(
                              "w-4 h-4",
                              pathname === sub.href
                                ? "text-red-600 dark:text-red-400"
                                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                            )} />
                            <div className="flex-1">
                              <div className={cn(
                                "text-sm font-medium",
                                pathname === sub.href
                                  ? "text-red-700 dark:text-red-300"
                                  : "text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                              )}>
                                {sub.title}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {sub.description}
                              </div>
                            </div>
                          </Link>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-red-200/20 dark:border-red-800/20">
            <div className="text-center text-xs text-slate-500 dark:text-slate-400">
              <div className="font-bold text-red-500 dark:text-red-400 mb-1">REDEMPTIONFX</div>
              <div>© 2024 - Rise from Ashes to Gold</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
