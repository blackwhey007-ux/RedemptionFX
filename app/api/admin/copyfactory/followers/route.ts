import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError } from '@/lib/authServer'
import { db } from '@/lib/firebaseConfig'
import { collectionGroup, getDoc, getDocs, query, doc } from 'firebase/firestore'

/**
 * GET /api/admin/copyfactory/followers
 * Get all copy trading followers (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin(request)

    const copyTradingQuery = query(collectionGroup(db, 'copyTradingAccounts'))
    const snapshot = await getDocs(copyTradingQuery)

    const followers: any[] = []

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data()
      
      if (docSnapshot.ref.parent.id !== 'copyTradingAccounts') continue

      const userDocRef = docSnapshot.ref.parent.parent
      if (!userDocRef) continue

      const userId = userDocRef.id

      const userSnapshot = await getDoc(doc(db, 'users', userId))
      const userEmail = userSnapshot.exists() ? userSnapshot.data()?.email : null

      followers.push({
        userId,
        email: userEmail,
        accountId: data.accountId || docSnapshot.id,
        strategyId: data.strategyId,
        strategyName: data.strategyName || 'Master Strategy',
        riskMultiplier: data.riskMultiplier,
        status: data.status,
        broker: data.broker,
        server: data.server,
        login: data.login,
        platform: data.platform,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        lastError: data.lastError || null,
        label: data.label || null,
        reverseTrading: data.reverseTrading ?? false,
        symbolMapping: data.symbolMapping || null,
        maxRiskPercent: data.maxRiskPercent ?? null
      })
    }

    console.log(`[FollowersEndpoint] Found ${followers.length} followers`)

    return NextResponse.json({
      success: true,
      followers,
      count: followers.length
    })
  } catch (error) {
    console.error('[FollowersEndpoint] Error fetching followers:', error)

    const authError = handleAuthError(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch followers'

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: authError.status }
    )
  }
}

