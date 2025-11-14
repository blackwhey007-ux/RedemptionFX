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
import { OpenTradesPanel } from '@/components/admin/OpenTradesPanel'
import { MT5TradeHistoryPanel } from '@/components/admin/MT5TradeHistoryPanel'
// Removed profile imports - VIP Results now shows signals only
import { PromotionalContentService, PromotionalContent } from '@/lib/promotionalContentService'
import { useAuth } from '@/contexts/AuthContext'
import { 
  RefreshCw, 
  Activity, 
  Save,
  Megaphone,
  Eye,
  Edit,
  History,
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function VipSyncPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // Removed profile selection state - VIP Results now shows signals only
  
  // Promotional content state
  const [promotionalContent, setPromotionalContent] = useState<{
    hero: PromotionalContent | null
    cta: PromotionalContent | null
  }>({ hero: null, cta: null })
  const [savingContent, setSavingContent] = useState(false)
  const [editingContent, setEditingContent] = useState<PromotionalContent | null>(null)

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await loadPromotionalContent()
      setLoading(false)
    }
    
    loadData()
  }, [])

  // Admin access check
  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400">
              You need admin privileges to access VIP Sync Management.
            </p>
          </div>
        </div>
      </div>
    )
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

      <Tabs defaultValue="open-trades" className="space-y-6">
        <TabsList>
          <TabsTrigger value="open-trades">Live Positions</TabsTrigger>
          <TabsTrigger value="mt5-history">Trade History</TabsTrigger>
          <TabsTrigger value="promotional-content">Promotional Content</TabsTrigger>
        </TabsList>

        <TabsContent value="open-trades" className="space-y-6">
          {/* Open Trades */}
          <OpenTradesPanel />
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

        <TabsContent value="mt5-history" className="space-y-6">
          {/* MT5 Trade History - Embedded directly in tab */}
          <MT5TradeHistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
