'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { AuthWrapper } from '@/components/auth-wrapper'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { UnifiedNotificationProvider } from '@/contexts/UnifiedNotificationContext'
import { NotificationPreferencesProvider } from '@/contexts/NotificationPreferencesContext'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { isCollapsed } = useSidebar()

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
            "min-h-screen flex flex-col transition-all duration-300",
            "ml-0", // No margin on mobile
            isCollapsed ? "md:ml-20" : "md:ml-64" // Desktop margin based on collapsed state
          )}>
            <Header user={user} />
            <main className="flex-1 p-2 md:p-4 lg:p-6">
              {children}
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
          <ProfileProvider>
            <SidebarProvider>
              <DashboardContent>
                {children}
              </DashboardContent>
            </SidebarProvider>
          </ProfileProvider>
        </AuthWrapper>
      </AuthProvider>
    </ThemeProvider>
  )
}