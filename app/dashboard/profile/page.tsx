'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { updateFirebaseProfile, updateFirebasePassword, updateFirebaseEmail, updateUserData, updateProfilePhoto } from '@/lib/firebaseAuth'
import { db } from '@/lib/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Mail, 
  Lock, 
  Camera, 
  Save, 
  Eye, 
  EyeOff, 
  Shield,
  Star,
  Crown,
  AlertCircle,
  CheckCircle,
  MessageCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ProfileSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // Form states
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [telegramUsername, setTelegramUsername] = useState('')
  const [telegramUserId, setTelegramUserId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // UI states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Initialize form with user data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        setDisplayName(user.displayName || '')
        setEmail(user.email || '')
        
        // Load profileSettings from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid)
          const userDocSnap = await getDoc(userDocRef)
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            const profileSettings = userData.profileSettings || {}
            setTelegramUsername(profileSettings.telegramUsername || '')
            setTelegramUserId(profileSettings.telegramUserId?.toString() || '')
          }
        } catch (error) {
          console.error('Error loading user profile settings:', error)
        }
      }
    }
    
    void loadUserProfile()
  }, [user])

  // Handle photo selection
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      
      setSelectedFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle photo upload
  const handlePhotoUpload = async () => {
    if (!selectedFile || !user) {
      console.error('Missing selectedFile or user:', { selectedFile, user })
      return
    }
    
    console.log('Starting photo upload for user:', user.uid)
    setPhotoLoading(true)
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('Photo upload timeout after 30 seconds')
      setPhotoLoading(false)
      toast.error('Photo upload timed out. Please try again.')
    }, 30000) // 30 second timeout
    
    try {
      console.log('Converting image to base64 for temporary storage...')
      
      // Temporary workaround: Convert to base64 and store in Firestore
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const base64String = e.target?.result as string
          
          // Update user profile with base64 photo
          const result = await updateFirebaseProfile({
            displayName: user.displayName,
            photoURL: base64String
          })
          
          if (!result.success) {
            throw new Error(result.error)
          }
          
          // Update Firestore user document
          await updateUserData(user.uid, {
            photoURL: base64String,
            'profileSettings.photoURL': base64String
          })
          
          // User state will be updated automatically by AuthContext
          
          console.log('Clearing form state...')
          setSelectedFile(null)
          setPhotoPreview(null)
          
          console.log('Showing success message...')
          toast.success('Profile photo updated successfully!')
          
        } catch (error) {
          console.error('Error updating photo:', error)
          toast.error(`Failed to update profile photo: ${error.message}`)
        } finally {
          clearTimeout(timeoutId)
          console.log('Setting photoLoading to false...')
          setPhotoLoading(false)
        }
      }
      
      reader.readAsDataURL(selectedFile)
      
    } catch (error) {
      console.error('Error updating photo:', error)
      toast.error(`Failed to update profile photo: ${error.message}`)
      clearTimeout(timeoutId)
      setPhotoLoading(false)
    }
  }

  // Handle profile update
  const handleProfileUpdate = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Update Firebase Auth profile
      const authResult = await updateFirebaseProfile({
        displayName: displayName.trim(),
        photoURL: user.photoURL
      })
      
      if (!authResult.success) {
        throw new Error(authResult.error)
      }
      
      // Update Firestore user document
      // First, get existing profileSettings to merge
      const userDocRef = doc(db, 'users', user.uid)
      const userDocSnap = await getDoc(userDocRef)
      const existingData = userDocSnap.exists() ? userDocSnap.data() : {}
      const existingProfileSettings = existingData.profileSettings || {}
      
      const updates: any = {
        displayName: displayName.trim(),
        profileSettings: {
          ...existingProfileSettings,
          displayName: displayName.trim()
        }
      }
      
      // Update Telegram fields if provided
      if (telegramUsername.trim()) {
        updates.profileSettings.telegramUsername = telegramUsername.trim()
      } else if (telegramUsername.trim() === '' && existingProfileSettings.telegramUsername) {
        // Allow clearing the field
        updates.profileSettings.telegramUsername = null
      }
      
      if (telegramUserId.trim()) {
        const telegramIdNum = parseInt(telegramUserId.trim(), 10)
        if (!isNaN(telegramIdNum)) {
          updates.profileSettings.telegramUserId = telegramIdNum
        } else {
          toast.error('Telegram User ID must be a valid number')
          setLoading(false)
          return
        }
      } else if (telegramUserId.trim() === '' && existingProfileSettings.telegramUserId) {
        // Allow clearing the field
        updates.profileSettings.telegramUserId = null
      }
      
      const firestoreResult = await updateUserData(user.uid, updates)
      
      if (!firestoreResult.success) {
        throw new Error(firestoreResult.error)
      }
      
      // User state will be updated automatically by AuthContext
      
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  // Handle email update
  const handleEmailUpdate = async () => {
    if (!user || !currentPassword) {
      toast.error('Please enter your current password')
      return
    }
    
    setLoading(true)
    try {
      // Update Firebase Auth email
      const authResult = await updateFirebaseEmail(email.trim(), currentPassword)
      
      if (!authResult.success) {
        if (authResult.error.includes('wrong-password')) {
          toast.error('Current password is incorrect')
        } else if (authResult.error.includes('email-already-in-use')) {
          toast.error('Email is already in use')
        } else {
          toast.error('Failed to update email')
        }
        return
      }
      
      // Update Firestore user document
      const firestoreResult = await updateUserData(user.uid, {
        email: email.trim()
      })
      
      if (!firestoreResult.success) {
        throw new Error(firestoreResult.error)
      }
      
      // User state will be updated automatically by AuthContext
      
      setCurrentPassword('')
      toast.success('Email updated successfully!')
    } catch (error: any) {
      console.error('Error updating email:', error)
      toast.error('Failed to update email')
    } finally {
      setLoading(false)
    }
  }

  // Handle password update
  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setLoading(true)
    try {
      // Update Firebase Auth password
      const authResult = await updateFirebasePassword(currentPassword, newPassword)
      
      if (!authResult.success) {
        if (authResult.error.includes('wrong-password')) {
          toast.error('Current password is incorrect')
        } else if (authResult.error.includes('weak-password')) {
          toast.error('Password is too weak')
        } else {
          toast.error('Failed to update password')
        }
        return
      }
      
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully!')
    } catch (error: any) {
      console.error('Error updating password:', error)
      toast.error('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  // Get role badge
  const getRoleBadge = () => {
    if (!user) return null
    
    switch (user.role) {
      case 'admin':
        return {
          icon: <Crown className="h-3 w-3" />,
          text: 'Admin',
          className: 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
        }
      case 'vip':
        return {
          icon: <Star className="h-3 w-3" />,
          text: 'VIP Member',
          className: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
        }
      case 'guest':
        return {
          icon: <Eye className="h-3 w-3" />,
          text: 'Guest',
          className: 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
        }
      default:
        return {
          icon: <User className="h-3 w-3" />,
          text: 'Member',
          className: 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
        }
    }
  }

  const roleBadge = getRoleBadge()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-900 dark:to-red-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-black dark:to-red-900/20 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Settings Management */}
        <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-6 h-6 text-red-500" />
                  Profile Settings Management
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                  Manage your account information and preferences
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="border-red-200 dark:border-red-800/50 text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                ← Back
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="glass-card border-red-200/20 dark:border-red-800/20 shadow-xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-red-200 dark:border-red-800/50">
                      <AvatarImage 
                        src={photoPreview || user.photoURL || ''} 
                        alt={user.displayName || 'User'} 
                      />
                      <AvatarFallback className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-2xl font-bold">
                        {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <label 
                      htmlFor="photo-upload"
                      className="absolute bottom-0 right-0 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 cursor-pointer transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>
                </div>
                
                <CardTitle className="text-xl">{user.displayName || 'User'}</CardTitle>
                <CardDescription className="text-sm">{user.email}</CardDescription>
                
                {roleBadge && (
                  <Badge className={`${roleBadge.className} flex items-center space-x-1 px-3 py-1 text-sm font-medium mx-auto mt-2`}>
                    {roleBadge.icon}
                    <span>{roleBadge.text}</span>
                  </Badge>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    User Profile
                  </p>
                </div>
                
                {selectedFile && (
                  <div className="space-y-2">
                    <Button 
                      onClick={handlePhotoUpload}
                      disabled={photoLoading}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
                    >
                      {photoLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Photo
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedFile(null)
                        setPhotoPreview(null)
                      }}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settings Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="glass-card border-red-200/20 dark:border-red-800/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-red-600" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription>Update your display name and personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="border-red-200 dark:border-red-800/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="border-red-200 dark:border-red-800/50"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Profile
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Email Update */}
            <Card className="glass-card border-red-200/20 dark:border-red-800/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-red-600" />
                  <span>Email Settings</span>
                </CardTitle>
                <CardDescription>Change your email address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="border-red-200 dark:border-red-800/50 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  onClick={handleEmailUpdate}
                  disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Update Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Password Update */}
            <Card className="glass-card border-red-200/20 dark:border-red-800/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-red-600" />
                  <span>Security Settings</span>
                </CardTitle>
                <CardDescription>Change your password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="border-red-200 dark:border-red-800/50 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="border-red-200 dark:border-red-800/50 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right摇头 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handlePasswordUpdate}
                  disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Telegram Integration */}
            <Card className="glass-card border-red-200/20 dark:border-red-800/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-red-600" />
                  <span>Telegram Integration</span>
                </CardTitle>
                <CardDescription>Link your Telegram account to receive trade alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telegramUsername">Telegram Username</Label>
                    <Input
                      id="telegramUsername"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      placeholder="@username (optional)"
                      className="border-red-200 dark:border-red-800/50"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your Telegram username (e.g., @yourusername)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegramUserId">Telegram User ID</Label>
                    <Input
                      id="telegramUserId"
                      type="number"
                      value={telegramUserId}
                      onChange={(e) => setTelegramUserId(e.target.value)}
                      placeholder="123456789 (required for alerts)"
                      className="border-red-200 dark:border-red-800/50"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your Telegram numeric user ID (required for receiving trade alerts)
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-800 dark:text-blue-300">
                      <p className="font-medium mb-1">How to get your Telegram User ID:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Start a conversation with your Telegram bot</li>
                        <li>Send <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/start</code> command</li>
                        <li>Your User ID will be shown or you can use a bot like @userinfobot</li>
                        <li>Enter the numeric ID above to receive trade alerts</li>
                      </ol>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Telegram Settings
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card className="glass-card border-red-200/20 dark:border-red-800/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <span>Account Information</span>
                </CardTitle>
                <CardDescription>View your account details and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input
                      value={user.uid}
                      readOnly
                      className="bg-slate-50 dark:bg-black/90 border-red-200 dark:border-red-800/50 text-slate-600 dark:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-red-200/20 dark:border-red-800/20">
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>Account Information</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
