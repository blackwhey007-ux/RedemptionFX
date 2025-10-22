'use client'

import React, { useState } from 'react'
import { ChevronDown, Plus, Eye, EyeOff, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { useProfile } from '@/contexts/ProfileContext'
import { useAuth } from '@/contexts/AuthContext'
import { TradingProfile, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '@/types/profile'

interface ProfileSelectorProps {
  onCreateProfile?: () => void
  onManageProfiles?: () => void
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ 
  onCreateProfile, 
  onManageProfiles 
}) => {
  const { user: authUser } = useAuth()
  const { 
    currentProfile, 
    profiles, 
    userRole, 
    isLoading, 
    setCurrentProfile,
    canEdit 
  } = useProfile()
  
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse">
        <div className="w-4 h-4 bg-slate-300 dark:bg-slate-600 rounded"></div>
        <div className="w-32 h-4 bg-slate-300 dark:bg-slate-600 rounded"></div>
        <div className="w-4 h-4 bg-slate-300 dark:bg-slate-600 rounded"></div>
      </div>
    )
  }

  if (!currentProfile) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
        <User className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-700 dark:text-red-300">No profile selected</span>
        {onCreateProfile && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onCreateProfile}
            className="ml-auto"
          >
            <Plus className="w-3 h-3 mr-1" />
            Create
          </Button>
        )}
      </div>
    )
  }

  // Separate profiles by ownership with additional security checks
  const ownProfiles = profiles.filter(p => p.userId === userRole?.userId)
  const publicProfiles = profiles.filter(p => {
    // Only show public profiles that don't belong to the current user
    // and are explicitly marked as public (additional security check)
    return p.isPublic === true && p.userId !== userRole?.userId
  })

  const handleProfileSelect = (profile: TradingProfile) => {
    setCurrentProfile(profile)
    setIsOpen(false)
  }

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center space-x-2 min-w-0 max-w-xs"
          >
            <span className="text-lg">
              {ACCOUNT_TYPE_ICONS[currentProfile.accountType]}
            </span>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm font-medium truncate">
                {currentProfile.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {ACCOUNT_TYPE_LABELS[currentProfile.accountType]}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80" align="start">
          <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Select Trading Profile
          </DropdownMenuLabel>
          
          {/* Own Profiles Section */}
          {ownProfiles.length > 0 && (
            <>
              <DropdownMenuLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                My Profiles
              </DropdownMenuLabel>
              {ownProfiles.map((profile) => (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={() => handleProfileSelect(profile)}
                  className="flex items-center space-x-3 p-3"
                >
                  <span className="text-lg">
                    {ACCOUNT_TYPE_ICONS[profile.accountType]}
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium truncate">
                        {profile.name}
                      </span>
                      {profile.id === currentProfile.id && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {ACCOUNT_TYPE_LABELS[profile.accountType]}
                    </span>
                    {profile.description && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {profile.description}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          {/* Public Profiles Section (for VIP/Guest) */}
          {publicProfiles.length > 0 && (
            <>
              {ownProfiles.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Admin Profiles (Read-Only)</span>
              </DropdownMenuLabel>
              {publicProfiles.map((profile) => (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={() => handleProfileSelect(profile)}
                  className="flex items-center space-x-3 p-3"
                >
                  <span className="text-lg">
                    {ACCOUNT_TYPE_ICONS[profile.accountType]}
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium truncate">
                        {profile.name}
                      </span>
                      {profile.id === currentProfile.id && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Read-Only
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {ACCOUNT_TYPE_LABELS[profile.accountType]}
                    </span>
                    {profile.description && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {profile.description}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          {/* Actions */}
          <DropdownMenuSeparator />
          <div className="p-2 space-y-1">
            {onCreateProfile && canEdit() && authUser && (authUser.isAdmin || authUser.role === 'vip') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onCreateProfile()
                  setIsOpen(false)
                }}
                className="w-full justify-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Profile
              </Button>
            )}
            {onManageProfiles && authUser?.isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onManageProfiles()
                  setIsOpen(false)
                }}
                className="w-full justify-start"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Profiles
              </Button>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Current Profile Info */}
      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        {!canEdit(currentProfile) && (
          <Badge variant="outline" className="text-xs">
            <EyeOff className="w-3 h-3 mr-1" />
            Read-Only
          </Badge>
        )}
      </div>
    </div>
  )
}
