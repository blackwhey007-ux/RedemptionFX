'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  Send, 
  CheckCircle, 
  XCircle, 
  Settings, 
  MessageSquare,
  Users,
  Hash,
  Save,
  TestTube,
  Info,
  Calendar,
  Clock,
  BarChart3,
  TrendingUp
} from 'lucide-react'
import { TelegramSettings } from '@/types/telegram'
import { getTelegramSettings, saveTelegramSettings, testTelegramConnection, sendTestMessage } from '@/lib/telegramService'
import { toast } from 'sonner'

export default function TelegramSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<TelegramSettings>({
    botToken: '',
    channelId: '',
    groupId: '',
    publicChannelId: '',
    enableChannel: false,
    enableGroup: false,
    enableDMs: false,
    enablePublicChannel: false,
    messageTemplate: `📊 *{pair}* {type === 'BUY' ? '🟢' : '🔴'} {type}

💰 Entry: \`{entryPrice}\`
🛑 Stop Loss: \`{stopLoss}\`
🎯 TP1: \`{takeProfit1}\`
{takeProfit2 ? '🎯 TP2: \`{takeProfit2}\`' : ''}
{takeProfit3 ? '🎯 TP3: \`{takeProfit3}\`' : ''}

{notes ? '💡 {notes}' : ''}

⏰ {timestamp}`,
    // MT5 Trade Message Templates
    openTradeTemplate: `📈 **NEW TRADE OPENED**

🔹 **Symbol:** {symbol}
🔹 **Type:** {type}
🔹 **Entry:** \`{entry}\`
🛡️ **SL:** {sl}
🎯 **TP:** {tp}

⏰ {timestamp}`,
    updateTradeTemplate: `🔄 **TRADE UPDATED** {changes}

🔹 **Symbol:** {symbol}
🔹 **Type:** {type}
🔹 **Entry:** \`{entry}\`
🔹 **Current:** \`{current}\`
🛡️ **SL:** {sl}
🎯 **TP:** {tp}

⏰ {timestamp}`,
    closeTradeTemplate: `🏁 **TRADE CLOSED**

🔹 **Symbol:** {symbol}
🔹 **Type:** {type}
🔹 **Entry:** \`{entry}\`
🔹 **Exit:** \`{exit}\`
📊 **Result:** {pips} pips

⏰ {timestamp}`,
    // Report Templates
    dailyReportTemplate: `📊 **DAILY VIP RESULTS**

📈 Total Pips: {totalPips}
🎯 Trades: {tradesCount} ({winCount} wins, {lossCount} losses)
📊 Win Rate: {winRate}%
🏆 Best Trade: {bestTrade} pips

⏰ {timestamp}`,
    weeklyReportTemplate: `📊 **WEEKLY VIP RESULTS**

📈 Total Pips: {totalPips}
🎯 Trades: {tradesCount} ({winCount} wins, {lossCount} losses)
📊 Win Rate: {winRate}%
🏆 Best Trade: {bestTrade} pips
💎 Avg Win: {avgWin} pips
📉 Avg Loss: {avgLoss} pips

⏰ {timestamp}`,
    monthlyReportTemplate: `📊 **MONTHLY VIP RESULTS**

📈 Total Pips: {totalPips}
🎯 Trades: {tradesCount} ({winCount} wins, {lossCount} losses)
📊 Win Rate: {winRate}%
🏆 Best Trade: {bestTrade} pips
💎 Avg Win: {avgWin} pips
📉 Avg Loss: {avgLoss} pips

⏰ {timestamp}`,
    publicReportTemplate: `🔥 **{period} PERFORMANCE UPDATE**

VIP members gained {totalPips} pips {periodText}! 💰
📊 Win Rate: {winRate}%
🎯 {tradesCount} Trades ({winCount} Winners!)
🏆 Best Trade: {bestTrade} pips

💎 Join VIP for:
✅ Real-time alerts
✅ Full entry/exit details
✅ Risk management
✅ 24/7 support

{vipWebsite}
{vipContact}`,
    // Report settings
    enableDailyReports: false,
    enableWeeklyReports: false,
    enableMonthlyReports: false,
    enablePublicDailyReports: false,
    enablePublicWeeklyReports: false,
    enablePublicMonthlyReports: false,
    dailyReportTime: '09:00',
    weeklyReportDay: 0, // Sunday
    monthlyReportDay: 1,
    vipWebsiteUrl: '',
    vipTelegramContact: '',
    // Update Notifications (TP/SL changes)
    sendUpdateNotification: false,
    updateNotificationStyle: 'reply' as 'reply' | 'copy',
    updateNotificationPrefix: '🔔 TP/SL Updated',
    // Trade Close Notifications
    sendCloseNotification: true,
    winGifUrl: '',
    lossGifUrl: '',
    closeNotificationTemplate: `🎉 **TRADE {result}!**

🔹 **Symbol:** {symbol}
🔹 **Type:** {type}
📊 **Result:** {pips} pips

🎊 Congratulations to all VIP members!

⏰ {timestamp}`
  })
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; hint?: string } | null>(null)
  const [sendingReport, setSendingReport] = useState<string | null>(null)

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const existingSettings = await getTelegramSettings()
        if (existingSettings) {
          setSettings({
            botToken: existingSettings.botToken || '',
            channelId: existingSettings.channelId || '',
            groupId: existingSettings.groupId || '',
            publicChannelId: existingSettings.publicChannelId || '',
            enableChannel: existingSettings.enableChannel || false,
            enableGroup: existingSettings.enableGroup || false,
            enableDMs: existingSettings.enableDMs || false,
            enablePublicChannel: existingSettings.enablePublicChannel || false,
            messageTemplate: existingSettings.messageTemplate || `📊 *{pair}* {type === 'BUY' ? '🟢' : '🔴'} {type}

💰 Entry: \`{entryPrice}\`
🛑 Stop Loss: \`{stopLoss}\`
🎯 TP1: \`{takeProfit1}\`
{takeProfit2 ? '🎯 TP2: \`{takeProfit2}\`' : ''}
{takeProfit3 ? '🎯 TP3: \`{takeProfit3}\`' : ''}

{notes ? '💡 {notes}' : ''}

⏰ {timestamp}`,
            // Report settings
            enableDailyReports: existingSettings.enableDailyReports || false,
            enableWeeklyReports: existingSettings.enableWeeklyReports || false,
            enableMonthlyReports: existingSettings.enableMonthlyReports || false,
            enablePublicDailyReports: existingSettings.enablePublicDailyReports || false,
            enablePublicWeeklyReports: existingSettings.enablePublicWeeklyReports || false,
            enablePublicMonthlyReports: existingSettings.enablePublicMonthlyReports || false,
            dailyReportTime: existingSettings.dailyReportTime || '09:00',
            weeklyReportDay: existingSettings.weeklyReportDay || 0,
            monthlyReportDay: existingSettings.monthlyReportDay || 1,
            lastDailyReport: existingSettings.lastDailyReport,
            lastWeeklyReport: existingSettings.lastWeeklyReport,
            lastMonthlyReport: existingSettings.lastMonthlyReport,
            lastPublicDailyReport: existingSettings.lastPublicDailyReport,
            lastPublicWeeklyReport: existingSettings.lastPublicWeeklyReport,
            lastPublicMonthlyReport: existingSettings.lastPublicMonthlyReport,
            vipWebsiteUrl: existingSettings.vipWebsiteUrl || '',
            vipTelegramContact: existingSettings.vipTelegramContact || '',
            // MT5 Trade Message Templates
            openTradeTemplate: existingSettings.openTradeTemplate,
            updateTradeTemplate: existingSettings.updateTradeTemplate,
            closeTradeTemplate: existingSettings.closeTradeTemplate,
            // Report Templates
            dailyReportTemplate: existingSettings.dailyReportTemplate,
            weeklyReportTemplate: existingSettings.weeklyReportTemplate,
            monthlyReportTemplate: existingSettings.monthlyReportTemplate,
            publicReportTemplate: existingSettings.publicReportTemplate,
            // Update Notifications (TP/SL changes)
            sendUpdateNotification: existingSettings.sendUpdateNotification || false,
            updateNotificationStyle: existingSettings.updateNotificationStyle || 'reply',
            updateNotificationPrefix: existingSettings.updateNotificationPrefix || '🔔 TP/SL Updated',
            // Trade Close Notifications
            sendCloseNotification: existingSettings.sendCloseNotification !== false,
            winGifUrl: existingSettings.winGifUrl || '',
            lossGifUrl: existingSettings.lossGifUrl || '',
            closeNotificationTemplate: existingSettings.closeNotificationTemplate
          })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        toast.error('Failed to load Telegram settings')
      } finally {
        setInitialLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Template rendering helper
  const renderTemplate = (template: string, vars: Record<string, string>): string => {
    let result = template
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
    return result
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Ensure all new fields have default values before saving
      const settingsToSave: TelegramSettings = {
        ...settings,
        // Ensure notification settings have defaults
        sendUpdateNotification: Boolean(settings.sendUpdateNotification),
        updateNotificationStyle: (settings.updateNotificationStyle === 'copy' ? 'copy' : 'reply') as 'reply' | 'copy',
        updateNotificationPrefix: String(settings.updateNotificationPrefix || '🔔 TP/SL Updated'),
        // Ensure templates have defaults (use existing defaults from initial state)
        openTradeTemplate: settings.openTradeTemplate || `📈 **NEW TRADE OPENED**

🔹 **Symbol:** {symbol}
🔹 **Type:** {type}
🔹 **Entry:** \`{entry}\`
🛡️ **SL:** {sl}
🎯 **TP:** {tp}

⏰ {timestamp}`,
        updateTradeTemplate: settings.updateTradeTemplate || `🔄 **TRADE UPDATED** {changes}

🔹 **Symbol:** {symbol}
🔹 **Type:** {type}
🔹 **Entry:** \`{entry}\`
🔹 **Current:** \`{current}\`
🛡️ **SL:** {sl}
🎯 **TP:** {tp}

⏰ {timestamp}`,
        closeTradeTemplate: settings.closeTradeTemplate || `🏁 **TRADE CLOSED**

🔹 **Symbol:** {symbol}
🔹 **Type:** {type}
🔹 **Entry:** \`{entry}\`
🔹 **Exit:** \`{exit}\`
📊 **Result:** {pips} pips

⏰ {timestamp}`
      }
      
      console.log('💾 [SAVE] Attempting to save settings:', {
        hasNotificationSettings: !!settingsToSave.sendUpdateNotification,
        hasTemplates: !!settingsToSave.openTradeTemplate,
        settingsKeys: Object.keys(settingsToSave)
      })
      
      await saveTelegramSettings(settingsToSave)
      
      console.log('✅ [SAVE] Settings saved successfully')
      toast.success('Telegram settings saved successfully!')
    } catch (error) {
      console.error('❌ [SAVE] Error saving settings:', error)
      console.error('❌ [SAVE] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to save settings: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!settings.botToken) {
      toast.error('Please enter a bot token first')
      return
    }

    setTesting(true)
    setConnectionStatus('idle')
    
    try {
      const result = await testTelegramConnection(settings.botToken)
      setConnectionStatus(result.success ? 'success' : 'error')
      
      if (result.success) {
        toast.success('Bot connection successful!')
      } else {
        toast.error(`Connection failed: ${result.error}`)
      }
    } catch (error) {
      setConnectionStatus('error')
      toast.error('Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSendTest = async () => {
    if (!settings.botToken) {
      toast.error('Please enter a bot token first')
      return
    }

    const testMessage = `🧪 *Test Message*

This is a test message from your RedemptionFX bot to verify Telegram integration is working correctly.

⏰ ${new Date().toLocaleString()}`

    setTesting(true)
    setTestResult(null)

    try {
      let result
      if (settings.enableChannel && settings.channelId) {
        result = await sendTestMessage(testMessage, 'channel', settings.channelId, settings.botToken)
      } else if (settings.enableGroup && settings.groupId) {
        result = await sendTestMessage(testMessage, 'group', settings.groupId, settings.botToken)
      } else if (settings.enablePublicChannel && settings.publicChannelId) {
        result = await sendTestMessage(testMessage, 'channel', settings.publicChannelId, settings.botToken)
      } else {
        toast.error('Please enable and configure at least one destination (VIP channel, group, or public channel)')
        return
      }

      setTestResult(result)

      if (result.success) {
        toast.success('Test message sent successfully!')
      } else {
        toast.error(`Test failed: ${result.error}`)
        if (result.hint) {
          toast.error(result.hint)
        }
      }
    } catch (error) {
      setTestResult({ success: false, error: 'Test message failed' })
      toast.error('Test message failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSendReport = async (reportType: 'daily' | 'weekly' | 'monthly', destination: 'vip' | 'public' | 'both') => {
    setSendingReport(`${reportType}-${destination}`)
    
    try {
      const response = await fetch('/api/telegram/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          destination
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report sent successfully!`)
        
        // Update last sent timestamps in local state
        const now = new Date()
        const updateField = destination === 'vip' ? `last${reportType.charAt(0).toUpperCase() + reportType.slice(1)}Report` :
                       destination === 'public' ? `lastPublic${reportType.charAt(0).toUpperCase() + reportType.slice(1)}Report` : null
        
        if (updateField) {
          setSettings(prev => ({ ...prev, [updateField]: now }))
        }
      } else {
        toast.error(`Failed to send ${reportType} report: ${result.error}`)
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: string) => toast.error(error))
        }
      }
    } catch (error) {
      console.error('Error sending report:', error)
      toast.error(`Failed to send ${reportType} report`)
    } finally {
      setSendingReport(null)
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400">
            You need admin privileges to access Telegram settings.
          </p>
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Loading Settings...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-500" />
            Telegram Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Configure Telegram bot integration for automatic signal notifications
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Bot Configuration
            </CardTitle>
            <CardDescription>
              Set up your Telegram bot credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="botToken">Bot Token</Label>
              <Input
                id="botToken"
                type="password"
                value={settings.botToken ?? ''}
                onChange={(e) => setSettings({ ...settings, botToken: e.target.value })}
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Get this from @BotFather on Telegram
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={testing || !settings.botToken}
                variant="outline"
                size="sm"
              >
                {testing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              
              {connectionStatus === 'success' && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              )}
              
              {connectionStatus === 'error' && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  <XCircle className="w-3 h-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Destinations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Destinations
            </CardTitle>
            <CardDescription>
              Configure where signals will be sent. Toggle the switches to enable each destination.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Channel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="channelId" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Channel
                  {settings.enableChannel && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                      Enabled
                    </Badge>
                  )}
                </Label>
                <Switch
                  checked={settings.enableChannel}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableChannel: checked })}
                />
              </div>
              <Input
                id="channelId"
                value={settings.channelId ?? ''}
                onChange={(e) => setSettings({ ...settings, channelId: e.target.value })}
                placeholder="@yourchannel or -1001234567890"
                disabled={!settings.enableChannel}
                className="font-mono"
              />
              <p className="text-xs text-slate-500">
                Toggle the switch above to enable channel configuration
              </p>
            </div>

            {/* Group */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="groupId" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Group
                  {settings.enableGroup && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                      Enabled
                    </Badge>
                  )}
                </Label>
                <Switch
                  checked={settings.enableGroup}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableGroup: checked })}
                />
              </div>
              <Input
                id="groupId"
                value={settings.groupId ?? ''}
                onChange={(e) => setSettings({ ...settings, groupId: e.target.value })}
                placeholder="@yourgroup or -1001234567890"
                disabled={!settings.enableGroup}
                className="font-mono"
              />
              <p className="text-xs text-slate-500">
                Toggle the switch above to enable group configuration
              </p>
            </div>

            {/* Public Channel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="publicChannelId" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Public Channel
                  {settings.enablePublicChannel && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                      Enabled
                    </Badge>
                  )}
                </Label>
                <Switch
                  checked={settings.enablePublicChannel}
                  onCheckedChange={(checked) => setSettings({ ...settings, enablePublicChannel: checked })}
                />
              </div>
              <Input
                id="publicChannelId"
                value={settings.publicChannelId ?? ''}
                onChange={(e) => setSettings({ ...settings, publicChannelId: e.target.value })}
                placeholder="@yourpublicchannel or -1001234567890"
                disabled={!settings.enablePublicChannel}
                className="font-mono"
              />
              <p className="text-xs text-slate-500">
                For free signals marketing - teaser messages only
              </p>
            </div>

            {/* DMs - Disabled for now */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-slate-400">
                  <Users className="w-4 h-4" />
                  Direct Messages
                </Label>
                <Switch disabled />
              </div>
              <p className="text-xs text-slate-500">
                Coming soon - User subscription management required
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Template */}
      <Card>
        <CardHeader>
          <CardTitle>Message Template</CardTitle>
          <CardDescription>
            Customize how signals appear in Telegram messages. Use variables like {`{title}`}, {`{pair}`}, {`{type}`}, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="messageTemplate">Template</Label>
            <Textarea
              id="messageTemplate"
              value={settings.messageTemplate ?? ''}
              onChange={(e) => setSettings({ ...settings, messageTemplate: e.target.value })}
              rows={12}
              className="font-mono text-sm"
              placeholder="Enter your message template..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Available variables: {`{title}`}, {`{pair}`}, {`{type}`}, {`{entryPrice}`}, {`{stopLoss}`}, {`{takeProfit1}`}, {`{takeProfit2}`}, {`{takeProfit3}`}, {`{notes}`}, {`{category}`}, {`{timestamp}`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Message */}
      <Card>
        <CardHeader>
          <CardTitle>Test Message</CardTitle>
          <CardDescription>
            Send a test message to verify your configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSendTest}
              disabled={testing || !settings.botToken || (!settings.enableChannel && !settings.enableGroup && !settings.enablePublicChannel)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Message
                </>
              )}
            </Button>

            {testResult && (
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sent Successfully
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    <XCircle className="w-3 h-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
            )}
          </div>

          {testResult?.error && (
            <Alert className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {testResult.error}
                {testResult.hint && (
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    💡 {testResult.hint}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Automated Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Automated Reports
          </CardTitle>
          <CardDescription>
            Configure automated VIP performance reports sent to Telegram channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* VIP Channel Reports */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Hash className="w-4 h-4" />
              VIP Channel Reports
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Daily Reports</Label>
                  <Switch
                    checked={settings.enableDailyReports || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableDailyReports: checked })}
                  />
                </div>
                {settings.lastDailyReport && (
                  <p className="text-xs text-slate-500">
                    Last sent: {new Date(settings.lastDailyReport).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Weekly Reports</Label>
                  <Switch
                    checked={settings.enableWeeklyReports || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableWeeklyReports: checked })}
                  />
                </div>
                {settings.lastWeeklyReport && (
                  <p className="text-xs text-slate-500">
                    Last sent: {new Date(settings.lastWeeklyReport).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Monthly Reports</Label>
                  <Switch
                    checked={settings.enableMonthlyReports || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableMonthlyReports: checked })}
                  />
                </div>
                {settings.lastMonthlyReport && (
                  <p className="text-xs text-slate-500">
                    Last sent: {new Date(settings.lastMonthlyReport).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Public Channel Reports */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Public Channel Reports (Marketing)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Daily Reports</Label>
                  <Switch
                    checked={settings.enablePublicDailyReports || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, enablePublicDailyReports: checked })}
                  />
                </div>
                {settings.lastPublicDailyReport && (
                  <p className="text-xs text-slate-500">
                    Last sent: {new Date(settings.lastPublicDailyReport).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Weekly Reports</Label>
                  <Switch
                    checked={settings.enablePublicWeeklyReports || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, enablePublicWeeklyReports: checked })}
                  />
                </div>
                {settings.lastPublicWeeklyReport && (
                  <p className="text-xs text-slate-500">
                    Last sent: {new Date(settings.lastPublicWeeklyReport).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Monthly Reports</Label>
                  <Switch
                    checked={settings.enablePublicMonthlyReports || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, enablePublicMonthlyReports: checked })}
                  />
                </div>
                {settings.lastPublicMonthlyReport && (
                  <p className="text-xs text-slate-500">
                    Last sent: {new Date(settings.lastPublicMonthlyReport).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Scheduling
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyReportTime" className="text-sm">Daily Report Time</Label>
                <Input
                  id="dailyReportTime"
                  type="time"
                  value={settings.dailyReportTime || '09:00'}
                  onChange={(e) => setSettings({ ...settings, dailyReportTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weeklyReportDay" className="text-sm">Weekly Report Day</Label>
                <select
                  id="weeklyReportDay"
                  value={settings.weeklyReportDay || 0}
                  onChange={(e) => setSettings({ ...settings, weeklyReportDay: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyReportDay" className="text-sm">Monthly Report Day</Label>
                <select
                  id="monthlyReportDay"
                  value={settings.monthlyReportDay || 1}
                  onChange={(e) => setSettings({ ...settings, monthlyReportDay: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {Array.from({ length: 28 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VIP Marketing Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            VIP Marketing Links
          </CardTitle>
          <CardDescription>
            Configure links for public channel reports to direct users to join VIP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vipWebsiteUrl">Website URL</Label>
            <Input
              id="vipWebsiteUrl"
              value={settings.vipWebsiteUrl || ''}
              onChange={(e) => setSettings({ ...settings, vipWebsiteUrl: e.target.value })}
              placeholder="https://yourwebsite.com/vip"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vipTelegramContact">Telegram Contact</Label>
            <Input
              id="vipTelegramContact"
              value={settings.vipTelegramContact || ''}
              onChange={(e) => setSettings({ ...settings, vipTelegramContact: e.target.value })}
              placeholder="@yourusername or https://t.me/yourusername"
            />
          </div>
        </CardContent>
      </Card>

      {/* Send Report Now */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Report Now
          </CardTitle>
          <CardDescription>
            Manually trigger reports to test or send immediately
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* VIP Channel */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Hash className="w-4 h-4" />
              VIP Channel
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleSendReport('daily', 'vip')}
                disabled={sendingReport === 'daily-vip' || !settings.channelId}
                variant="outline"
                size="sm"
              >
                {sendingReport === 'daily-vip' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Send Daily Report
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSendReport('weekly', 'vip')}
                disabled={sendingReport === 'weekly-vip' || !settings.channelId}
                variant="outline"
                size="sm"
              >
                {sendingReport === 'weekly-vip' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Send Weekly Report
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSendReport('monthly', 'vip')}
                disabled={sendingReport === 'monthly-vip' || !settings.channelId}
                variant="outline"
                size="sm"
              >
                {sendingReport === 'monthly-vip' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Send Monthly Report
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Public Channel */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Public Channel (Marketing)
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleSendReport('daily', 'public')}
                disabled={sendingReport === 'daily-public' || !settings.publicChannelId}
                variant="outline"
                size="sm"
              >
                {sendingReport === 'daily-public' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Send Daily Report
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSendReport('weekly', 'public')}
                disabled={sendingReport === 'weekly-public' || !settings.publicChannelId}
                variant="outline"
                size="sm"
              >
                {sendingReport === 'weekly-public' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Send Weekly Report
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSendReport('monthly', 'public')}
                disabled={sendingReport === 'monthly-public' || !settings.publicChannelId}
                variant="outline"
                size="sm"
              >
                {sendingReport === 'monthly-public' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Send Monthly Report
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Both Channels */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Both Channels
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleSendReport('daily', 'both')}
                disabled={sendingReport === 'daily-both' || (!settings.channelId && !settings.publicChannelId)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {sendingReport === 'daily-both' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Daily to Both
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSendReport('weekly', 'both')}
                disabled={sendingReport === 'weekly-both' || (!settings.channelId && !settings.publicChannelId)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {sendingReport === 'weekly-both' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Weekly to Both
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSendReport('monthly', 'both')}
                disabled={sendingReport === 'monthly-both' || (!settings.channelId && !settings.publicChannelId)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {sendingReport === 'monthly-both' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Monthly to Both
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MT5 Trade Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            MT5 Trade Message Templates
          </CardTitle>
          <CardDescription>
            Customize how MT5 trades appear in Telegram. Use variables like {'{symbol}'}, {'{type}'}, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Open Trade Template */}
          <div>
            <Label htmlFor="openTradeTemplate" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Open Trade Message
            </Label>
            <Textarea
              id="openTradeTemplate"
              value={settings.openTradeTemplate || ''}
              onChange={(e) => setSettings({ ...settings, openTradeTemplate: e.target.value })}
              rows={8}
              className="font-mono text-sm mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Variables: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{symbol}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{type}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{entry}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{sl}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{tp}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{timestamp}'}</code>
            </p>
          </div>

          {/* Update Trade Template */}
          <div>
            <Label htmlFor="updateTradeTemplate" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              TP/SL Update Message
            </Label>
            <Textarea
              id="updateTradeTemplate"
              value={settings.updateTradeTemplate || ''}
              onChange={(e) => setSettings({ ...settings, updateTradeTemplate: e.target.value })}
              rows={9}
              className="font-mono text-sm mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Variables: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{symbol}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{type}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{entry}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{current}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{sl}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{tp}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{changes}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{timestamp}'}</code>
            </p>
          </div>

          {/* Close Trade Template */}
          <div>
            <Label htmlFor="closeTradeTemplate" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Close Trade Message
            </Label>
            <Textarea
              id="closeTradeTemplate"
              value={settings.closeTradeTemplate || ''}
              onChange={(e) => setSettings({ ...settings, closeTradeTemplate: e.target.value })}
              rows={8}
              className="font-mono text-sm mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Variables: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{symbol}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{type}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{entry}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{exit}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{pips}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{timestamp}'}</code>
            </p>
          </div>

          {/* Live Preview */}
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Live Preview (Open Message)
            </h4>
            <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {renderTemplate(settings.openTradeTemplate || '', {
                  symbol: 'XAUUSD',
                  type: 'BUY',
                  entry: '3965.59000',
                  sl: '3960.00000',
                  tp: '3970.00000',
                  timestamp: new Date().toLocaleString()
                })}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Notifications (TP/SL Changes) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Update Notifications (TP/SL Changes)
          </CardTitle>
          <CardDescription>
            Send additional notification when TP/SL is modified (original message is always edited)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Update Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sendUpdateNotification" className="font-medium">
                Send New Message on TP/SL Update
              </Label>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                When enabled, subscribers get a push notification (reply or copy) in addition to the edited original message
              </p>
            </div>
            <Switch
              id="sendUpdateNotification"
              checked={settings.sendUpdateNotification || false}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, sendUpdateNotification: checked })
              }
            />
          </div>

          {settings.sendUpdateNotification && (
            <>
              {/* Notification Style */}
              <div>
                <Label htmlFor="updateNotificationStyle">Notification Style</Label>
                <select
                  id="updateNotificationStyle"
                  value={settings.updateNotificationStyle || 'reply'}
                  onChange={(e) => 
                    setSettings({ 
                      ...settings, 
                      updateNotificationStyle: e.target.value as 'reply' | 'copy' 
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-2"
                >
                  <option value="reply">Reply (threaded, references original)</option>
                  <option value="copy">Copy (duplicate message with prefix)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>Reply:</strong> Sends as a threaded reply to the original signal (recommended)
                  <br />
                  <strong>Copy:</strong> Duplicates the original message with update prefix
                </p>
              </div>

              {/* Update Prefix */}
              <div>
                <Label htmlFor="updateNotificationPrefix">Notification Prefix</Label>
                <Input
                  id="updateNotificationPrefix"
                  type="text"
                  value={settings.updateNotificationPrefix || ''}
                  onChange={(e) => 
                    setSettings({ ...settings, updateNotificationPrefix: e.target.value })
                  }
                  placeholder="e.g., 🔔 TP/SL Updated"
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Text to prepend to the update notification (for copy style, or reply context)
                </p>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  How It Works
                </h4>
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <li>✅ Original message is <strong>always edited</strong> with new TP/SL values</li>
                  <li>🔔 A <strong>new {settings.updateNotificationStyle === 'reply' ? 'reply' : 'copied'} message</strong> is sent to notify subscribers</li>
                  <li>📱 Subscribers get a <strong>push notification</strong> (unlike silent edits)</li>
                  <li>💾 All update messages are tracked in the database</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Trade Close Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Trade Close Notifications
          </CardTitle>
          <CardDescription>
            Send new message with GIF when trade closes (original message is also edited)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Close Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sendCloseNotification" className="font-medium">
                Send New Message When Trade Closes
              </Label>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Subscribers get push notification with celebration/consolation GIF
              </p>
            </div>
            <Switch
              id="sendCloseNotification"
              checked={settings.sendCloseNotification !== false}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, sendCloseNotification: checked })
              }
            />
          </div>

          {settings.sendCloseNotification !== false && (
            <>
              {/* Win GIF URL */}
              <div>
                <Label htmlFor="winGifUrl">Win Celebration GIF URL</Label>
                <Input
                  id="winGifUrl"
                  type="text"
                  value={settings.winGifUrl || ''}
                  onChange={(e) => 
                    setSettings({ ...settings, winGifUrl: e.target.value })
                  }
                  placeholder="https://media.tenor.com/..."
                  className="mt-2 font-mono text-xs"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Get GIF URL from <a href="https://tenor.com" target="_blank" rel="noopener" className="text-blue-500 hover:underline">Tenor</a> or <a href="https://giphy.com" target="_blank" rel="noopener" className="text-blue-500 hover:underline">Giphy</a> (right-click GIF → Copy link)
                </p>
              </div>

              {/* Loss GIF URL */}
              <div>
                <Label htmlFor="lossGifUrl">Loss Consolation GIF URL</Label>
                <Input
                  id="lossGifUrl"
                  type="text"
                  value={settings.lossGifUrl || ''}
                  onChange={(e) => 
                    setSettings({ ...settings, lossGifUrl: e.target.value })
                  }
                  placeholder="https://media.tenor.com/..."
                  className="mt-2 font-mono text-xs"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Motivational or learning-focused GIF for losing trades
                </p>
              </div>

              {/* Close Notification Template */}
              <div>
                <Label htmlFor="closeNotificationTemplate">Close Notification Template</Label>
                <Textarea
                  id="closeNotificationTemplate"
                  value={settings.closeNotificationTemplate || ''}
                  onChange={(e) => 
                    setSettings({ ...settings, closeNotificationTemplate: e.target.value })
                  }
                  rows={10}
                  className="font-mono text-sm mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Variables: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{symbol}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{type}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{entry}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{exit}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{pips}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{result}'}</code> (WIN/LOSS/BREAKEVEN), <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{timestamp}'}</code>
                </p>
              </div>

              {/* Preview */}
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  Live Preview (Win)
                </h4>
                <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {renderTemplate(settings.closeNotificationTemplate || '', {
                      symbol: 'XAUUSD',
                      type: 'BUY',
                      entry: '3965.59000',
                      exit: '3975.88700',
                      pips: '+10.3',
                      result: 'WIN',
                      profit: '103.00',
                      timestamp: new Date().toLocaleString()
                    })}
                  </pre>
                </div>
              </div>

              {/* How It Works */}
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  How It Works
                </h4>
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <li>✅ Original message is <strong>edited</strong> to show "TRADE CLOSED"</li>
                  <li>🎉 <strong>GIF is sent</strong> (win or loss based on result)</li>
                  <li>📱 <strong>New notification message</strong> is sent (subscribers get push)</li>
                  <li>🎊 Celebrates wins or encourages on losses</li>
                  <li>💾 All messages tracked in database</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Performance Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Report Templates
          </CardTitle>
          <CardDescription>
            Customize daily/weekly/monthly VIP result reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Report Template */}
          <div>
            <Label htmlFor="dailyReportTemplate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Daily Report
            </Label>
            <Textarea
              id="dailyReportTemplate"
              value={settings.dailyReportTemplate || ''}
              onChange={(e) => setSettings({ ...settings, dailyReportTemplate: e.target.value })}
              rows={7}
              className="font-mono text-sm mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Variables: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{totalPips}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{tradesCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{winCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{lossCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{winRate}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{bestTrade}'}</code>
            </p>
          </div>

          {/* Weekly Report Template */}
          <div>
            <Label htmlFor="weeklyReportTemplate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Weekly Report
            </Label>
            <Textarea
              id="weeklyReportTemplate"
              value={settings.weeklyReportTemplate || ''}
              onChange={(e) => setSettings({ ...settings, weeklyReportTemplate: e.target.value })}
              rows={9}
              className="font-mono text-sm mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Variables: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{totalPips}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{tradesCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{winCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{lossCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{winRate}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{bestTrade}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{avgWin}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{avgLoss}'}</code>
            </p>
          </div>

          {/* Monthly Report Template */}
          <div>
            <Label htmlFor="monthlyReportTemplate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Monthly Report
            </Label>
            <Textarea
              id="monthlyReportTemplate"
              value={settings.monthlyReportTemplate || ''}
              onChange={(e) => setSettings({ ...settings, monthlyReportTemplate: e.target.value })}
              rows={9}
              className="font-mono text-sm mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Variables: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{totalPips}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{tradesCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{winCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{lossCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{winRate}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{bestTrade}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{avgWin}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{avgLoss}'}</code>
            </p>
          </div>

          {/* Public Report Template */}
          <div>
            <Label htmlFor="publicReportTemplate" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Public/Marketing Report
            </Label>
            <Textarea
              id="publicReportTemplate"
              value={settings.publicReportTemplate || ''}
              onChange={(e) => setSettings({ ...settings, publicReportTemplate: e.target.value })}
              rows={12}
              className="font-mono text-sm mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Variables: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{period}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{periodText}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{totalPips}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{tradesCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{winCount}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{winRate}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{bestTrade}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{vipWebsite}'}</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{vipContact}'}</code>
            </p>
          </div>

          {/* Report Preview */}
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Live Preview (Daily Report)
            </h4>
            <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {renderTemplate(settings.dailyReportTemplate || '', {
                  totalPips: '+45.3',
                  tradesCount: '8',
                  winCount: '6',
                  lossCount: '2',
                  winRate: '75.0',
                  bestTrade: '+29.7',
                  timestamp: new Date().toLocaleString()
                })}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Troubleshooting
          </CardTitle>
          <CardDescription>
            Common issues and solutions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm">❌ "Channel/Group not found"</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                • Make sure your bot is added as administrator to the channel/group<br/>
                • Use the correct Channel ID format: @username or -1001234567890<br/>
                • For private channels, use the numeric ID starting with -100
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">❌ "Insufficient permissions"</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                • The bot needs "Post Messages" permission in the channel/group<br/>
                • Go to channel settings → Administrators → Edit bot permissions
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">❌ "Invalid bot token"</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                • Check your bot token from @BotFather<br/>
                • Make sure there are no extra spaces or characters
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
