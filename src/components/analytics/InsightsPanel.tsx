'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnalyticsData } from '@/lib/analyticsService'
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Target } from 'lucide-react'

interface InsightsPanelProps {
  data: AnalyticsData
}

export function InsightsPanel({ data }: InsightsPanelProps) {
  const insights: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []

  // Generate insights based on analytics data
  if (data.bestTimeAnalysis) {
    const { bestHours, worstHours, optimalWindows } = data.bestTimeAnalysis
    
    if (bestHours.length > 0) {
      insights.push(`You perform best trading at ${bestHours[0]}`)
    }
    
    if (worstHours.length > 0) {
      warnings.push(`Avoid trading during ${worstHours[0]} - lowest performance period`)
    }
    
    if (optimalWindows.length > 0) {
      const bestWindow = optimalWindows[0]
      recommendations.push(`Focus on trading during ${bestWindow.start} - ${bestWindow.end} (${bestWindow.winRate.toFixed(1)}% win rate)`)
    }
  }

  // Win rate insights
  if (data.winRate > 60) {
    insights.push(`Excellent win rate of ${data.winRate.toFixed(1)}% - keep up the great work!`)
  } else if (data.winRate < 40) {
    warnings.push(`Win rate is below 40% - consider reviewing your entry criteria`)
    recommendations.push(`Focus on improving trade quality over quantity`)
  } else if (data.winRate < 50) {
    recommendations.push(`Your win rate is ${data.winRate.toFixed(1)}% - aim for 50%+ for better profitability`)
  }

  // Profit factor insights
  if (data.profitFactor && data.profitFactor >= 1.5) {
    insights.push(`Strong profit factor of ${data.profitFactor.toFixed(2)} - excellent risk management`)
  } else if (data.profitFactor && data.profitFactor < 1) {
    warnings.push(`Profit factor below 1.0 - losses exceed wins`)
    recommendations.push(`Review your risk/reward ratios and exit strategies`)
  } else if (data.profitFactor && data.profitFactor < 1.2) {
    recommendations.push(`Profit factor of ${data.profitFactor.toFixed(2)} - aim for 1.5+ for sustainable trading`)
  }

  // Best day insights
  if (data.dailyData && data.dailyData.length > 0) {
    const bestDay = data.dailyData.reduce((best, day) => day.profit > best.profit ? day : best, data.dailyData[0])
    const worstDay = data.dailyData.reduce((worst, day) => day.profit < worst.profit ? day : worst, data.dailyData[0])
    
    if (bestDay.profit > 0 && bestDay.trades > 0) {
      insights.push(`Your best trading day is ${bestDay.day} with ${bestDay.winRate.toFixed(1)}% win rate`)
    }
    
    if (worstDay.profit < 0 && worstDay.trades > 0) {
      warnings.push(`${worstDay.day} shows negative performance - consider reducing activity on this day`)
    }
  }

  // Best pair insights
  if (data.optimizationInsights && data.optimizationInsights.bestPairs.length > 0) {
    const topPair = data.optimizationInsights.bestPairs[0]
    insights.push(`Best performing pair: ${topPair.symbol} (${topPair.winRate.toFixed(1)}% win rate, $${topPair.profit.toFixed(2)} profit)`)
    
    if (data.optimizationInsights.bestPairs.length > 1) {
      const secondPair = data.optimizationInsights.bestPairs[1]
      recommendations.push(`Consider focusing more on ${topPair.symbol} and ${secondPair.symbol} - your strongest pairs`)
    }
  }

  // Risk management insights
  if (data.riskMetrics) {
    const { maxDrawdownPercent, recoveryFactor, riskOfRuin, expectancy } = data.riskMetrics
    
    if (maxDrawdownPercent > 20) {
      warnings.push(`Maximum drawdown is ${maxDrawdownPercent.toFixed(1)}% - consider reducing position sizes`)
      recommendations.push(`Implement stricter risk management to limit drawdowns to under 15%`)
    } else if (maxDrawdownPercent < 10) {
      insights.push(`Excellent drawdown control at ${maxDrawdownPercent.toFixed(1)}%`)
    }
    
    if (recoveryFactor < 1.5) {
      warnings.push(`Recovery factor is ${recoveryFactor.toFixed(2)} - focus on managing drawdowns better`)
    } else if (recoveryFactor > 3) {
      insights.push(`Strong recovery factor of ${recoveryFactor.toFixed(2)} - excellent risk management`)
    }
    
    if (riskOfRuin > 15) {
      warnings.push(`Risk of ruin is ${riskOfRuin.toFixed(1)}% - review your risk management strategy`)
      recommendations.push(`Reduce position sizes or improve win rate to lower risk of ruin`)
    }
    
    if (expectancy < 0) {
      warnings.push(`Negative expectancy of $${expectancy.toFixed(2)} - strategy needs review`)
      recommendations.push(`Focus on improving win rate or risk/reward ratios to achieve positive expectancy`)
    } else if (expectancy > 0) {
      insights.push(`Positive expectancy of $${expectancy.toFixed(2)} per trade - good foundation`)
    }
  }

  // Consistency insights
  if (data.optimizationInsights) {
    const { monthlyConsistency } = data.optimizationInsights
    if (monthlyConsistency > 70) {
      insights.push(`High monthly consistency of ${monthlyConsistency.toFixed(1)}% - stable performance`)
    } else if (monthlyConsistency < 40) {
      warnings.push(`Low consistency of ${monthlyConsistency.toFixed(1)}% - performance varies significantly`)
      recommendations.push(`Work on maintaining consistent trading discipline across all months`)
    }
  }

  // R:R insights
  if (data.averageRR && data.averageRR > 0) {
    if (data.averageRR >= 2) {
      insights.push(`Excellent average R:R of ${data.averageRR.toFixed(2)} - strong risk management`)
    } else if (data.averageRR < 1) {
      warnings.push(`Average R:R is below 1.0 - risk exceeds reward`)
      recommendations.push(`Aim for minimum 1:2 risk/reward ratio on all trades`)
    } else if (data.averageRR < 1.5) {
      recommendations.push(`Average R:R of ${data.averageRR.toFixed(2)} - aim for 2.0+ for better profitability`)
    }
  }

  // Consecutive streaks
  if (data.maxConsecutiveLosses > 5) {
    warnings.push(`Maximum consecutive losses: ${data.maxConsecutiveLosses} - consider taking a break after 3 losses`)
    recommendations.push(`Implement a rule to stop trading after 3 consecutive losses`)
  }

  if (data.maxConsecutiveWins > 5) {
    insights.push(`Impressive win streak of ${data.maxConsecutiveWins} consecutive wins`)
  }

  // Trade frequency
  if (data.totalTrades > 0) {
    const avgTradesPerDay = data.totalTrades / 30 // Rough estimate
    if (avgTradesPerDay > 5) {
      warnings.push(`High trading frequency - quality over quantity`)
      recommendations.push(`Consider reducing trade frequency and focusing on higher quality setups`)
    } else if (avgTradesPerDay < 0.5) {
      recommendations.push(`Low trading frequency - ensure you're not missing good opportunities`)
    }
  }

  // Combine all insights
  const allInsights = [
    ...insights.map(i => ({ type: 'insight', text: i })),
    ...warnings.map(w => ({ type: 'warning', text: w })),
    ...recommendations.map(r => ({ type: 'recommendation', text: r }))
  ]

  if (allInsights.length === 0) {
    return (
      <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-yellow-500/30 dark:border-yellow-500/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
            Trading Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Complete more trades to generate personalized insights.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-yellow-500/30 dark:border-yellow-500/50 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
          Trading Insights & Recommendations
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          AI-generated insights to help optimize your trading performance
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Positive Insights */}
        {insights.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Strengths
            </h3>
            <div className="space-y-2">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 flex items-start"
                >
                  <TrendingUp className="w-4 h-4 mr-2 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
              Areas of Concern
            </h3>
            <div className="space-y-2">
              {warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800 flex items-start"
                >
                  <AlertCircle className="w-4 h-4 mr-2 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-orange-800 dark:text-orange-200">{warning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-2 text-blue-600" />
              Actionable Recommendations
            </h3>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 flex items-start"
                >
                  <Target className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Badge */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300">
              {insights.length} Strengths
            </Badge>
            {warnings.length > 0 && (
              <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-300">
                {warnings.length} Warnings
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300">
              {recommendations.length} Recommendations
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

