'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
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
  Bot,
  Shield,
  ChevronsLeft,
  ChevronsRight,
  Server,
  Copy
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
  const { isCollapsed, toggleCollapsed } = useSidebar()
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard', 'trading'])
  const pathname = usePathname()

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Check if mobile (viewport width < 768px)
      const isMobile = window.innerWidth < 768
      if (isMobile) {
        document.body.style.overflow = 'hidden'
      }
    } else {
      document.body.style.overflow = ''
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsOpen(false)
    }
  }, [pathname])

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-white/95 to-slate-50/95 dark:from-black/95 dark:to-black/95 backdrop-blur-xl border-r border-gray-200/20 dark:border-gray-800/20">
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-400 rounded-full animate-spin"></div>
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
        id: 'dashboard',
        title: 'Dashboard',
        icon: Home,
        href: '/dashboard',
        description: 'Dashboard Home'
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
        id: 'copy-trading',
        title: 'Copy Trading',
        icon: Copy,
        href: '/dashboard/copy-trading',
        description: 'Automated Copy Trading',
        badge: 'NEW'
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
            title: 'Trading Journal',
            icon: BookOpen,
            href: '/dashboard/trading-journal',
            description: 'View and Manage Trades'
          },
          {
            id: 'closed-trades',
            title: 'Closed Trades',
            icon: History,
            href: '/dashboard/trading-journal/closed-trades',
            description: 'View Closed Trade History'
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
          },
          {
            id: 'economic-calendar',
            title: 'Economic Calendar',
            icon: Calendar,
            href: '/dashboard/currency-database/economic-calendar',
            description: 'Track Economic Events'
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
        href: '#', // Not clickable - just a category
        description: 'Administration',
        subcategories: [
          {
            id: 'members',
            title: 'Members',
            icon: Users,
            href: '/dashboard/admin/members',
            description: 'Manage Users'
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
            id: 'metaapi-setup',
            title: 'MetaAPI Setup',
            icon: Server,
            href: '/dashboard/admin/metaapi-setup',
            description: 'Configure MetaAPI credentials & streaming'
          },
          {
            id: 'mt5-trade-history',
            title: 'MT5 Trade History',
            icon: History,
            href: '/dashboard/admin/mt5-history',
            description: 'View Archived Trading History'
          },
          {
            id: 'telegram-settings',
            title: 'Telegram Settings',
            icon: Bot,
            href: '/dashboard/admin/telegram-settings',
            description: 'Configure Telegram Bot Integration'
          },
          {
            id: 'metaapi-usage',
            title: 'MetaAPI Usage',
            icon: BarChart3,
            href: '/dashboard/admin/metaapi-usage',
            description: 'Track Credit Usage & Quotas'
          },
          {
            id: 'streaming-logs',
            title: 'Streaming Logs',
            icon: History,
            href: '/dashboard/admin/streaming-logs',
            description: 'View MT5 Streaming Events & TP/SL Changes'
          },
          {
            id: 'copy-trading-admin',
            title: 'Copy Trading',
            icon: Copy,
            href: '/dashboard/admin/copy-trading',
            description: 'Manage Copy Trading Strategy & Followers'
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
        className="md:hidden fixed top-4 left-4 z-[50] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg min-w-[44px] min-h-[44px] p-3 touch-manipulation"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="h-6 w-6 text-slate-900 dark:text-white" /> : <Menu className="h-6 w-6 text-slate-900 dark:text-white" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[40] bg-gradient-to-b from-white/95 to-slate-50/95 dark:from-black/95 dark:to-black/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 transform transition-all duration-300 ease-out shadow-2xl",
        // Mobile: always full width when open
        "w-64",
        // Desktop: collapse width based on state
        isCollapsed ? "md:w-20" : "md:w-64",
        // Desktop: always visible
        "md:translate-x-0",
        // Mobile: overlay behavior
        isOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Collapse Toggle Button - Desktop only, Mobile shows close button */}
          <div className="p-3 border-b border-gray-200/50 dark:border-gray-800/50">
            {/* Mobile: Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className={cn(
                "w-full min-h-[44px] p-3 rounded-lg transition-all duration-300",
                "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                "flex items-center justify-center gap-2",
                "active:scale-95 touch-manipulation",
                "group md:hidden"
              )}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                Close
              </span>
            </button>
            
            {/* Desktop: Collapse toggle button */}
            <button
              onClick={toggleCollapsed}
              className={cn(
                "w-full min-h-[44px] p-3 rounded-lg transition-all duration-300",
                "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                "flex items-center justify-center gap-2",
                "active:scale-95 touch-manipulation",
                "group hidden md:flex"
              )}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronsRight className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
              ) : (
                <>
                  <ChevronsLeft className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                    Collapse
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-2 md:p-4 overflow-y-auto">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <div key={item.id} className="space-y-1">
                  {/* Main Category */}
                  {item.subcategories && item.subcategories.length > 0 ? (
                    <div 
                      className={cn(
                        "flex items-center px-3 py-3 min-h-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700/50 transition-all duration-300 cursor-pointer group touch-manipulation active:scale-[0.98]",
                        isCollapsed ? "justify-center md:justify-center" : "justify-between"
                      )}
                      onClick={() => {
                        // On mobile, always expand subcategories
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          toggleExpanded(item.id)
                        } else {
                          // On desktop, handle collapse state
                          if (isCollapsed) {
                            toggleCollapsed()
                          } else {
                            toggleExpanded(item.id)
                          }
                        }
                      }}
                      title={isCollapsed ? `${item.title} - Click to expand sidebar` : undefined}
                    >
                      <div className={cn("flex items-center", isCollapsed ? "justify-center" : "space-x-3")}>
                        <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
                        {!isCollapsed && (
                          <div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {item.description}
                            </div>
                          </div>
                        )}
                      </div>
                      {!isCollapsed && (
                        expandedItems.includes(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )
                      )}
                    </div>
                  ) : (
                    <Link 
                      href={item.href}
                      onClick={() => {
                        // On mobile, close sidebar when navigating
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          setIsOpen(false)
                        } else {
                          // On desktop, expand if collapsed
                          if (isCollapsed) {
                            toggleCollapsed()
                          }
                        }
                      }}
                    >
                      <div className={cn(
                        "flex items-center px-3 py-3 min-h-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700/50 transition-all duration-300 cursor-pointer group touch-manipulation active:scale-[0.98]",
                        isCollapsed ? "justify-center md:justify-center" : "justify-between"
                      )}
                      title={isCollapsed ? `${item.title} - Click to expand sidebar` : undefined}>
                        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "space-x-3")}>
                          <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
                          {!isCollapsed && (
                            <div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {item.description}
                              </div>
                            </div>
                          )}
                        </div>
                        {!isCollapsed && item.badge && (
                          <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}

                  {/* Subcategories */}
                  {!isCollapsed && expandedItems.includes(item.id) && item.subcategories && (
                    <div className="ml-6 space-y-1">
                      {item.subcategories.map((sub) => (
                        <div key={sub.id} className="space-y-1">
                          <Link
                            href={sub.href}
                            onClick={() => {
                              // On mobile, close sidebar when navigating to subcategory
                              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                setIsOpen(false)
                              }
                            }}
                            className={cn(
                              "flex items-center space-x-3 px-3 py-3 min-h-[44px] rounded-lg transition-all duration-300 group touch-manipulation active:scale-[0.98]",
                              pathname === sub.href
                                ? "bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50"
                            )}
                          >
                            <sub.icon className={cn(
                              "w-4 h-4",
                              pathname === sub.href
                                ? "text-gray-900 dark:text-gray-100"
                                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                            )} />
                            <div className="flex-1">
                              <div className={cn(
                                "text-sm font-medium",
                                pathname === sub.href
                                  ? "text-gray-900 dark:text-gray-100"
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
            {isCollapsed ? (
              <div className="flex justify-center">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-sm">R</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                <div className="font-bold text-red-500 dark:text-red-400 mb-1">REDEMPTIONFX</div>
                <div>© 2024 - Rise from Ashes to Gold</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[30] md:hidden touch-manipulation"
          onClick={() => setIsOpen(false)}
          aria-label="Close sidebar"
        />
      )}
    </>
  )
}
