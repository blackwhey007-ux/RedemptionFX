'use client'

import Link from 'next/link'
import { ApiSetupSimple } from '@/components/admin/ApiSetupSimple'
import { MetaApiLogsPreview } from '@/components/admin/MetaApiLogsPreview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Activity, ExternalLink, LifeBuoy, PlayCircle } from 'lucide-react'

export default function MetaApiSetupPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
            MetaAPI
          </Badge>
          <span className="text-xs text-muted-foreground">Secure MT5 streaming configuration</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold">MetaAPI Streaming Setup</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Connect your MetaAPI account, manage streaming, and monitor live activity. The{' '}
          <Link href="/dashboard/admin/vip-sync" className="font-medium text-blue-600 hover:text-blue-700">
            Live Positions
          </Link>{' '}
          view depends on this connection to deliver real-time trades.
        </p>
      </div>

      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20">
        <PlayCircle className="h-5 w-5" />
        <AlertTitle>Before checking Live Positions</AlertTitle>
        <AlertDescription>
          Ensure streaming is started here after saving a valid token and account ID. Once connected, the Live Positions tab
          will display up-to-date MT5 trades automatically.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <div className="space-y-6">
          <ApiSetupSimple />
        </div>

        <div className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LifeBuoy className="h-5 w-5 text-blue-500" />
                Quick Checklist
              </CardTitle>
              <CardDescription>
                Confirm everything is ready before enabling streaming.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Activity className="mt-0.5 h-4 w-4 text-emerald-500" />
                <div>
                  <span className="font-medium text-foreground">MetaAPI account deployed</span>
                  <p className="text-muted-foreground">
                    Verify your MT5 account is connected and deployed in the MetaAPI dashboard.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <PlayCircle className="mt-0.5 h-4 w-4 text-blue-500" />
                <div>
                  <span className="font-medium text-foreground">Streaming started</span>
                  <p className="text-muted-foreground">
                    Click <em>Start Streaming</em> after saving credentials. The status badge updates instantly.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ExternalLink className="mt-0.5 h-4 w-4 text-purple-500" />
                <div>
                  <span className="font-medium text-foreground">Monitor logs</span>
                  <p className="text-muted-foreground">
                    Use the preview below or visit the full{' '}
                    <Link href="/dashboard/admin/streaming-logs" className="text-blue-600 hover:text-blue-700">
                      Streaming Logs
                    </Link>{' '}
                    page for detailed diagnostics.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <MetaApiLogsPreview />
        </div>
      </div>
    </div>
  )
}





