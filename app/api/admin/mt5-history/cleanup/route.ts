import { NextRequest, NextResponse } from 'next/server'
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'

const HISTORY_COLLECTION = 'mt5_trade_history'
const CONFIRMATION_VALUE = 'purge-history'

export async function DELETE(request: NextRequest) {
  try {
    let confirmToken = request.nextUrl.searchParams.get('confirm')

    if (!confirmToken && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json()
        if (body && typeof body === 'object' && 'confirm' in body) {
          confirmToken = typeof body.confirm === 'string' ? body.confirm : null
        }
      } catch (error) {
        console.warn('[MT5_HISTORY_CLEANUP] Failed to parse confirmation body:', error)
      }
    }

    if (!confirmToken || confirmToken !== CONFIRMATION_VALUE) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing or invalid confirmation. Append '?confirm=${CONFIRMATION_VALUE}' or send { "confirm": "${CONFIRMATION_VALUE}" } in the body.`
        },
        { status: 400 }
      )
    }

    const snapshot = await getDocs(collection(db, HISTORY_COLLECTION))
    const total = snapshot.size

    if (total === 0) {
      return NextResponse.json({
        success: true,
        message: 'No MT5 trade history documents found. Nothing to delete.',
        deleted: 0,
        failed: 0
      })
    }

    let deleted = 0
    const failures: { id: string; error: string }[] = []

    await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        try {
          await deleteDoc(doc(db, HISTORY_COLLECTION, docSnapshot.id))
          deleted += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          failures.push({ id: docSnapshot.id, error: message })
          console.error(`[MT5_HISTORY_CLEANUP] Failed to delete ${docSnapshot.id}: ${message}`)
        }
      })
    )

    return NextResponse.json({
      success: failures.length === 0,
      message: `Attempted to delete ${total} trade history documents.`,
      deleted,
      failed: failures.length,
      failures
    })
  } catch (error) {
    console.error('[MT5_HISTORY_CLEANUP] Unexpected error while purging trade history:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: 500 }
    )
  }
}

