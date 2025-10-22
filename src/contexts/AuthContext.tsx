'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebaseConfig'

export type UserRole = 'admin' | 'vip' | 'guest'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  role: UserRole
  isAdmin: boolean
  status?: string
  paymentInfo?: {
    plan?: string
    amount?: number
    currency?: string
    paidAt?: string
    expiresAt?: string
  }
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      try {
        setLoading(true)
        setError(null)

        if (firebaseUser) {
          // Get user role from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          let userRole: UserRole = 'guest'
          let isAdmin = false

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            userRole = userData.role || 'guest'
            isAdmin = userData.isAdmin || false
          } else {
            // Create user document if it doesn't exist
            // New signups are assigned guest role by default
            const newUserData = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'guest', // Changed from 'admin' to 'guest'
              isAdmin: false, // Changed from true to false
              status: 'active', // Changed from 'pending' to 'active'
              createdAt: new Date(),
              updatedAt: new Date()
            }

            await setDoc(userDocRef, newUserData)
            userRole = 'guest'
            isAdmin = false
          }

          // Double-check admin status by email
          if (firebaseUser.email === 'blackwhey007@gmail.com') {
            userRole = 'admin'
            isAdmin = true
          }

          const userData = userDocSnap.exists() ? userDocSnap.data() : {}
          
          // Helper function to safely convert payment dates
          const safePaymentInfo = userData.paymentInfo ? {
            ...userData.paymentInfo,
            paidAt: userData.paymentInfo.paidAt?.toDate?.() || userData.paymentInfo.paidAt || undefined,
            expiresAt: userData.paymentInfo.expiresAt?.toDate?.() || userData.paymentInfo.expiresAt || undefined
          } : undefined
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: userRole,
            isAdmin,
            status: userData.status || 'active',
            paymentInfo: safePaymentInfo
          })
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Auth state change error:', err)
        setError('Authentication error occurred')
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
