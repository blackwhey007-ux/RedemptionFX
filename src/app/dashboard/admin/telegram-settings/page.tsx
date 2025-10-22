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
  Info
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

⏰ {timestamp}`
  })
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; hint?: string } | null>(null)

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

⏰ {timestamp}`
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

  const handleSave = async () => {
    setLoading(true)
    try {
      await saveTelegramSettings(settings)
      toast.success('Telegram settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
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
