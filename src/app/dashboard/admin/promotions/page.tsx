'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  getAllPromotions, 
  createPromotion, 
  updatePromotion, 
  deletePromotion, 
  togglePromotionStatus, 
  reorderPromotions,
  getNextDisplayOrder 
} from '@/lib/promotionService'
import { UserNotificationService } from '@/lib/userNotificationService'
import { Promotion, PromotionType, PROMOTION_TYPE_LABELS, PROMOTION_TYPE_ICONS } from '@/types/promotion'
import { getPromotionPages, getNotificationPages, PageInfo } from '@/lib/pageDiscovery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Gift,
  MessageCircle,
  GraduationCap,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

const getIcon = (iconName: string) => {
  const iconMap = {
    Gift,
    MessageCircle,
    GraduationCap
  }
  return iconMap[iconName as keyof typeof iconMap] || Gift
}

const getColorClass = (type: string) => {
  const colorMap = {
    discount: 'from-yellow-400 to-orange-500',
    telegram: 'from-red-400 to-red-600',
    copytrading: 'from-green-400 to-green-600',
    coaching: 'from-purple-400 to-purple-600',
    custom: 'from-pink-400 to-pink-600'
  }
  return colorMap[type as keyof typeof colorMap] || 'from-gray-400 to-gray-600'
}

