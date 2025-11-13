'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { AuthWrapper } from '@/components/auth-wrapper'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
// ProfileProvider removed - using direct account linking instead
import { UnifiedNotificationProvider } from '@/contexts/UnifiedNotificationContext'
import { NotificationPreferencesProvider } from '@/contexts/NotificationPreferencesContext'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { isCollapsed } = useSidebar()
  const pathname = usePathname()
  const [streamingActive, setStreamingActive] = useState(false)

  // Global streaming keep-alive - works across all dashboard pages
  useEffect(() => {
    let keepAliveInterval: NodeJS.Timeout | null = null
    let retryCount = 0
    const MAX_RETRIES = 3

    const checkAndRestartStreaming = async () => {
      try {
        // Check streaming status
        const response = await fetch('/api/mt5-streaming/start')
        const data = await response.json()
        
        if (data.status?.isConnected) {
          setStreamingActive(true)
          retryCount = 0 // Reset retry count on success
          console.log('✅ [Dashboard Keep-Alive] Streaming healthy')
        } else {
          // Connection lost - try to restart with retry logic
          console.log('⚠️ [Dashboard Keep-Alive] Connection lost, auto-restarting...')
          
          // Try to restart with retry logic
          for (let i = 0; i < MAX_RETRIES; i++) {
            try {
              const restartResponse = await fetch('/api/mt5-streaming/start', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              })
              
              if (restartResponse.ok) {
                const restartData = await restartResponse.json()
                if (restartData.status?.isConnected) {
                  console.log(`✅ [Dashboard Keep-Alive] Streaming restarted (attempt ${i + 1})`)
                  setStreamingActive(true)
                  retryCount = 0
                  return
                }
              }
            } catch (retryError) {
              console.error(`❌ [Dashboard Keep-Alive] Retry ${i + 1} failed:`, retryError)
            }
            
            // Wait before next retry (exponential backoff: 1s, 2s, 4s)
            if (i < MAX_RETRIES - 1) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
            }
          }
          
          setStreamingActive(false)
        }
      } catch (error) {
        console.error('❌ [Dashboard Keep-Alive] Error:', error)
        retryCount++
        
        if (retryCount >= MAX_RETRIES) {
          console.error('❌ [Dashboard Keep-Alive] Max retries reached')
          setStreamingActive(false)
        }
      }
    }

    // Check immediately on mount
    checkAndRestartStreaming()

    // Then check every 30 seconds (reduced to prevent excessive reconnection attempts)
    keepAliveInterval = setInterval(checkAndRestartStreaming, 30000)
    
    console.log('🔄 [Dashboard Keep-Alive] Started - monitoring across all pages')

    return () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
        console.log('🛑 [Dashboard Keep-Alive] Stopped - left dashboard')
      }
    }
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <NotificationPreferencesProvider>
      <UnifiedNotificationProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-black dark:via-black dark:to-black transition-all duration-500">
          <Sidebar user={user} />
          <div className={cn(
            "min-h-screen flex flex-col transition-all duration-300 overflow-x-hidden",
            isCollapsed ? "ml-0 md:ml-20" : "ml-0 md:ml-64"
          )}>
            <Header user={user} />
            <main className="flex-1 p-4 md:p-6 relative z-10 w-full box-border">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </UnifiedNotificationProvider>
    </NotificationPreferencesProvider>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="redemptionfx-theme">
      <AuthProvider>
        <AuthWrapper>
          <SidebarProvider>
            <DashboardContent>
              {children}
            </DashboardContent>
          </SidebarProvider>
        </AuthWrapper>
      </AuthProvider>
    </ThemeProvider>
  )
}