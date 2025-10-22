'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Settings, 
  User, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { TradingProfile, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, AccountType } from '@/types/profile'
import { useProfile } from '@/contexts/ProfileContext'
import { useAuth } from '@/contexts/AuthContext'

function ProfileManagementContent() {
  const { user: authUser } = useAuth()
  const { 
    profiles, 
    userRole, 
    canEdit, 
    canDelete, 
    createNewProfile, 
    updateCurrentProfile, 
    deleteCurrentProfile,
    isLoading 
  } = useProfile()
  
  const [isCreating, setIsCreating] = useState(false)
  const [editingProfile, setEditingProfile] = useState<TradingProfile | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [newProfile, setNewProfile] = useState({
    name: '',
    description: '',
    accountType: 'PERSONAL' as AccountType,
    startingBalance: 10000,
    isPublic: false
  })

  const [editProfile, setEditProfile] = useState({
    name: '',
    description: '',
    accountType: 'PERSONAL' as AccountType,
    startingBalance: 10000,
    isPublic: false
  })

  // Separate profiles by ownership
  const ownProfiles = profiles.filter(p => p.userId === userRole?.userId)
  const publicProfiles = profiles.filter(p => p.isPublic && p.userId !== userRole?.userId)

  const handleCreateProfile = async () => {
    if (!newProfile.name.trim()) {
      alert('Please enter a profile name')
      return
    }

    try {
      setIsSubmitting(true)
      await createNewProfile({
        name: newProfile.name.trim(),
        description: newProfile.description.trim(),
        accountType: newProfile.accountType,
        startingBalance: newProfile.startingBalance,
        userId: userRole?.userId || '',
        isPublic: authUser?.isAdmin ? newProfile.isPublic : false
      })
      
      // Reset form
      setNewProfile({
        name: '',
        description: '',
        accountType: 'PERSONAL',
        startingBalance: 10000,
        isPublic: false
      })
      setIsCreating(false)
    } catch (error) {
      console.error('Error creating profile:', error)
      alert('Failed to create profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditProfile = (profile: TradingProfile) => {
    setEditingProfile(profile)
    setEditProfile({
      name: profile.name,
      description: profile.description || '',
      accountType: profile.accountType,
      startingBalance: profile.startingBalance || 10000,
      isPublic: profile.isPublic
    })
  }

  const handleUpdateProfile = async () => {
    if (!editingProfile || !editProfile.name.trim()) {
      alert('Please enter a profile name')
      return
    }

    try {
      setIsSubmitting(true)
      await updateCurrentProfile({
        name: editProfile.name.trim(),
        description: editProfile.description.trim(),
        accountType: editProfile.accountType,
        startingBalance: editProfile.startingBalance,
        isPublic: authUser?.isAdmin ? editProfile.isPublic : false
      })
      
      setEditingProfile(null)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProfile = async (profileId: string) => {
    try {
      setIsSubmitting(true)
      await deleteCurrentProfile()
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting profile:', error)
      alert('Failed to delete profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading profiles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Profile Management */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-red-500" />
                Profile Management
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                Manage your trading profiles and account settings
              </CardDescription>
            </div>
            
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Profile
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Create Profile Form */}
      {isCreating && (
        <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-200/20 dark:border-red-800/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
              <Plus className="w-5 h-5 mr-2 text-red-500" />
              Create New Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Profile Name *
                </Label>
                <Input
                  id="name"
                  value={newProfile.name}
                  onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                  placeholder="e.g., Personal Account, Funded Account"
                  className="border-red-200 dark:border-red-800/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountType" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Account Type *
                </Label>
                <Select
                  value={newProfile.accountType}
                  onValueChange={(value) => setNewProfile({ ...newProfile, accountType: value as AccountType })}
                >
                  <SelectTrigger className="border-red-200 dark:border-red-800/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <span>{ACCOUNT_TYPE_ICONS[key as AccountType]}</span>
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startingBalance" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Starting Balance ($)
              </Label>
              <Input
                id="startingBalance"
                type="number"
                value={newProfile.startingBalance}
                onChange={(e) => setNewProfile({ ...newProfile, startingBalance: parseFloat(e.target.value) || 0 })}
                placeholder="Enter starting balance"
                className="border-red-200 dark:border-red-800/50"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The initial balance for this trading account (used for analytics calculations)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={newProfile.description}
                onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                placeholder="Optional description for this profile..."
                className="border-red-200 dark:border-red-800/50"
                rows={3}
              />
            </div>
            
            {authUser?.isAdmin && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newProfile.isPublic}
                  onChange={(e) => setNewProfile({ ...newProfile, isPublic: e.target.checked })}
                  className="rounded border-red-200 dark:border-red-800/50"
                />
                <Label htmlFor="isPublic" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Make this profile public (visible to VIP/Guest users)
                </Label>
              </div>
            )}
            
            <div className="flex items-center space-x-2 pt-4">
              <Button
                onClick={handleCreateProfile}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Create Profile
              </Button>
              <Button
                onClick={() => setIsCreating(false)}
                variant="outline"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Profiles */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
          <User className="w-6 h-6 mr-2 text-red-500" />
          My Profiles
        </h2>
        
        {ownProfiles.length === 0 ? (
          <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-200/20 dark:border-red-800/20 shadow-xl">
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Profiles Created</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Create your first trading profile to start tracking your trades.
              </p>
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownProfiles.map((profile) => (
              <Card key={profile.id} className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-200/20 dark:border-red-800/20 shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{ACCOUNT_TYPE_ICONS[profile.accountType]}</span>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                          {profile.name}
                        </CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {ACCOUNT_TYPE_LABELS[profile.accountType]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {profile.isPublic ? (
                        <Badge variant="outline" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {profile.description}
                    </p>
                  )}
                  
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Starting Balance</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        ${(profile.startingBalance || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleEditProfile(profile)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(profile.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Public Profiles (for VIP/Guest) */}
      {publicProfiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <Eye className="w-6 h-6 mr-2 text-red-500" />
            Admin Profiles (Read-Only)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicProfiles.map((profile) => (
              <Card key={profile.id} className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{ACCOUNT_TYPE_ICONS[profile.accountType]}</span>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                          {profile.name}
                        </CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {ACCOUNT_TYPE_LABELS[profile.accountType]}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Read-Only
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {profile.description}
                    </p>
                  )}
                  
                  <div className="p-3 bg-slate-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Starting Balance</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        ${(profile.startingBalance || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white dark:bg-black/90 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <Edit className="w-5 h-5 mr-2 text-red-500" />
                Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Profile Name *
                </Label>
                <Input
                  id="editName"
                  value={editProfile.name}
                  onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                  className="border-red-200 dark:border-red-800/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editAccountType" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Account Type *
                </Label>
                <Select
                  value={editProfile.accountType}
                  onValueChange={(value) => setEditProfile({ ...editProfile, accountType: value as AccountType })}
                >
                  <SelectTrigger className="border-red-200 dark:border-red-800/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <span>{ACCOUNT_TYPE_ICONS[key as AccountType]}</span>
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editStartingBalance" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Starting Balance ($)
                </Label>
                <Input
                  id="editStartingBalance"
                  type="number"
                  value={editProfile.startingBalance}
                  onChange={(e) => setEditProfile({ ...editProfile, startingBalance: parseFloat(e.target.value) || 0 })}
                  className="border-red-200 dark:border-red-800/50"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The initial balance for this trading account (used for analytics calculations)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editDescription" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description
                </Label>
                <Textarea
                  id="editDescription"
                  value={editProfile.description}
                  onChange={(e) => setEditProfile({ ...editProfile, description: e.target.value })}
                  className="border-red-200 dark:border-red-800/50"
                  rows={3}
                />
              </div>
              
              {authUser?.isAdmin && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editIsPublic"
                    checked={editProfile.isPublic}
                    onChange={(e) => setEditProfile({ ...editProfile, isPublic: e.target.checked })}
                    className="rounded border-red-200 dark:border-red-800/50"
                  />
                  <Label htmlFor="editIsPublic" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Make this profile public
                  </Label>
                </div>
              )}
              
              <div className="flex items-center space-x-2 pt-4">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button
                  onClick={() => setEditingProfile(null)}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white dark:bg-black/90 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                Delete Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete this profile? This action cannot be undone and will remove all associated trades.
              </p>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleDeleteProfile(showDeleteConfirm)}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete Profile
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(null)}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function ProfileManagementPage() {
  return <ProfileManagementContent />
}