export default function AdminPromotionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [formData, setFormData] = useState({
    type: 'discount' as PromotionType,
    title: '',
    description: '',
    ctaText: '',
    ctaLink: '',
    linkType: 'internal' as 'internal' | 'external',
    displayPage: '/dashboard/trading-journal', // Default to trading journal
    redirectPath: '/dashboard/trading-journal', // Default redirect
    redirectType: 'internal' as 'internal' | 'external',
    targetAudience: 'both' as 'vip' | 'guest' | 'both',
    icon: 'Gift',
    color: 'from-yellow-400 to-orange-500'
  })

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  // Load promotions
  useEffect(() => {
    if (user?.role === 'admin') {
      loadPromotions()
    }
  }, [user])

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const data = await getAllPromotions()
      setPromotions(data)
    } catch (error) {
      console.error('Error loading promotions:', error)
      toast.error('Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePromotion = async () => {
    try {
      if (!user?.uid) return

      const nextOrder = await getNextDisplayOrder()
      
      console.log('Creating promotion with data:', {
        adminId: user.uid,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        ctaText: formData.ctaText,
        ctaLink: formData.ctaLink,
        isActive: true,
        targetAudience: formData.targetAudience,
        displayOrder: nextOrder,
        icon: formData.icon,
        color: formData.color
      })
      
      const newPromotionId = await createPromotion({
        adminId: user.uid,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        ctaText: formData.ctaText,
        ctaLink: formData.ctaLink,
        isActive: true,
        targetAudience: formData.targetAudience,
        displayOrder: nextOrder,
        icon: formData.icon,
        color: formData.color
      })

      console.log('Promotion created successfully with ID:', newPromotionId)

      // Send notification to all users about the new promotion
      try {
        // Determine the action URL based on redirect settings
        let actionUrl = '/dashboard'
        if (formData.redirectType === 'external' && formData.redirectPath) {
          actionUrl = formData.redirectPath
        } else if (formData.redirectType === 'internal' && formData.redirectPath) {
          // Ensure internal links start with / and are valid paths
          const cleanPath = formData.redirectPath.startsWith('/') ? formData.redirectPath : `/${formData.redirectPath}`
          
          // Get valid paths from page discovery
          const validPaths = getNotificationPages().map(page => page.path)
          
          // Check if the path is valid, otherwise default to dashboard
          actionUrl = validPaths.includes(cleanPath) ? cleanPath : '/dashboard'
        }

        if (formData.targetAudience === 'both') {
          console.log('Sending promotion notification to all users...')
          const userCount = await UserNotificationService.notifyAllUsers({
            type: 'promotion',
            title: 'New Promotion Available!',
            message: formData.description || `Check out our latest promotion: ${formData.title}`,
            data: {
              promotionId: newPromotionId,
              soundType: 'promotion',
              actionUrl: actionUrl
            }
          })
          console.log(`Promotion notification sent to ${userCount} users`)
        } else if (formData.targetAudience === 'vip') {
          console.log('Sending promotion notification to VIP users...')
          const vipCount = await UserNotificationService.notifyAllVIPUsers({
            type: 'promotion',
            title: 'New VIP Promotion!',
            message: formData.description || `Exclusive VIP promotion: ${formData.title}`,
            data: {
              promotionId: newPromotionId,
              soundType: 'promotion',
              actionUrl: actionUrl
            }
          })
          console.log(`VIP promotion notification sent to ${vipCount} users`)
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError)
        // Don't fail the entire operation if notifications fail
        toast.error('Promotion created but failed to send notifications')
      }

      toast.success('Promotion created successfully')
      setShowCreateDialog(false)
      resetForm()
      loadPromotions()
    } catch (error) {
      console.error('Error creating promotion:', error)
      toast.error('Failed to create promotion')
    }
  }

  const handleUpdatePromotion = async () => {
    try {
      if (!selectedPromotion) return

      await updatePromotion(selectedPromotion.id, {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        ctaText: formData.ctaText,
        ctaLink: formData.ctaLink,
        targetAudience: formData.targetAudience,
        icon: formData.icon,
        color: formData.color
      })

      toast.success('Promotion updated successfully')
      setShowEditDialog(false)
      setSelectedPromotion(null)
      resetForm()
      loadPromotions()
    } catch (error) {
      console.error('Error updating promotion:', error)
      toast.error('Failed to update promotion')
    }
  }

  const handleDeletePromotion = async () => {
    try {
      if (!selectedPromotion) return

      await deletePromotion(selectedPromotion.id)
      toast.success('Promotion deleted successfully')
      setShowDeleteDialog(false)
      setSelectedPromotion(null)
      loadPromotions()
    } catch (error) {
      console.error('Error deleting promotion:', error)
      toast.error('Failed to delete promotion')
    }
  }

  const handleToggleStatus = async (promotion: Promotion) => {
    try {
      await togglePromotionStatus(promotion.id, !promotion.isActive)
      toast.success(`Promotion ${promotion.isActive ? 'deactivated' : 'activated'}`)
      loadPromotions()
    } catch (error) {
      console.error('Error toggling promotion status:', error)
      toast.error('Failed to update promotion status')
    }
  }

  const handleEditClick = (promotion: Promotion) => {
    setSelectedPromotion(promotion)
    setFormData({
      type: promotion.type,
      title: promotion.title,
      description: promotion.description,
      ctaText: promotion.ctaText,
      ctaLink: promotion.ctaLink,
      linkType: promotion.ctaLink?.startsWith('http') ? 'external' : 'internal',
      displayPage: promotion.displayPage || '/dashboard/trading-journal',
      redirectPath: promotion.redirectPath || promotion.ctaLink || '/dashboard/trading-journal',
      redirectType: promotion.redirectType || (promotion.ctaLink?.startsWith('http') ? 'external' : 'internal'),
      targetAudience: promotion.targetAudience,
      icon: promotion.icon || PROMOTION_TYPE_ICONS[promotion.type],
      color: promotion.color || getColorClass(promotion.type)
    })
    setShowEditDialog(true)
  }

  const handleDeleteClick = (promotion: Promotion) => {
    setSelectedPromotion(promotion)
    setShowDeleteDialog(true)
  }

  const resetForm = () => {
    setFormData({
      type: 'discount',
      title: '',
      description: '',
      ctaText: '',
      ctaLink: '',
      linkType: 'internal',
      displayPage: '/dashboard/trading-journal',
      redirectPath: '/dashboard/trading-journal',
      redirectType: 'internal',
      targetAudience: 'both',
      icon: 'Gift',
      color: 'from-yellow-400 to-orange-500'
    })
  }

  const handleCTAClick = (promotion: Promotion) => {
    window.open(promotion.ctaLink, '_blank', 'noopener,noreferrer')
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Promotional Offers Management */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Gift className="w-6 h-6 text-red-500" />
              Promotional Offers Management
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Manage promotional offers for your trading platform
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Basic Promotions Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Promotions
        </h2>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Promotion
        </Button>
      </div>

      {/* Promotions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {promotions.map((promotion) => {
          const IconComponent = getIcon(promotion.icon || PROMOTION_TYPE_ICONS[promotion.type])
          const colorClass = getColorClass(promotion.type)

          return (
            <Card key={promotion.id} className="relative group overflow-hidden hover:shadow-xl transition-all duration-300">
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
              
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClass} shadow-lg`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{promotion.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {PROMOTION_TYPE_LABELS[promotion.type]}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={promotion.isActive ? "default" : "secondary"}
                      className={promotion.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : ""}
                    >
                      {promotion.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {promotion.targetAudience === 'both' ? 'All Users' : 
                       promotion.targetAudience === 'vip' ? 'VIP Only' : 'Guest Only'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {promotion.description}
                </p>

                {/* CTA Button Preview */}
                <Button
                  onClick={() => handleCTAClick(promotion)}
                  className={`w-full bg-gradient-to-r ${colorClass} hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg mb-4`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {promotion.ctaText}
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </Button>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(promotion)}
                    className="flex-1 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    tabIndex={0}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(promotion)}
                    className={`${promotion.isActive ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"} focus:ring-2 focus:ring-offset-2 ${promotion.isActive ? "focus:ring-red-500" : "focus:ring-green-500"}`}
                    tabIndex={0}
                  >
                    {promotion.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(promotion)}
                    className="text-red-600 hover:text-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    tabIndex={0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Promotion Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Promotion</DialogTitle>
            <DialogDescription>
              Create a promotional offer that will appear to users viewing your public profiles
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Promotion Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value as PromotionType})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROMOTION_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Select value={formData.targetAudience} onValueChange={(value) => setFormData({...formData, targetAudience: value as 'vip' | 'guest' | 'both'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">All Users</SelectItem>
                    <SelectItem value="vip">VIP Only</SelectItem>
                    <SelectItem value="guest">Guest Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., 50% Off VIP Membership"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="e.g., Join now and get 50% off your first month"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="ctaText">Button Text</Label>
              <Input
                id="ctaText"
                value={formData.ctaText}
                onChange={(e) => setFormData({...formData, ctaText: e.target.value})}
                placeholder="e.g., Claim Discount"
              />
            </div>

            <div>
              <Label htmlFor="displayPage">Display Page</Label>
              <Select value={formData.displayPage} onValueChange={(value) => setFormData({...formData, displayPage: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPromotionPages().map((page) => (
                    <SelectItem key={page.path} value={page.path}>
                      {page.name} - {page.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Choose which page this promotion will appear on
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="redirectType">Redirect Type</Label>
                <Select value={formData.redirectType} onValueChange={(value) => setFormData({...formData, redirectType: value as 'internal' | 'external'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal (within app)</SelectItem>
                    <SelectItem value="external">External (outside app)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="redirectPath">Redirect Path</Label>
                {formData.redirectType === 'internal' ? (
                  <Select value={formData.redirectPath} onValueChange={(value) => setFormData({...formData, redirectPath: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getNotificationPages().map((page) => (
                        <SelectItem key={page.path} value={page.path}>
                          {page.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="redirectPath"
                    value={formData.redirectPath}
                    onChange={(e) => setFormData({...formData, redirectPath: e.target.value})}
                    placeholder="https://example.com"
                  />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {formData.redirectType === 'internal' 
                ? 'Choose where users will be redirected when they click the promotion' 
                : 'Enter the full external URL where users will be redirected'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData({...formData, icon: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gift">Gift</SelectItem>
                    <SelectItem value="MessageCircle">Message Circle</SelectItem>
                    <SelectItem value="GraduationCap">Graduation Cap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="color">Color Theme</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({...formData, color: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from-yellow-400 to-orange-500">Yellow to Orange</SelectItem>
                    <SelectItem value="from-red-400 to-red-600">Red</SelectItem>
                    <SelectItem value="from-green-400 to-green-600">Green</SelectItem>
                    <SelectItem value="from-purple-400 to-purple-600">Purple</SelectItem>
                    <SelectItem value="from-pink-400 to-pink-600">Pink</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePromotion}>
              Create Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Promotion Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Promotion</DialogTitle>
            <DialogDescription>
              Update the promotional offer details
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">Promotion Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value as PromotionType})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROMOTION_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-targetAudience">Target Audience</Label>
                <Select value={formData.targetAudience} onValueChange={(value) => setFormData({...formData, targetAudience: value as 'vip' | 'guest' | 'both'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">All Users</SelectItem>
                    <SelectItem value="vip">VIP Only</SelectItem>
                    <SelectItem value="guest">Guest Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., 50% Off VIP Membership"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="e.g., Join now and get 50% off your first month"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-ctaText">Button Text</Label>
              <Input
                id="edit-ctaText"
                value={formData.ctaText}
                onChange={(e) => setFormData({...formData, ctaText: e.target.value})}
                placeholder="e.g., Claim Discount"
              />
            </div>

            <div>
              <Label htmlFor="edit-displayPage">Display Page</Label>
              <Select value={formData.displayPage} onValueChange={(value) => setFormData({...formData, displayPage: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPromotionPages().map((page) => (
                    <SelectItem key={page.path} value={page.path}>
                      {page.name} - {page.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Choose which page this promotion will appear on
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-redirectType">Redirect Type</Label>
                <Select value={formData.redirectType} onValueChange={(value) => setFormData({...formData, redirectType: value as 'internal' | 'external'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal (within app)</SelectItem>
                    <SelectItem value="external">External (outside app)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-redirectPath">Redirect Path</Label>
                {formData.redirectType === 'internal' ? (
                  <Select value={formData.redirectPath} onValueChange={(value) => setFormData({...formData, redirectPath: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getNotificationPages().map((page) => (
                        <SelectItem key={page.path} value={page.path}>
                          {page.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="edit-redirectPath"
                    value={formData.redirectPath}
                    onChange={(e) => setFormData({...formData, redirectPath: e.target.value})}
                    placeholder="https://example.com"
                  />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {formData.redirectType === 'internal' 
                ? 'Choose where users will be redirected when they click the promotion' 
                : 'Enter the full external URL where users will be redirected'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-icon">Icon</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData({...formData, icon: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gift">Gift</SelectItem>
                    <SelectItem value="MessageCircle">Message Circle</SelectItem>
                    <SelectItem value="GraduationCap">Graduation Cap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-color">Color Theme</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({...formData, color: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from-yellow-400 to-orange-500">Yellow to Orange</SelectItem>
                    <SelectItem value="from-red-400 to-red-600">Red</SelectItem>
                    <SelectItem value="from-green-400 to-green-600">Green</SelectItem>
                    <SelectItem value="from-purple-400 to-purple-600">Purple</SelectItem>
                    <SelectItem value="from-pink-400 to-pink-600">Pink</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePromotion}>
              Update Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Promotion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPromotion?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePromotion}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
