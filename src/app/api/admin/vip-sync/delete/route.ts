import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firestore'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'

// Force dynamic rendering for serverless functions
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for bulk deletions

const VIP_PROFILE_ID = 'vip-showcase'

export async function DELETE(request: NextRequest) {
  try {
    console.log('Deleting all VIP trades...')

    // Get all VIP trades
    const q = query(
      collection(db, 'trades'),
      where('profileId', '==', VIP_PROFILE_ID)
    )
    
    const querySnapshot = await getDocs(q)
    console.log(`Found ${querySnapshot.docs.length} VIP trades to delete`)

    // Delete all VIP trades
    let deletedCount = 0
    const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
      try {
        await deleteDoc(doc(db, 'trades', docSnapshot.id))
        deletedCount++
        console.log(`Deleted trade: ${docSnapshot.id}`)
      } catch (error) {
        console.error(`Failed to delete trade ${docSnapshot.id}:`, error)
      }
    })

    await Promise.all(deletePromises)

    // Also delete VIP import logs
    const importLogsQuery = query(collection(db, 'vip_imports'))
    const importLogsSnapshot = await getDocs(importLogsQuery)
    
    const deleteImportLogsPromises = importLogsSnapshot.docs.map(async (docSnapshot) => {
      try {
        await deleteDoc(doc(db, 'vip_imports', docSnapshot.id))
        console.log(`Deleted import log: ${docSnapshot.id}`)
      } catch (error) {
        console.error(`Failed to delete import log ${docSnapshot.id}:`, error)
      }
    })

    await Promise.all(deleteImportLogsPromises)

    console.log(`Successfully deleted ${deletedCount} VIP trades and ${importLogsSnapshot.docs.length} import logs`)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} VIP trades and ${importLogsSnapshot.docs.length} import logs`,
      deletedTrades: deletedCount,
      deletedLogs: importLogsSnapshot.docs.length
    })
  } catch (error) {
    console.error('Error deleting VIP trades:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete VIP trades'
    }, { status: 500 })
  }
}


