import { NextResponse } from 'next/server'
import { getSignalsByCategory } from '@/lib/signalService'

export async function GET(request: Request) {
  try {
    console.log('Calculating signal statistics...')
    const signals = await getSignalsByCategory('vip', 500) // Get more signals for accurate stats
    
    // Filter completed signals (those with a result)
    const completedSignals = signals.filter(signal => 
      signal.result !== undefined && signal.result !== null
    )
    
    console.log(`Found ${signals.length} total VIP signals, ${completedSignals.length} completed`)
    
    // Calculate statistics
    const totalSignals = signals.length
    const completedCount = completedSignals.length
    const activeSignals = signals.filter(s => s.status === 'active').length
    
    // Calculate win/loss statistics from completed signals
    const winningSignals = completedSignals.filter(signal => (signal.result || 0) > 0)
    const losingSignals = completedSignals.filter(signal => (signal.result || 0) < 0)
    const breakevenSignals = completedSignals.filter(signal => (signal.result || 0) === 0)
    
    const totalPips = completedSignals.reduce((sum, signal) => sum + (signal.result || 0), 0)
    const winningPips = winningSignals.reduce((sum, signal) => sum + (signal.result || 0), 0)
    const losingPips = losingSignals.reduce((sum, signal) => sum + (signal.result || 0), 0)
    
    // Calculate averages
    const averageWin = winningSignals.length > 0 ? winningPips / winningSignals.length : 0
    const averageLoss = losingSignals.length > 0 ? losingPips / losingSignals.length : 0
    const winRate = completedCount > 0 ? (winningSignals.length / completedCount) * 100 : 0
    
    // Find best and worst signals
    const bestSignal = completedSignals.length > 0 
      ? Math.max(...completedSignals.map(s => s.result || 0))
      : 0
    const worstSignal = completedSignals.length > 0 
      ? Math.min(...completedSignals.map(s => s.result || 0))
      : 0
    
    // Calculate current win streak
    const sortedSignals = completedSignals
      .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    
    let currentWinStreak = 0
    for (const signal of sortedSignals) {
      if ((signal.result || 0) > 0) {
        currentWinStreak++
      } else {
        break
      }
    }
    
    // Calculate monthly stats (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const monthlySignals = completedSignals.filter(signal => 
      new Date(signal.postedAt) >= thirtyDaysAgo
    )
    const monthlyPips = monthlySignals.reduce((sum, signal) => sum + (signal.result || 0), 0)
    const monthlyWinRate = monthlySignals.length > 0 
      ? (monthlySignals.filter(s => (s.result || 0) > 0).length / monthlySignals.length) * 100 
      : 0
    
    const stats = {
      totalSignals,
      completedSignals: completedCount,
      activeSignals,
      winningSignals: winningSignals.length,
      losingSignals: losingSignals.length,
      breakevenSignals: breakevenSignals.length,
      totalPips,
      winningPips,
      losingPips,
      averageWin,
      averageLoss,
      winRate,
      bestSignal,
      worstSignal,
      currentWinStreak,
      monthlyPips,
      monthlyWinRate,
      lastUpdated: new Date().toISOString(),
      syncMethod: 'signals' as const
    }
    
    console.log('Signal stats calculated:', stats)
    
    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error calculating signal stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to calculate signal statistics'
    }, { status: 500 })
  }
}
