/**
 * Export Utility Functions
 * Functions for exporting statistics data to CSV and PDF
 * 
 * Note: This file must be used in client components only ('use client')
 */

'use client';

interface FollowerStats {
  email: string
  accountId: string
  balance: number
  equity: number
  margin: number
  freeMargin: number
  marginLevel: number
  profitLoss?: number
  openPositions?: number
  accountAge?: number
  status: string
  [key: string]: any
}

/**
 * Generic CSV export function - handles any array of objects or with filename
 */
export function exportToCSV(data: any[] | any, filenameOrTotals: string | any, performance?: any, risk?: any, trading?: any): void {
  // If second parameter is a string, it's a generic CSV export with filename
  if (typeof filenameOrTotals === 'string') {
    const filename = filenameOrTotals
    const csvData = data as any[]
    
    if (!csvData || csvData.length === 0) {
      console.warn('No data to export')
      return
    }
    
    // Get headers from first object
    const headers = Object.keys(csvData[0])
    const rows: string[] = []
    
    // Add header row
    rows.push(headers.join(','))
    
    // Add data rows
    csvData.forEach((item: any) => {
      const values = headers.map(header => {
        const value = item[header]
        // Handle values with commas by wrapping in quotes
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return value != null ? value : ''
      })
      rows.push(values.join(','))
    })
    
    // Create and download
    const csvContent = rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return
  }
  
  // Otherwise, it's the follower statistics export
  const followers = data as FollowerStats[]
  const totals = filenameOrTotals
  const rows: string[] = []

  // Header
  rows.push('Follower Statistics Export')
  rows.push(`Generated: ${new Date().toLocaleString()}`)
  rows.push('')

  // Summary
  rows.push('Summary')
  rows.push(`Total Capital,${totals.totalCapital}`)
  rows.push(`Total Equity,${totals.totalEquity}`)
  rows.push(`Total Margin,${totals.totalMargin}`)
  rows.push(`Average Margin Level,${totals.averageMarginLevel}`)
  rows.push('')

  // Performance
  if (performance) {
    rows.push('Performance Metrics')
    rows.push(`Total P/L,${performance.totalProfitLoss}`)
    rows.push(`Win Rate,${performance.winRate}%`)
    rows.push(`Average Profit,${performance.averageProfit}`)
    rows.push(`Profit Factor,${performance.profitFactor}`)
    rows.push('')
  }

  // Risk
  if (risk) {
    rows.push('Risk Analysis')
    rows.push(`Total Exposure,${risk.totalExposure}`)
    rows.push(`Current Drawdown,${risk.currentDrawdown}%`)
    rows.push(`Accounts At Risk,${risk.accountsAtRisk}`)
    rows.push('')
  }

  // Trading
  if (trading) {
    rows.push('Trading Activity')
    rows.push(`Open Positions,${trading.openPositions}`)
    rows.push(`Total Volume,${trading.totalVolume}`)
    rows.push(`Active Accounts,${trading.activeAccounts}`)
    rows.push('')
  }

  // Followers table
  rows.push('Followers')
  rows.push(
    'Email,Account ID,Balance,Equity,Margin,Free Margin,Margin Level,Profit/Loss,Open Positions,Account Age (days),Status'
  )

  followers.forEach((follower) => {
    rows.push(
      [
        follower.email || '',
        follower.accountId || '',
        follower.balance || 0,
        follower.equity || 0,
        follower.margin || 0,
        follower.freeMargin || 0,
        follower.marginLevel || 0,
        follower.profitLoss || 0,
        follower.openPositions || 0,
        follower.accountAge || 0,
        follower.status || ''
      ].join(',')
    )
  })

  // Create and download
  const csvContent = rows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `follower-statistics-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export statistics to PDF (simplified - requires jsPDF library)
 */
export async function exportToPDF(
  followers: FollowerStats[],
  totals: any,
  performance?: any,
  risk?: any,
  trading?: any
): Promise<void> {
  // Only run on client side
  if (typeof window === 'undefined') {
    throw new Error('PDF export is only available on the client side')
  }

  try {
    // Dynamic import to avoid errors if library not installed
    // Use dynamic import with 'next/dynamic' style to prevent SSR bundling
    let jsPDF: any
    try {
      // Dynamic import that won't be bundled for SSR
      const jspdfModule = await import('jspdf' as any)
      // Handle different export formats
      jsPDF = (jspdfModule as any).jsPDF || 
              (jspdfModule as any).default?.jsPDF || 
              (jspdfModule as any).default ||
              (jspdfModule as any)
      
      if (!jsPDF) {
        throw new Error('jsPDF constructor not found in module')
      }
    } catch (importError) {
      console.error('jsPDF import error:', importError)
      throw new Error('jsPDF library not installed. Please install it: npm install jspdf')
    }
    const doc = new jsPDF()

    let yPos = 20

    // Title
    doc.setFontSize(18)
    doc.text('Follower Statistics Report', 14, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPos)
    yPos += 15

    // Summary
    doc.setFontSize(14)
    doc.text('Summary', 14, yPos)
    yPos += 8
    doc.setFontSize(10)
    doc.text(`Total Capital: $${totals.totalCapital.toFixed(2)}`, 14, yPos)
    yPos += 6
    doc.text(`Total Equity: $${totals.totalEquity.toFixed(2)}`, 14, yPos)
    yPos += 6
    doc.text(`Total Margin: $${totals.totalMargin.toFixed(2)}`, 14, yPos)
    yPos += 6
    doc.text(`Avg Margin Level: ${totals.averageMarginLevel.toFixed(2)}%`, 14, yPos)
    yPos += 10

    // Performance
    if (performance) {
      doc.setFontSize(14)
      doc.text('Performance Metrics', 14, yPos)
      yPos += 8
      doc.setFontSize(10)
      doc.text(`Total P/L: $${performance.totalProfitLoss.toFixed(2)}`, 14, yPos)
      yPos += 6
      doc.text(`Win Rate: ${performance.winRate.toFixed(2)}%`, 14, yPos)
      yPos += 10
    }

    // Table header
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    doc.setFontSize(12)
    doc.text('Followers', 14, yPos)
    yPos += 8

    // Simple table (first 20 rows to fit on page)
    const displayFollowers = followers.slice(0, 20)
    doc.setFontSize(8)
    doc.text('Email | Account ID | Balance | Equity | Status', 14, yPos)
    yPos += 6

    displayFollowers.forEach((follower) => {
      if (yPos > 280) {
        doc.addPage()
        yPos = 20
      }
      const line = `${follower.email?.substring(0, 20) || ''} | ${follower.accountId?.substring(0, 8) || ''} | $${(follower.balance || 0).toFixed(2)} | $${(follower.equity || 0).toFixed(2)} | ${follower.status || ''}`
      doc.text(line, 14, yPos)
      yPos += 6
    })

    if (followers.length > 20) {
      doc.text(`... and ${followers.length - 20} more accounts`, 14, yPos)
    }

    doc.save(`follower-statistics-${new Date().toISOString().split('T')[0]}.pdf`)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    // Fallback: show message that PDF export requires jsPDF library
    alert('PDF export requires jsPDF library. Please install it: npm install jspdf')
  }
}

