import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'

// Import Tailwind CSS and RedemptionFX Theme
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RedemptionFX - Professional Forex Trading Signals',
  description: 'Rise from ashes to gold with professional forex and gold trading signals from RedemptionFX.',
  keywords: 'forex signals, gold trading, trading signals, forex analysis, trading community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Theme initialization script - prevents FOUC (Flash of Unstyled Content) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Get saved theme or default to dark
                  const savedTheme = localStorage.getItem('redemption-theme');
                  const theme = savedTheme === 'light' ? 'light' : 'dark';
                  
                  // Set theme attribute immediately
                  document.documentElement.setAttribute('data-theme', theme);
                  
                  // Remove old class-based theme if it exists
                  document.documentElement.classList.remove('dark', 'light');
                } catch (e) {
                  // Fallback to dark theme if localStorage is not available
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}