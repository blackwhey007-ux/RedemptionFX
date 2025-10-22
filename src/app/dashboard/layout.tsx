'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { AuthWrapper } from '@/components/auth-wrapper'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { SignalNotificationProvider } from '@/contexts/SignalNotificationContext'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

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
    <NotificationProvider userRole={user.role}>
      <SignalNotificationProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-black dark:via-black dark:to-black transition-all duration-500">
          <Sidebar user={user} />
          <div className="md:ml-64 min-h-screen flex flex-col">
            <Header user={user} />
            <main className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </SignalNotificationProvider>
    </NotificationProvider>
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
            <DashboardContent>
              {children}
            </DashboardContent>
          </ProfileProvider>
        </AuthWrapper>
      </AuthProvider>
    </ThemeProvider>
  )
}