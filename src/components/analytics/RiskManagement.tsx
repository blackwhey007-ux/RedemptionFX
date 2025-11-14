'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AnalyticsData, RiskMetrics } from '@/lib/analyticsService'
import { Shield, TrendingDown, AlertTriangle, Target, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'

interface RiskManagementProps {
  data: AnalyticsData
}

export function RiskManagement({ data }: RiskManagementProps) {
  const riskMetrics = data.riskMetrics

  if (!riskMetrics) {
    return (
      <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-orange-500/30 dark:border-orange-500/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Shield className="w-5 h-5 mr-2 text-orange-500" />
            Risk Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Insufficient data to calculate risk metrics.</p>
            <p className="text-sm mt-2">Complete more trades to see your risk profile.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const {
    maxDrawdown,
    maxDrawdownPercent,
    recoveryFactor,
    riskOfRuin,
    averageRisk,
    sharpeRatio,
    expectancy,
    equityCurve
  } = riskMetrics

  // Prepare equity curve data for chart
  const chartData = equityCurve.map((point, idx) => ({
    date: format(point.date, 'MMM dd'),
    equity: point.equity,
    drawdown: point.drawdown,
    drawdownPercent: point.drawdownPercent,
    peak: point.equity + point.drawdown
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            {payload.map((entry: any, idx: number) => (
              <p key={idx}>
                <span className="text-gray-600 dark:text-gray-400">{entry.name}: </span>
                <span className={`font-semibold ${entry.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.name === 'Equity' || entry.name === 'Peak' || entry.name === 'Drawdown'
                    ? `$${entry.value.toFixed(2)}`
                    : entry.name === 'Drawdown %'
                    ? `${entry.value.toFixed(2)}%`
                    : entry.value.toFixed(2)}
                </span>
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  // Risk assessment
  const getRiskLevel = (value: number, type: 'drawdown' | 'ruin' | 'sharpe' | 'recovery') => {
    if (type === 'drawdown') {
      if (value < 10) return { level: 'Low', color: 'green' }
      if (value < 20) return { level: 'Moderate', color: 'yellow' }
      if (value < 30) return { level: 'High', color: 'orange' }
      return { level: 'Very High', color: 'red' }
    }
    if (type === 'ruin') {
      if (value < 5) return { level: 'Low', color: 'green' }
      if (value < 15) return { level: 'Moderate', color: 'yellow' }
      if (value < 30) return { level: 'High', color: 'orange' }
      return { level: 'Very High', color: 'red' }
    }
    if (type === 'sharpe') {
      if (value > 2) return { level: 'Excellent', color: 'green' }
      if (value > 1) return { level: 'Good', color: 'blue' }
      if (value > 0) return { level: 'Fair', color: 'yellow' }
      return { level: 'Poor', color: 'red' }
    }
    if (type === 'recovery') {
      if (value > 3) return { level: 'Excellent', color: 'green' }
      if (value > 1.5) return { level: 'Good', color: 'blue' }
      if (value > 1) return { level: 'Fair', color: 'yellow' }
      return { level: 'Poor', color: 'red' }
    }
    return { level: 'Unknown', color: 'gray' }
  }

  const drawdownRisk = getRiskLevel(maxDrawdownPercent, 'drawdown')
  const ruinRisk = getRiskLevel(riskOfRuin, 'ruin')
  const sharpeRisk = getRiskLevel(sharpeRatio, 'sharpe')
  const recoveryRisk = getRiskLevel(recoveryFactor, 'recovery')

  return (
    <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-orange-500/30 dark:border-orange-500/50 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <Shield className="w-5 h-5 mr-2 text-orange-500" />
          Risk Management
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Comprehensive risk analysis and drawdown tracking
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Risk Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Max Drawdown */}
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              <Badge
                variant="outline"
                className={`text-xs ${
                  drawdownRisk.color === 'green'
                    ? 'border-green-500 text-green-700 dark:text-green-400'
                    : drawdownRisk.color === 'yellow'
                    ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400'
                    : drawdownRisk.color === 'orange'
                    ? 'border-orange-500 text-orange-700 dark:text-orange-400'
                    : 'border-red-500 text-red-700 dark:text-red-400'
                }`}
              >
                {drawdownRisk.level}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Max Drawdown</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              ${maxDrawdown.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {maxDrawdownPercent.toFixed(2)}%
            </p>
          </div>

          {/* Recovery Factor */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <Badge
                variant="outline"
                className={`text-xs ${
                  recoveryRisk.color === 'green'
                    ? 'border-green-500 text-green-700 dark:text-green-400'
                    : recoveryRisk.color === 'blue'
                    ? 'border-blue-500 text-blue-700 dark:text-blue-400'
                    : recoveryRisk.color === 'yellow'
                    ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400'
                    : 'border-red-500 text-red-700 dark:text-red-400'
                }`}
              >
                {recoveryRisk.level}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Recovery Factor</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {recoveryFactor.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Profit / MDD</p>
          </div>

          {/* Risk of Ruin */}
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <Badge
                variant="outline"
                className={`text-xs ${
                  ruinRisk.color === 'green'
                    ? 'border-green-500 text-green-700 dark:text-green-400'
                    : ruinRisk.color === 'yellow'
                    ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400'
                    : ruinRisk.color === 'orange'
                    ? 'border-orange-500 text-orange-700 dark:text-orange-400'
                    : 'border-red-500 text-red-700 dark:text-red-400'
                }`}
              >
                {ruinRisk.level}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Risk of Ruin</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {riskOfRuin.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Account depletion risk</p>
          </div>

          {/* Sharpe Ratio */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <Badge
                variant="outline"
                className={`text-xs ${
                  sharpeRisk.color === 'green'
                    ? 'border-green-500 text-green-700 dark:text-green-400'
                    : sharpeRisk.color === 'blue'
                    ? 'border-blue-500 text-blue-700 dark:text-blue-400'
                    : sharpeRisk.color === 'yellow'
                    ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400'
                    : 'border-red-500 text-red-700 dark:text-red-400'
                }`}
              >
                {sharpeRisk.level}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sharpe Ratio</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {sharpeRatio.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Risk-adjusted return</p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expectancy</p>
            <p className={`text-lg font-bold ${expectancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${expectancy.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Per trade</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Average Risk</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${averageRisk.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Per trade</p>
          </div>
        </div>

        {/* Equity Curve with Drawdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Equity Curve & Drawdown</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Equity ($)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Drawdown ($)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="equity"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorEquity)"
                name="Equity"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="drawdown"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorDrawdown)"
                name="Drawdown"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Recommendations */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Risk Management Recommendations
          </h3>
          <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
            {maxDrawdownPercent > 20 && (
              <li>• Consider reducing position sizes to limit drawdown exposure</li>
            )}
            {riskOfRuin > 15 && (
              <li>• Your risk of ruin is elevated - review your risk management strategy</li>
            )}
            {recoveryFactor < 1.5 && (
              <li>• Focus on improving recovery factor by managing drawdowns better</li>
            )}
            {sharpeRatio < 1 && (
              <li>• Work on improving risk-adjusted returns through better trade selection</li>
            )}
            {expectancy < 0 && (
              <li>• Your expectancy is negative - review your trading strategy</li>
            )}
            {maxDrawdownPercent < 10 && riskOfRuin < 5 && recoveryFactor > 2 && (
              <li>• Excellent risk management! Keep maintaining discipline</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

