import { NextResponse } from 'next/server'
import { db } from '@/lib/firestore'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { getVipProfileId } from '@/lib/csvImportService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedProfileId = searchParams.get('profileId')
    
    // Get the current VIP profile ID (use requested or default)
    const profileId = requestedProfileId || await getVipProfileId()
    
    // Simplified query to avoid Firebase index requirement
    const q = query(
      collection(db, 'trades'),
      where('profileId', '==', profileId),
      limit(100)
    )
    
    const querySnapshot = await getDocs(q)
    
    // Filter by source on the client side to avoid index requirement
    const allTrades = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }))
    
    // Filter for VIP trades (any source) and sort by createdAt
    const trades = allTrades
      .filter(trade => {
        const tradeSource = (trade as any).source
        return (
          tradeSource === 'MT5_VIP' ||
          tradeSource === 'MANUAL' ||
          tradeSource === 'manual' ||
          tradeSource === 'csv' ||
          tradeSource === 'CSV'
        )
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0
        const bTime = b.createdAt?.getTime() || 0
        return bTime - aTime
      })
      .slice(0, 100)
    

    return NextResponse.json({
      success: true,
      trades
    })
  } catch (error) {
    console.error('Error getting VIP trades:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get VIP trades'
    }, { status: 500 })
  }
}
