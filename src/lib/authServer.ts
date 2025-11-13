/**
 * Server-side Firebase Auth helpers
 * Verifies Firebase ID tokens and checks user roles
 */

import { NextRequest } from 'next/server'
import { db } from './firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

// Note: For production, use Firebase Admin SDK for token verification
// This is a simplified version that relies on client-side auth

export interface AuthUser {
  uid: string
  email: string | null
  role: 'admin' | 'vip' | 'guest'
  isAdmin: boolean
}

/**
 * Get authenticated user from request headers
 * In production, verify Firebase ID token using Admin SDK
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Get user ID from custom header (set by middleware or client)
    const userId = request.headers.get('x-user-id')
    const userEmail = request.headers.get('x-user-email')

    if (!userId) {
      return null
    }

    // Fetch user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId))

    if (!userDoc.exists()) {
      return null
    }

    const userData = userDoc.data()

    return {
      uid: userId,
      email: userEmail,
      role: userData.role || 'guest',
      isAdmin: userData.role === 'admin'
    }
  } catch (error) {
    console.error('[AuthServer] Error getting auth user:', error)
    return null
  }
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request)

  if (!user) {
    throw new AuthError('Authentication required', 401)
  }

  return user
}

/**
 * Require admin role - throws 403 if not admin
 */
export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request)

  if (!user.isAdmin) {
    throw new AuthError('Admin access required', 403)
  }

  return user
}

/**
 * Custom error class for auth errors
 */
export class AuthError extends Error {
  status: number

  constructor(message: string, status: number = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

/**
 * Handle auth errors and return appropriate response
 */
export function handleAuthError(error: unknown): { status: number; message: string } {
  if (error instanceof AuthError) {
    return {
      status: error.status,
      message: error.message
    }
  }

  return {
    status: 500,
    message: 'Internal server error'
  }
}





