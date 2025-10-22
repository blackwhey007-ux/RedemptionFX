'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { CsvImportPanel } from '@/components/admin/CsvImportPanel'
import { ApiSetupPanel } from '@/components/admin/ApiSetupPanel'
import { SyncMethodSelector } from '@/components/admin/SyncMethodSelector'
// Removed profile imports - VIP Results now shows signals only
import { PromotionalContentService, PromotionalContent } from '@/lib/promotionalContentService'
import { 
  RefreshCw, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  TrendingUp,
  Database,
  Upload,
  Settings,
  Trash2,
  User,
  Save,
  Megaphone,
  Target,
  Eye,
  Edit
} from 'lucide-react'

interface SyncLog {
  id: string
  syncedAt: string
  tradesImported: number
  tradesUpdated: number
  errors: string[]
  status: 'success' | 'partial' | 'failed'
}

export default function VipSyncPage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncMethod, setSyncMethod] = useState<'manual' | 'api'>('manual')
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  
  // Removed profile selection state - VIP Results now shows signals only
  
  // Promotional content state
  const [promotionalContent, setPromotionalContent] = useState<{
    hero: PromotionalContent | null
    cta: PromotionalContent | null
  }>({ hero: null, cta: null })
  const [savingContent, setSavingContent] = useState(false)
  const [editingContent, setEditingContent] = useState<PromotionalContent | null>(null)

  const fetchSyncLogs = async () => {
    try {
      // For now, return empty array since API endpoint doesn't exist yet
      // In the future, this will fetch from the actual API
      setSyncLogs([])
    } catch (error) {
      console.error('Error fetching sync logs:', error)
      setSyncLogs([])
    }
  }

  // Removed profile loading and saving functions - VIP Results now shows signals only

  // Load promotional content
  const loadPromotionalContent = async () => {
    try {
      const [heroContent, ctaContent] = await Promise.all([
        PromotionalContentService.getPromotionalContent('hero-card'),
        PromotionalContentService.getPromotionalContent('cta-card')
      ])
      
      setPromotionalContent({
        hero: heroContent,
        cta: ctaContent
      })
      
      console.log('Promotional content loaded:', { hero: !!heroContent, cta: !!ctaContent })
    } catch (error) {
      console.error('Error loading promotional content:', error)
    }
  }

  // Helper function to initialize editing content
  const initializeEditingContent = (type: 'hero' | 'cta', field: string, value: any) => {
    const currentContent = type === 'hero' ? promotionalContent.hero : promotionalContent.cta
    return {
      id: type === 'hero' ? 'hero-card' : 'cta-card',
      title: currentContent?.title || '',
      description: currentContent?.description || '',
      buttonText: currentContent?.buttonText || '',
      buttonUrl: currentContent?.buttonUrl || '',
      pricing: currentContent?.pricing || '',
      guarantee: currentContent?.guarantee || '',
      isActive: currentContent?.isActive || true,
      backgroundColor: currentContent?.backgroundColor || (type === 'hero' ? '#dc2626' : '#ffffff'),
      textColor: currentContent?.textColor || (type === 'hero' ? '#ffffff' : '#1f2937'),
      buttonColor: currentContent?.buttonColor || (type === 'hero' ? '#ffffff' : '#dc2626'),
      buttonTextColor: currentContent?.buttonTextColor || (type === 'hero' ? '#dc2626' : '#ffffff'),
      buttonHoverColor: currentContent?.buttonHoverColor || (type === 'hero' ? '#f3f4f6' : '#b91c1c'),
      borderColor: currentContent?.borderColor || '#dc2626',
      urgencyText: currentContent?.urgencyText || '',
      socialProof: currentContent?.socialProof || '',
      discountCode: currentContent?.discountCode || '',
      limitedTimeOffer: currentContent?.limitedTimeOffer || false,
      offerExpiry: currentContent?.offerExpiry || '',
      lastUpdated: new Date().toISOString(),
      type,
      [field]: value
    }
  }

  // Save promotional content
  const savePromotionalContent = async (content: PromotionalContent) => {
    setSavingContent(true)
    try {
      await PromotionalContentService.savePromotionalContent(content)
      
      // Update local state
      if (content.type === 'hero') {
        setPromotionalContent(prev => ({ ...prev, hero: content }))
      } else {
        setPromotionalContent(prev => ({ ...prev, cta: content }))
      }
      
      setEditingContent(null)
      alert('Promotional content saved successfully!')
    } catch (error) {
      console.error('Error saving promotional content:', error)
      alert('Failed to save promotional content')
    } finally {
      setSavingContent(false)
    }
  }

  const triggerSync = async () => {
    setSyncing(true)
    try {
      // For now, simulate a sync since API endpoint doesn't exist yet
      // In the future, this will call the actual API
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate successful sync
      alert('Sync completed successfully! (Demo mode)\nImported: 0 trades\nUpdated: 0 trades')
      
      // Refresh sync logs
      await fetchSyncLogs()
    } catch (error) {
      console.error('Error triggering sync:', error)
      alert('Error triggering sync')
    } finally {
      setSyncing(false)
    }
  }

  const deleteAllVipTrades = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/vip-sync/delete', {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Successfully deleted ${data.deletedTrades} VIP trades and ${data.deletedLogs} import logs!`)
        setDeleteConfirm(false)
        // Refresh sync logs
        await fetchSyncLogs()
      } else {
        alert(`Error deleting VIP trades: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting VIP trades:', error)
      alert('Error deleting VIP trades')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchSyncLogs(),
        loadPromotionalContent()
      ])
      setLoading(false)
    }
    
    loadData()
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading VIP Sync...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">VIP Sync Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage VIP MT5 integration and trading data synchronization
        </p>
      </div>

      <Tabs defaultValue="sync-method" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sync-method">Sync Method</TabsTrigger>
          <TabsTrigger value="manual-import">Manual Import</TabsTrigger>
          <TabsTrigger value="api-setup">API Setup</TabsTrigger>
          <TabsTrigger value="data-management">Data Management</TabsTrigger>
          <TabsTrigger value="promotional-content">Promotional Content</TabsTrigger>
          <TabsTrigger value="sync-history">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="sync-method" className="space-y-6">
          {/* VIP Results Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                VIP Results Configuration
              </CardTitle>
              <CardDescription>
                VIP Results page now displays signals sent by admin instead of MT5 trades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      VIP Results Updated
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      The VIP Results page now shows VIP signals instead of MT5 trades. 
                      Profile selection has been removed from VIP Results and is only available in the Trading Journal for personal trades.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sync Method Selector */}
          <SyncMethodSelector
            currentMethod={syncMethod}
            onMethodChange={setSyncMethod}
            manualStats={{
              lastUpload: '2024-01-15T10:30:00Z',
              totalImports: 5
            }}
            apiStats={{
              lastSync: '2024-01-15T10:30:00Z',
              nextSync: '2024-01-15T10:45:00Z',
              status: 'disconnected'
            }}
          />
        </TabsContent>

        <TabsContent value="manual-import" className="space-y-6">
          {/* Manual CSV Import */}
          <CsvImportPanel />
        </TabsContent>

        <TabsContent value="api-setup" className="space-y-6">
          {/* API Setup */}
          <ApiSetupPanel />
        </TabsContent>

        <TabsContent value="data-management" className="space-y-6">
          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Manage VIP trading data and clear imported trades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                      Delete All VIP Trades
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                      This will permanently delete all imported VIP trades and import logs. 
                      This action cannot be undone.
                    </p>
                    {deleteConfirm && (
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-4">
                        ⚠️ Are you sure you want to delete all VIP trades? Click the button again to confirm.
                      </p>
                    )}
                    <Button
                      onClick={deleteAllVipTrades}
                      disabled={deleting}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleting ? 'Deleting...' : deleteConfirm ? 'Confirm Delete All' : 'Delete All VIP Trades'}
                    </Button>
                    {deleteConfirm && (
                      <Button
                        onClick={() => setDeleteConfirm(false)}
                        variant="outline"
                        className="ml-2"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotional-content" className="space-y-6">
          {/* Promotional Content Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Promotional Content Management
              </CardTitle>
              <CardDescription>
                Customize the promotional cards and CTAs shown on the VIP Results page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hero Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Hero Card
                    </CardTitle>
                    <CardDescription>
                      Main promotional banner at the top of VIP Results
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Basic Content */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="hero-title">Title</Label>
                        <Input
                          id="hero-title"
                          value={editingContent?.id === 'hero-card' ? editingContent.title : promotionalContent.hero?.title || ''}
                          onChange={(e) => {
                            if (editingContent?.id === 'hero-card') {
                              setEditingContent({ ...editingContent, title: e.target.value })
                            } else {
                              setEditingContent({ 
                                id: 'hero-card',
                                title: e.target.value,
                                description: promotionalContent.hero?.description || '',
                                buttonText: promotionalContent.hero?.buttonText || '',
                                buttonUrl: promotionalContent.hero?.buttonUrl || '',
                                pricing: promotionalContent.hero?.pricing || '',
                                guarantee: promotionalContent.hero?.guarantee || '',
                                isActive: promotionalContent.hero?.isActive || true,
                                backgroundColor: promotionalContent.hero?.backgroundColor || '#dc2626',
                                textColor: promotionalContent.hero?.textColor || '#ffffff',
                                buttonColor: promotionalContent.hero?.buttonColor || '#ffffff',
                                buttonHoverColor: promotionalContent.hero?.buttonHoverColor || '#f3f4f6',
                                borderColor: promotionalContent.hero?.borderColor || '#dc2626',
                                urgencyText: promotionalContent.hero?.urgencyText || '',
                                socialProof: promotionalContent.hero?.socialProof || '',
                                discountCode: promotionalContent.hero?.discountCode || '',
                                limitedTimeOffer: promotionalContent.hero?.limitedTimeOffer || false,
                                offerExpiry: promotionalContent.hero?.offerExpiry || '',
                                lastUpdated: new Date().toISOString(),
                                type: 'hero'
                              })
                            }
                          }}
                          placeholder="Enter the main title"
                        />
                      </div>

                      <div>
                        <Label htmlFor="hero-description">Description</Label>
                        <Textarea
                          id="hero-description"
                          value={editingContent?.id === 'hero-card' ? editingContent.description : promotionalContent.hero?.description || ''}
                          onChange={(e) => {
                            if (editingContent?.id === 'hero-card') {
                              setEditingContent({ ...editingContent, description: e.target.value })
                            } else {
                              setEditingContent({ 
                                id: 'hero-card',
                                title: promotionalContent.hero?.title || '',
                                description: e.target.value,
                                buttonText: promotionalContent.hero?.buttonText || '',
                                buttonUrl: promotionalContent.hero?.buttonUrl || '',
                                pricing: promotionalContent.hero?.pricing || '',
                                guarantee: promotionalContent.hero?.guarantee || '',
                                isActive: promotionalContent.hero?.isActive || true,
                                backgroundColor: promotionalContent.hero?.backgroundColor || '#dc2626',
                                textColor: promotionalContent.hero?.textColor || '#ffffff',
                                buttonColor: promotionalContent.hero?.buttonColor || '#ffffff',
                                buttonHoverColor: promotionalContent.hero?.buttonHoverColor || '#f3f4f6',
                                borderColor: promotionalContent.hero?.borderColor || '#dc2626',
                                urgencyText: promotionalContent.hero?.urgencyText || '',
                                socialProof: promotionalContent.hero?.socialProof || '',
                                discountCode: promotionalContent.hero?.discountCode || '',
                                limitedTimeOffer: promotionalContent.hero?.limitedTimeOffer || false,
                                offerExpiry: promotionalContent.hero?.offerExpiry || '',
                                lastUpdated: new Date().toISOString(),
                                type: 'hero'
                              })
                            }
                          }}
                          placeholder="Enter the description text"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="hero-button">Button Text</Label>
                        <Input
                          id="hero-button"
                          value={editingContent?.id === 'hero-card' ? editingContent.buttonText : promotionalContent.hero?.buttonText || ''}
                          onChange={(e) => {
                            if (editingContent?.id === 'hero-card') {
                              setEditingContent({ ...editingContent, buttonText: e.target.value })
                            } else {
                              setEditingContent({ 
                                id: 'hero-card',
                                title: promotionalContent.hero?.title || '',
                                description: promotionalContent.hero?.description || '',
                                buttonText: e.target.value,
                                buttonUrl: promotionalContent.hero?.buttonUrl || '',
                                pricing: promotionalContent.hero?.pricing || '',
                                guarantee: promotionalContent.hero?.guarantee || '',
                                isActive: promotionalContent.hero?.isActive || true,
                                backgroundColor: promotionalContent.hero?.backgroundColor || '#dc2626',
                                textColor: promotionalContent.hero?.textColor || '#ffffff',
                                buttonColor: promotionalContent.hero?.buttonColor || '#ffffff',
                                buttonHoverColor: promotionalContent.hero?.buttonHoverColor || '#f3f4f6',
                                borderColor: promotionalContent.hero?.borderColor || '#dc2626',
                                urgencyText: promotionalContent.hero?.urgencyText || '',
                                socialProof: promotionalContent.hero?.socialProof || '',
                                discountCode: promotionalContent.hero?.discountCode || '',
                                limitedTimeOffer: promotionalContent.hero?.limitedTimeOffer || false,
                                offerExpiry: promotionalContent.hero?.offerExpiry || '',
                                lastUpdated: new Date().toISOString(),
                                type: 'hero'
                              })
                            }
                          }}
                          placeholder="Enter button text"
                        />
                      </div>

                      <div>
                        <Label htmlFor="hero-button-url">Button URL</Label>
                        <Input
                          id="hero-button-url"
                          value={editingContent?.id === 'hero-card' ? editingContent.buttonUrl || '' : promotionalContent.hero?.buttonUrl || ''}
                          onChange={(e) => {
                            if (editingContent?.id === 'hero-card') {
                              setEditingContent({ ...editingContent, buttonUrl: e.target.value })
                            } else {
                              setEditingContent({ 
                                id: 'hero-card',
                                title: promotionalContent.hero?.title || '',
                                description: promotionalContent.hero?.description || '',
                                buttonText: promotionalContent.hero?.buttonText || '',
                                buttonUrl: e.target.value,
                                pricing: promotionalContent.hero?.pricing || '',
                                guarantee: promotionalContent.hero?.guarantee || '',
                                isActive: promotionalContent.hero?.isActive || true,
                                backgroundColor: promotionalContent.hero?.backgroundColor || '#dc2626',
                                textColor: promotionalContent.hero?.textColor || '#ffffff',
                                buttonColor: promotionalContent.hero?.buttonColor || '#ffffff',
                                buttonHoverColor: promotionalContent.hero?.buttonHoverColor || '#f3f4f6',
                                borderColor: promotionalContent.hero?.borderColor || '#dc2626',
                                urgencyText: promotionalContent.hero?.urgencyText || '',
                                socialProof: promotionalContent.hero?.socialProof || '',
                                discountCode: promotionalContent.hero?.discountCode || '',
                                limitedTimeOffer: promotionalContent.hero?.limitedTimeOffer || false,
                                offerExpiry: promotionalContent.hero?.offerExpiry || '',
                                lastUpdated: new Date().toISOString(),
                                type: 'hero'
                              })
                            }
                          }}
                          placeholder="https://example.com/join-vip"
                        />
                      </div>
                    </div>

                    {/* Conversion Optimization */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">🎯 Conversion Optimization</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="hero-urgency">Urgency Text</Label>
                          <Input
                            id="hero-urgency"
                            value={editingContent?.id === 'hero-card' ? editingContent.urgencyText || '' : promotionalContent.hero?.urgencyText || ''}
                            onChange={(e) => {
                              if (editingContent?.id === 'hero-card') {
                                setEditingContent({ ...editingContent, urgencyText: e.target.value })
                              } else {
                                setEditingContent(initializeEditingContent('hero', 'urgencyText', e.target.value))
                              }
                            }}
                            placeholder="Limited Time Offer!"
                          />
                        </div>

                        <div>
                          <Label htmlFor="hero-social-proof">Social Proof</Label>
                          <Input
                            id="hero-social-proof"
                            value={editingContent?.id === 'hero-card' ? editingContent.socialProof || '' : promotionalContent.hero?.socialProof || ''}
                            onChange={(e) => {
                              if (editingContent?.id === 'hero-card') {
                                setEditingContent({ ...editingContent, socialProof: e.target.value })
                              } else {
                                setEditingContent(initializeEditingContent('hero', 'socialProof', e.target.value))
                              }
                            }}
                            placeholder="Join 500+ successful traders"
                          />
                        </div>

                        <div>
                          <Label htmlFor="hero-discount">Discount Code</Label>
                          <Input
                            id="hero-discount"
                            value={editingContent?.id === 'hero-card' ? editingContent.discountCode || '' : promotionalContent.hero?.discountCode || ''}
                            onChange={(e) => {
                              if (editingContent?.id === 'hero-card') {
                                setEditingContent({ ...editingContent, discountCode: e.target.value })
                              } else {
                                setEditingContent(initializeEditingContent('hero', 'discountCode', e.target.value))
                              }
                            }}
                            placeholder="VIP50"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="hero-limited-time"
                            checked={editingContent?.id === 'hero-card' ? editingContent.limitedTimeOffer || false : promotionalContent.hero?.limitedTimeOffer || false}
                            onCheckedChange={(checked) => {
                              if (editingContent?.id === 'hero-card') {
                                setEditingContent({ ...editingContent, limitedTimeOffer: checked })
                              } else {
                                setEditingContent(initializeEditingContent('hero', 'limitedTimeOffer', checked))
                              }
                            }}
                          />
                          <Label htmlFor="hero-limited-time">Limited Time Offer</Label>
                        </div>
                      </div>
                    </div>

                    {/* Color Customization */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">🎨 Color Customization</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="hero-bg-color">Background Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="hero-bg-color"
                              type="color"
                              value={editingContent?.id === 'hero-card' ? editingContent.backgroundColor || '#dc2626' : promotionalContent.hero?.backgroundColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, backgroundColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'backgroundColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'hero-card' ? editingContent.backgroundColor || '#dc2626' : promotionalContent.hero?.backgroundColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, backgroundColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'backgroundColor', e.target.value))
                                }
                              }}
                              placeholder="#dc2626"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="hero-text-color">Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="hero-text-color"
                              type="color"
                              value={editingContent?.id === 'hero-card' ? editingContent.textColor || '#ffffff' : promotionalContent.hero?.textColor || '#ffffff'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, textColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'textColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'hero-card' ? editingContent.textColor || '#ffffff' : promotionalContent.hero?.textColor || '#ffffff'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, textColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'textColor', e.target.value))
                                }
                              }}
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="hero-button-color">Button Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="hero-button-color"
                              type="color"
                              value={editingContent?.id === 'hero-card' ? editingContent.buttonColor || '#ffffff' : promotionalContent.hero?.buttonColor || '#ffffff'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, buttonColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'buttonColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'hero-card' ? editingContent.buttonColor || '#ffffff' : promotionalContent.hero?.buttonColor || '#ffffff'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, buttonColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'buttonColor', e.target.value))
                                }
                              }}
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="hero-button-text-color">Button Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="hero-button-text-color"
                              type="color"
                              value={editingContent?.id === 'hero-card' ? editingContent.buttonTextColor || '#dc2626' : promotionalContent.hero?.buttonTextColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, buttonTextColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'buttonTextColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'hero-card' ? editingContent.buttonTextColor || '#dc2626' : promotionalContent.hero?.buttonTextColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, buttonTextColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'buttonTextColor', e.target.value))
                                }
                              }}
                              placeholder="#dc2626"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="hero-border-color">Border Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="hero-border-color"
                              type="color"
                              value={editingContent?.id === 'hero-card' ? editingContent.borderColor || '#dc2626' : promotionalContent.hero?.borderColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, borderColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'borderColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'hero-card' ? editingContent.borderColor || '#dc2626' : promotionalContent.hero?.borderColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'hero-card') {
                                  setEditingContent({ ...editingContent, borderColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('hero', 'borderColor', e.target.value))
                                }
                              }}
                              placeholder="#dc2626"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hero-active"
                        checked={editingContent?.id === 'hero-card' ? editingContent.isActive : promotionalContent.hero?.isActive || false}
                        onCheckedChange={(checked) => {
                          if (editingContent?.id === 'hero-card') {
                            setEditingContent({ ...editingContent, isActive: checked })
                          } else {
                            setEditingContent({ 
                              id: 'hero-card',
                              title: promotionalContent.hero?.title || '',
                              description: promotionalContent.hero?.description || '',
                              buttonText: promotionalContent.hero?.buttonText || '',
                              buttonUrl: promotionalContent.hero?.buttonUrl || '',
                              pricing: promotionalContent.hero?.pricing || '',
                              guarantee: promotionalContent.hero?.guarantee || '',
                              isActive: checked,
                              backgroundColor: promotionalContent.hero?.backgroundColor || '#dc2626',
                              textColor: promotionalContent.hero?.textColor || '#ffffff',
                              buttonColor: promotionalContent.hero?.buttonColor || '#ffffff',
                              buttonHoverColor: promotionalContent.hero?.buttonHoverColor || '#f3f4f6',
                              borderColor: promotionalContent.hero?.borderColor || '#dc2626',
                              urgencyText: promotionalContent.hero?.urgencyText || '',
                              socialProof: promotionalContent.hero?.socialProof || '',
                              discountCode: promotionalContent.hero?.discountCode || '',
                              limitedTimeOffer: promotionalContent.hero?.limitedTimeOffer || false,
                              offerExpiry: promotionalContent.hero?.offerExpiry || '',
                              lastUpdated: new Date().toISOString(),
                              type: 'hero'
                            })
                          }
                        }}
                      />
                      <Label htmlFor="hero-active">Active (show to users)</Label>
                    </div>

                    <Button 
                      onClick={() => {
                        if (editingContent?.id === 'hero-card') {
                          savePromotionalContent(editingContent)
                        }
                      }}
                      disabled={savingContent || !editingContent || editingContent.id !== 'hero-card'}
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {savingContent ? 'Saving...' : 'Save Hero Card'}
                    </Button>
                  </CardContent>
                </Card>

                {/* CTA Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      CTA Card
                    </CardTitle>
                    <CardDescription>
                      Bottom call-to-action card on VIP Results
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Basic Content */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cta-title">Title</Label>
                        <Input
                          id="cta-title"
                          value={editingContent?.id === 'cta-card' ? editingContent.title : promotionalContent.cta?.title || ''}
                          onChange={(e) => {
                            if (editingContent?.id === 'cta-card') {
                              setEditingContent({ ...editingContent, title: e.target.value })
                            } else {
                              setEditingContent({ 
                                id: 'cta-card',
                                title: e.target.value,
                                description: promotionalContent.cta?.description || '',
                                buttonText: promotionalContent.cta?.buttonText || '',
                                buttonUrl: promotionalContent.cta?.buttonUrl || '',
                                pricing: promotionalContent.cta?.pricing || '',
                                guarantee: promotionalContent.cta?.guarantee || '',
                                isActive: promotionalContent.cta?.isActive || true,
                                backgroundColor: promotionalContent.cta?.backgroundColor || '#ffffff',
                                textColor: promotionalContent.cta?.textColor || '#1f2937',
                                buttonColor: promotionalContent.cta?.buttonColor || '#dc2626',
                                buttonHoverColor: promotionalContent.cta?.buttonHoverColor || '#b91c1c',
                                borderColor: promotionalContent.cta?.borderColor || '#dc2626',
                                urgencyText: promotionalContent.cta?.urgencyText || '',
                                socialProof: promotionalContent.cta?.socialProof || '',
                                discountCode: promotionalContent.cta?.discountCode || '',
                                limitedTimeOffer: promotionalContent.cta?.limitedTimeOffer || false,
                                offerExpiry: promotionalContent.cta?.offerExpiry || '',
                                lastUpdated: new Date().toISOString(),
                                type: 'cta'
                              })
                            }
                          }}
                          placeholder="Enter the main title"
                        />
                      </div>

                      <div>
                        <Label htmlFor="cta-description">Description</Label>
                        <Textarea
                          id="cta-description"
                          value={editingContent?.id === 'cta-card' ? editingContent.description : promotionalContent.cta?.description || ''}
                          onChange={(e) => {
                            if (editingContent?.id === 'cta-card') {
                              setEditingContent({ ...editingContent, description: e.target.value })
                            } else {
                              setEditingContent({ 
                                id: 'cta-card',
                                title: promotionalContent.cta?.title || '',
                                description: e.target.value,
                                buttonText: promotionalContent.cta?.buttonText || '',
                                buttonUrl: promotionalContent.cta?.buttonUrl || '',
                                pricing: promotionalContent.cta?.pricing || '',
                                guarantee: promotionalContent.cta?.guarantee || '',
                                isActive: promotionalContent.cta?.isActive || true,
                                backgroundColor: promotionalContent.cta?.backgroundColor || '#ffffff',
                                textColor: promotionalContent.cta?.textColor || '#1f2937',
                                buttonColor: promotionalContent.cta?.buttonColor || '#dc2626',
                                buttonHoverColor: promotionalContent.cta?.buttonHoverColor || '#b91c1c',
                                borderColor: promotionalContent.cta?.borderColor || '#dc2626',
                                urgencyText: promotionalContent.cta?.urgencyText || '',
                                socialProof: promotionalContent.cta?.socialProof || '',
                                discountCode: promotionalContent.cta?.discountCode || '',
                                limitedTimeOffer: promotionalContent.cta?.limitedTimeOffer || false,
                                offerExpiry: promotionalContent.cta?.offerExpiry || '',
                                lastUpdated: new Date().toISOString(),
                                type: 'cta'
                              })
                            }
                          }}
                          placeholder="Enter the description text"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="cta-button">Button Text</Label>
                        <Input
                          id="cta-button"
                          value={editingContent?.id === 'cta-card' ? editingContent.buttonText : promotionalContent.cta?.buttonText || ''}
                          onChange={(e) => {
                            if (editingContent?.id === 'cta-card') {
                              setEditingContent({ ...editingContent, buttonText: e.target.value })
                            } else {
                              setEditingContent({ 
                                id: 'cta-card',
                                title: promotionalContent.cta?.title || '',
                                description: promotionalContent.cta?.description || '',
                                buttonText: e.target.value,
                                buttonUrl: promotionalContent.cta?.buttonUrl || '',
                                pricing: promotionalContent.cta?.pricing || '',
                                guarantee: promotionalContent.cta?.guarantee || '',
                                isActive: promotionalContent.cta?.isActive || true,
                                backgroundColor: promotionalContent.cta?.backgroundColor || '#ffffff',
                                textColor: promotionalContent.cta?.textColor || '#1f2937',
                                buttonColor: promotionalContent.cta?.buttonColor || '#dc2626',
                                buttonHoverColor: promotionalContent.cta?.buttonHoverColor || '#b91c1c',
                                borderColor: promotionalContent.cta?.borderColor || '#dc2626',
                                urgencyText: promotionalContent.cta?.urgencyText || '',
                                socialProof: promotionalContent.cta?.socialProof || '',
                                discountCode: promotionalContent.cta?.discountCode || '',
                                limitedTimeOffer: promotionalContent.cta?.limitedTimeOffer || false,
                                offerExpiry: promotionalContent.cta?.offerExpiry || '',
                                lastUpdated: new Date().toISOString(),
                                type: 'cta'
                              })
                            }
                          }}
                          placeholder="Enter button text"
                        />
                      </div>

                      <div>
                        <Label htmlFor="cta-button-url">Button URL</Label>
                        <Input
                          id="cta-button-url"
                          value={editingContent?.id === 'cta-card' ? editingContent.buttonUrl || '' : promotionalContent.cta?.buttonUrl || ''}
                          onChange={(e) => {
                            if (editingContent?.id === 'cta-card') {
                              setEditingContent({ ...editingContent, buttonUrl: e.target.value })
                            } else {
                              setEditingContent({ 
                                id: 'cta-card',
                                title: promotionalContent.cta?.title || '',
                                description: promotionalContent.cta?.description || '',
                                buttonText: promotionalContent.cta?.buttonText || '',
                                buttonUrl: e.target.value,
                                pricing: promotionalContent.cta?.pricing || '',
                                guarantee: promotionalContent.cta?.guarantee || '',
                                isActive: promotionalContent.cta?.isActive || true,
                                backgroundColor: promotionalContent.cta?.backgroundColor || '#ffffff',
                                textColor: promotionalContent.cta?.textColor || '#1f2937',
                                buttonColor: promotionalContent.cta?.buttonColor || '#dc2626',
                                buttonHoverColor: promotionalContent.cta?.buttonHoverColor || '#b91c1c',
                                borderColor: promotionalContent.cta?.borderColor || '#dc2626',
                                urgencyText: promotionalContent.cta?.urgencyText || '',
                                socialProof: promotionalContent.cta?.socialProof || '',
                                discountCode: promotionalContent.cta?.discountCode || '',
                                limitedTimeOffer: promotionalContent.cta?.limitedTimeOffer || false,
                                offerExpiry: promotionalContent.cta?.offerExpiry || '',
                                lastUpdated: new Date().toISOString(),
                                type: 'cta'
                              })
                            }
                          }}
                          placeholder="https://example.com/join-vip"
                        />
                      </div>
                    </div>

                    {/* Conversion Optimization */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">🎯 Conversion Optimization</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cta-urgency">Urgency Text</Label>
                          <Input
                            id="cta-urgency"
                            value={editingContent?.id === 'cta-card' ? editingContent.urgencyText || '' : promotionalContent.cta?.urgencyText || ''}
                            onChange={(e) => {
                              if (editingContent?.id === 'cta-card') {
                                setEditingContent({ ...editingContent, urgencyText: e.target.value })
                              } else {
                                setEditingContent(initializeEditingContent('cta', 'urgencyText', e.target.value))
                              }
                            }}
                            placeholder="Only 10 spots left this month!"
                          />
                        </div>

                        <div>
                          <Label htmlFor="cta-social-proof">Social Proof</Label>
                          <Input
                            id="cta-social-proof"
                            value={editingContent?.id === 'cta-card' ? editingContent.socialProof || '' : promotionalContent.cta?.socialProof || ''}
                            onChange={(e) => {
                              if (editingContent?.id === 'cta-card') {
                                setEditingContent({ ...editingContent, socialProof: e.target.value })
                              } else {
                                setEditingContent(initializeEditingContent('cta', 'socialProof', e.target.value))
                              }
                            }}
                            placeholder="500+ active members"
                          />
                        </div>

                        <div>
                          <Label htmlFor="cta-discount">Discount Code</Label>
                          <Input
                            id="cta-discount"
                            value={editingContent?.id === 'cta-card' ? editingContent.discountCode || '' : promotionalContent.cta?.discountCode || ''}
                            onChange={(e) => {
                              if (editingContent?.id === 'cta-card') {
                                setEditingContent({ ...editingContent, discountCode: e.target.value })
                              } else {
                                setEditingContent(initializeEditingContent('cta', 'discountCode', e.target.value))
                              }
                            }}
                            placeholder="FIRST50"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="cta-limited-time"
                            checked={editingContent?.id === 'cta-card' ? editingContent.limitedTimeOffer || false : promotionalContent.cta?.limitedTimeOffer || false}
                            onCheckedChange={(checked) => {
                              if (editingContent?.id === 'cta-card') {
                                setEditingContent({ ...editingContent, limitedTimeOffer: checked })
                              } else {
                                setEditingContent(initializeEditingContent('cta', 'limitedTimeOffer', checked))
                              }
                            }}
                          />
                          <Label htmlFor="cta-limited-time">Limited Time Offer</Label>
                        </div>
                      </div>
                    </div>

                    {/* Color Customization */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">🎨 Color Customization</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cta-bg-color">Background Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="cta-bg-color"
                              type="color"
                              value={editingContent?.id === 'cta-card' ? editingContent.backgroundColor || '#ffffff' : promotionalContent.cta?.backgroundColor || '#ffffff'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, backgroundColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'backgroundColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'cta-card' ? editingContent.backgroundColor || '#ffffff' : promotionalContent.cta?.backgroundColor || '#ffffff'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, backgroundColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'backgroundColor', e.target.value))
                                }
                              }}
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="cta-text-color">Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="cta-text-color"
                              type="color"
                              value={editingContent?.id === 'cta-card' ? editingContent.textColor || '#1f2937' : promotionalContent.cta?.textColor || '#1f2937'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, textColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'textColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'cta-card' ? editingContent.textColor || '#1f2937' : promotionalContent.cta?.textColor || '#1f2937'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, textColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'textColor', e.target.value))
                                }
                              }}
                              placeholder="#1f2937"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="cta-button-color">Button Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="cta-button-color"
                              type="color"
                              value={editingContent?.id === 'cta-card' ? editingContent.buttonColor || '#dc2626' : promotionalContent.cta?.buttonColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, buttonColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'buttonColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'cta-card' ? editingContent.buttonColor || '#dc2626' : promotionalContent.cta?.buttonColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, buttonColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'buttonColor', e.target.value))
                                }
                              }}
                              placeholder="#dc2626"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="cta-button-text-color">Button Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="cta-button-text-color"
                              type="color"
                              value={editingContent?.id === 'cta-card' ? editingContent.buttonTextColor || '#ffffff' : promotionalContent.cta?.buttonTextColor || '#ffffff'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, buttonTextColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'buttonTextColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'cta-card' ? editingContent.buttonTextColor || '#ffffff' : promotionalContent.cta?.buttonTextColor || '#ffffff'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, buttonTextColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'buttonTextColor', e.target.value))
                                }
                              }}
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="cta-border-color">Border Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="cta-border-color"
                              type="color"
                              value={editingContent?.id === 'cta-card' ? editingContent.borderColor || '#dc2626' : promotionalContent.cta?.borderColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, borderColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'borderColor', e.target.value))
                                }
                              }}
                              className="w-12 h-10"
                            />
                            <Input
                              value={editingContent?.id === 'cta-card' ? editingContent.borderColor || '#dc2626' : promotionalContent.cta?.borderColor || '#dc2626'}
                              onChange={(e) => {
                                if (editingContent?.id === 'cta-card') {
                                  setEditingContent({ ...editingContent, borderColor: e.target.value })
                                } else {
                                  setEditingContent(initializeEditingContent('cta', 'borderColor', e.target.value))
                                }
                              }}
                              placeholder="#dc2626"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="cta-active"
                        checked={editingContent?.id === 'cta-card' ? editingContent.isActive : promotionalContent.cta?.isActive || false}
                        onCheckedChange={(checked) => {
                          if (editingContent?.id === 'cta-card') {
                            setEditingContent({ ...editingContent, isActive: checked })
                          } else {
                            setEditingContent({ 
                              id: 'cta-card',
                              title: promotionalContent.cta?.title || '',
                              description: promotionalContent.cta?.description || '',
                              buttonText: promotionalContent.cta?.buttonText || '',
                              buttonUrl: promotionalContent.cta?.buttonUrl || '',
                              pricing: promotionalContent.cta?.pricing || '',
                              guarantee: promotionalContent.cta?.guarantee || '',
                              isActive: checked,
                              backgroundColor: promotionalContent.cta?.backgroundColor || '#ffffff',
                              textColor: promotionalContent.cta?.textColor || '#1f2937',
                              buttonColor: promotionalContent.cta?.buttonColor || '#dc2626',
                              buttonHoverColor: promotionalContent.cta?.buttonHoverColor || '#b91c1c',
                              borderColor: promotionalContent.cta?.borderColor || '#dc2626',
                              urgencyText: promotionalContent.cta?.urgencyText || '',
                              socialProof: promotionalContent.cta?.socialProof || '',
                              discountCode: promotionalContent.cta?.discountCode || '',
                              limitedTimeOffer: promotionalContent.cta?.limitedTimeOffer || false,
                              offerExpiry: promotionalContent.cta?.offerExpiry || '',
                              lastUpdated: new Date().toISOString(),
                              type: 'cta'
                            })
                          }
                        }}
                      />
                      <Label htmlFor="cta-active">Active (show to users)</Label>
                    </div>

                    <Button 
                      onClick={() => {
                        if (editingContent?.id === 'cta-card') {
                          savePromotionalContent(editingContent)
                        }
                      }}
                      disabled={savingContent || !editingContent || editingContent.id !== 'cta-card'}
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {savingContent ? 'Saving...' : 'Save CTA Card'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Status */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={promotionalContent.hero?.isActive ? "default" : "secondary"}>
                          {promotionalContent.hero?.isActive ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Hero Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Hero Inactive
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={promotionalContent.cta?.isActive ? "default" : "secondary"}>
                          {promotionalContent.cta?.isActive ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              CTA Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              CTA Inactive
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-history" className="space-y-6">
          {/* Sync History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Sync History
              </CardTitle>
              <CardDescription>
                Recent synchronization activities and logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No sync logs available
                  </div>
                ) : (
                  syncLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(log.status)}
                        <div>
                          <div className="font-medium">
                            {formatTimeAgo(log.syncedAt)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Imported: {log.tradesImported} | Updated: {log.tradesUpdated}
                            {log.errors.length > 0 && ` | Errors: ${log.errors.length}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                        {log.errors.length > 0 && (
                          <Button variant="outline" size="sm">
                            View Errors
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
