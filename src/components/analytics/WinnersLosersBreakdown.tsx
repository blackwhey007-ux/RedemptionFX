'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsData } from '@/lib/analyticsService'
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Target, Clock } from 'lucide-react'

interface WinnersLosersBreakdownProps {
  data: AnalyticsData
}

export function WinnersLosersBreakdown({ data }: WinnersLosersBreakdownProps) {
  const {
    totalWinners,
    totalLosers,
    bestWin,
    worstLoss,
    averageWin,
    averageLoss,
    avgWinDuration,
    avgLossDuration,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    avgConsecutiveWins,
    avgConsecutiveLosses
  } = data

  return (
    <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <Target className="w-5 h-5 mr-2 text-red-500" />
          Winners and Losers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Winners Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Winners</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total winners</span>
                <span className="font-bold text-green-600 dark:text-green-400">{totalWinners}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Best win</span>
                <span className="font-bold text-green-600 dark:text-green-400">+{bestWin.toFixed(2)}%</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Average win</span>
                <span className="font-bold text-green-600 dark:text-green-400">+{averageWin.toFixed(2)}%</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Average duration</span>
                </div>
                <span className="font-bold text-green-600 dark:text-green-400">{avgWinDuration}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Max consecutive wins</span>
                <span className="font-bold text-green-600 dark:text-green-400">{maxConsecutiveWins}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Avg consecutive wins</span>
                <span className="font-bold text-green-600 dark:text-green-400">{avgConsecutiveWins.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Losers Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <XCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Losers</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total losers</span>
                <span className="font-bold text-red-600 dark:text-red-400">{totalLosers}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Worst loss</span>
                <span className="font-bold text-red-600 dark:text-red-400">{worstLoss.toFixed(2)}%</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Average loss</span>
                <span className="font-bold text-red-600 dark:text-red-400">{averageLoss.toFixed(2)}%</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Average duration</span>
                </div>
                <span className="font-bold text-red-600 dark:text-red-400">{avgLossDuration}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Max consecutive losses</span>
                <span className="font-bold text-red-600 dark:text-red-400">{maxConsecutiveLosses}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Avg consecutive losses</span>
                <span className="font-bold text-red-600 dark:text-red-400">{avgConsecutiveLosses.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
