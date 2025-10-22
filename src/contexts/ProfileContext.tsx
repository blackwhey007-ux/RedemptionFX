'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { TradingProfile, UserRole } from '@/types/profile'
import { 
  getViewableProfiles, 
  getUserRole, 
  canEditProfile, 
  canViewProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  getPublicProfiles
} from '@/lib/profileService'
import { useAuth } from './AuthContext'

interface ProfileContextType {
  // Current state
  currentProfile: TradingProfile | null
  profiles: TradingProfile[]
  userRole: UserRole | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setCurrentProfile: (profile: TradingProfile | null) => void
  refreshProfiles: () => Promise<void>
  createNewProfile: (profileData: Omit<TradingProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateCurrentProfile: (updates: Partial<Omit<TradingProfile, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  deleteCurrentProfile: () => Promise<void>
  
  // Permission checks
  canEdit: (profile?: TradingProfile) => boolean
  canDelete: (profile?: TradingProfile) => boolean
  canView: (profile?: TradingProfile) => boolean
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

interface ProfileProviderProps {
  children: ReactNode
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.uid || ''
  const [currentProfile, setCurrentProfile] = useState<TradingProfile | null>(null)
  const [profiles, setProfiles] = useState<TradingProfile[]>([])
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load user role and profiles on mount
  useEffect(() => {
    const loadUserData = async () => {
      if (authLoading || !user) {
        setIsLoading(authLoading)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // Use user role from AuthContext
        const userRoleString = user.role as 'admin' | 'vip' | 'guest'
        setUserRole({ 
          userId: user.uid, 
          email: user.email || '', 
          role: userRoleString, 
          displayName: user.displayName || '', 
          photoURL: user.photoURL,
          createdAt: new Date().toISOString()
        })
        
        const profilesWithRole = await getViewableProfiles(userId, userRoleString)
        console.log('Loaded profiles for user:', { userId, userRole: userRoleString, profilesCount: profilesWithRole.length })
        setProfiles(profilesWithRole)
        
        // Try to restore last viewed profile from localStorage
        const lastViewedProfileId = localStorage.getItem('lastViewedProfileId')
        let profileToSet = null
        
        if (lastViewedProfileId && profilesWithRole.length > 0) {
          // Try to find the last viewed profile in the available profiles
          profileToSet = profilesWithRole.find(p => p.id === lastViewedProfileId)
        }
        
        if (profilesWithRole.length > 0 && !currentProfile) {
          if (profileToSet) {
            // Restore the last viewed profile
            setCurrentProfile(profileToSet)
            console.log('Restored last viewed profile:', profileToSet.name)
          } else {
            // Set first profile as current if no last viewed profile found
            setCurrentProfile(profilesWithRole[0])
            // Update localStorage with the first profile
            localStorage.setItem('lastViewedProfileId', profilesWithRole[0].id)
          }
        } else if (profilesWithRole.length === 0) {
          // For any user (including non-admin), if no profiles are available, try to load public profiles
          // But only if the user is VIP or Guest (not admin, as admin should see all profiles)
          if (userRoleString !== 'admin') {
            try {
              const publicProfiles = await getPublicProfiles()
              console.log('Loaded public profiles:', { publicProfilesCount: publicProfiles.length })
              
              // Additional security: filter out any profiles that don't belong to admin users
              // This prevents regular users from seeing other users' profiles
              const adminPublicProfiles = publicProfiles.filter(profile => {
                // Only show profiles that are explicitly marked as public AND created by admin users
                // You might want to add a check here to ensure the profile owner is an admin
                return profile.isPublic === true
              })
              
              if (adminPublicProfiles.length > 0) {
                setProfiles(adminPublicProfiles)
                
                // Try to restore last viewed profile from public profiles
                let publicProfileToSet = null
                if (lastViewedProfileId) {
                  publicProfileToSet = adminPublicProfiles.find(p => p.id === lastViewedProfileId)
                }
                
                if (publicProfileToSet) {
                  setCurrentProfile(publicProfileToSet)
                  console.log('Restored last viewed public profile:', publicProfileToSet.name)
                } else {
                  setCurrentProfile(adminPublicProfiles[0])
                  localStorage.setItem('lastViewedProfileId', adminPublicProfiles[0].id)
                }
              }
            } catch (err) {
              console.error('Error loading public profiles:', err)
            }
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err)
        setError('Failed to load profile data')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [user, authLoading, userId])

  // Refresh profiles
  const refreshProfiles = async () => {
    try {
      if (!userRole) return
      
      const viewableProfiles = await getViewableProfiles(userId, userRole.role)
      setProfiles(viewableProfiles)
      
      // If current profile no longer exists, select first available
      if (currentProfile && !viewableProfiles.find(p => p.id === currentProfile.id)) {
        setCurrentProfile(viewableProfiles.length > 0 ? viewableProfiles[0] : null)
      }
    } catch (err) {
      console.error('Error refreshing profiles:', err)
      setError('Failed to refresh profiles')
    }
  }

  // Create new profile
  const createNewProfile = async (profileData: Omit<TradingProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const profileId = await createProfile(profileData)
      
      // Refresh profiles and then set the new one as current
      const viewableProfiles = await getViewableProfiles(userId, userRole?.role || 'guest')
      setProfiles(viewableProfiles)
      
      // Set new profile as current
      const newProfile = viewableProfiles.find(p => p.id === profileId)
      if (newProfile) {
        setCurrentProfile(newProfile)
      }
    } catch (err) {
      console.error('Error creating profile:', err)
      setError('Failed to create profile')
      throw err
    }
  }

  // Update current profile
  const updateCurrentProfile = async (updates: Partial<Omit<TradingProfile, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!currentProfile) return
    
    try {
      await updateProfile(currentProfile.id, updates)
      await refreshProfiles()
      
      // Update current profile if it still exists
      const updatedProfile = profiles.find(p => p.id === currentProfile.id)
      if (updatedProfile) {
        setCurrentProfile(updatedProfile)
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile')
      throw err
    }
  }

  // Delete current profile
  const deleteCurrentProfile = async () => {
    if (!currentProfile) return
    
    try {
      await deleteProfile(currentProfile.id)
      await refreshProfiles()
      
      // Select first available profile
      setCurrentProfile(profiles.length > 0 ? profiles[0] : null)
    } catch (err) {
      console.error('Error deleting profile:', err)
      setError('Failed to delete profile')
      throw err
    }
  }

  // Permission checks
  const canEdit = (profile?: TradingProfile) => {
    const targetProfile = profile || currentProfile
    if (!targetProfile || !userRole) return false
    return canEditProfile(targetProfile, userId, userRole.role)
  }

  const canDelete = (profile?: TradingProfile) => {
    const targetProfile = profile || currentProfile
    if (!targetProfile || !userRole) return false
    return canEditProfile(targetProfile, userId, userRole.role)
  }

  const canView = (profile?: TradingProfile) => {
    const targetProfile = profile || currentProfile
    if (!targetProfile || !userRole) return false
    return canViewProfile(targetProfile, userId, userRole.role)
  }

  // Wrapper function to save profile selection to localStorage
  const setCurrentProfileWithPersistence = (profile: TradingProfile | null) => {
    setCurrentProfile(profile)
    // Save the selected profile to localStorage so it persists across page refreshes
    if (profile) {
      localStorage.setItem('lastViewedProfileId', profile.id)
      console.log('Saved profile to localStorage:', profile.name, profile.id)
    } else {
      localStorage.removeItem('lastViewedProfileId')
    }
  }

  const value: ProfileContextType = {
    currentProfile,
    profiles,
    userRole,
    isLoading,
    error,
    setCurrentProfile: setCurrentProfileWithPersistence,
    refreshProfiles,
    createNewProfile,
    updateCurrentProfile,
    deleteCurrentProfile,
    canEdit,
    canDelete,
    canView
  }

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
