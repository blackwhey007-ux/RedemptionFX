import { NextRequest, NextResponse } from 'next/server'
import { importVipTrades, getVipImportHistory } from '@/lib/csvImportService'

// Force dynamic rendering for serverless functions
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for CSV imports

export async function POST(request: NextRequest) {
  try {
    // For now, skip authentication check to test the import functionality
    // TODO: Implement proper server-side authentication
    console.log('CSV import request received')

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV file' }, { status: 400 })
    }

    // Read file content
    const csvContent = await file.text()
    
    if (!csvContent.trim()) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
    }

    console.log(`Admin CSV import: ${file.name} (${file.size} bytes)`)

    // Import trades
    console.log('Starting import process...')
    const result = await importVipTrades(csvContent, 'admin@redemptionfx.com')
    console.log('Import result:', {
      success: result.success,
      newTrades: result.newTrades,
      updatedTrades: result.updatedTrades,
      skippedTrades: result.skippedTrades,
      errors: result.errors.length
    })

    // Consider it successful if we imported at least some trades
    const isSuccess = result.newTrades > 0 || result.updatedTrades > 0
    console.log('Is success:', isSuccess)
    
    if (isSuccess) {
      return NextResponse.json({
        success: true,
        message: `VIP trades imported successfully! ${result.newTrades} new trades, ${result.updatedTrades} updated, ${result.skippedTrades} skipped`,
        summary: {
          totalTrades: result.trades.length,
          newTrades: result.newTrades,
          updatedTrades: result.updatedTrades,
          skippedTrades: result.skippedTrades,
          errors: result.errors.length
        },
        errors: result.errors
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'No trades were imported',
        summary: {
          totalTrades: result.trades.length,
          newTrades: result.newTrades,
          updatedTrades: result.updatedTrades,
          skippedTrades: result.skippedTrades,
          errors: result.errors.length
        },
        errors: result.errors
      }, { status: 400 })
    }
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // For now, skip authentication check to test the functionality
    // TODO: Implement proper server-side authentication
    console.log('Getting VIP import history')

    const importHistory = await getVipImportHistory(20)

    return NextResponse.json({
      success: true,
      importHistory
    })
  } catch (error) {
    console.error('Error getting import history:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get import history'
    }, { status: 500 })
  }
}
