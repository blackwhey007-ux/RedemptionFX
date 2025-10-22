'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { AnalyticsData } from '@/lib/analyticsService'

interface WithdrawCalculatorProps {
  data: AnalyticsData
  startingBalance: number
}

export function WithdrawCalculator({ data, startingBalance }: WithdrawCalculatorProps) {
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0)
  const [withdrawPercentage, setWithdrawPercentage] = useState<number>(0)
  const [withdrawType, setWithdrawType] = useState<'amount' | 'percentage'>('amount')
  const [showResults, setShowResults] = useState(false)

  const currentBalance = data.accountBalance
  const totalPnL = data.totalPnL
  const profitPercentage = startingBalance > 0 ? (totalPnL / startingBalance) * 100 : 0

  // Calculate withdraw amount based on type
  const calculateWithdrawAmount = () => {
    if (withdrawType === 'percentage') {
      return (currentBalance * withdrawPercentage) / 100
    }
    return withdrawAmount
  }

  const finalWithdrawAmount = calculateWithdrawAmount()
  const remainingBalance = currentBalance - finalWithdrawAmount
  const remainingPnL = remainingBalance - startingBalance
  const remainingProfitPercentage = startingBalance > 0 ? (remainingPnL / startingBalance) * 100 : 0

  // Withdrawal rules and warnings
  const getWithdrawalRules = () => {
    const rules = []
    
    if (finalWithdrawAmount > currentBalance) {
      rules.push({
        type: 'error',
        message: 'Withdrawal amount cannot exceed current balance'
      })
    }
    
    if (finalWithdrawAmount > totalPnL) {
      rules.push({
        type: 'warning',
        message: 'Withdrawing more than profits will reduce your initial capital'
      })
    }
    
    if (remainingBalance < startingBalance * 0.5) {
      rules.push({
        type: 'warning',
        message: 'Remaining balance will be less than 50% of starting balance'
      })
    }
    
    if (finalWithdrawAmount <= totalPnL && finalWithdrawAmount > 0) {
      rules.push({
        type: 'success',
        message: 'Safe withdrawal - only withdrawing profits'
      })
    }
    
    return rules
  }

  const rules = getWithdrawalRules()

  const handleCalculate = () => {
    setShowResults(true)
  }

  const handleReset = () => {
    setWithdrawAmount(0)
    setWithdrawPercentage(0)
    setWithdrawType('amount')
    setShowResults(false)
  }

  const presetPercentages = [10, 25, 50, 75, 100]

  return (
    <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-red-500" />
          Withdraw Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Current Balance</p>
                <p className="text-2xl font-bold">
                  ${currentBalance.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total P&L</p>
                <p className="text-2xl font-bold">
                  ${totalPnL.toFixed(2)}
                </p>
                <p className="text-green-200 text-xs">
                  {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
                </p>
              </div>
              {profitPercentage >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-200" />
              ) : (
                <TrendingDown className="w-8 h-8 text-green-200" />
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Starting Balance</p>
                <p className="text-2xl font-bold">
                  ${startingBalance.toFixed(2)}
                </p>
              </div>
              <Percent className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Withdrawal Input */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Withdrawal Type
            </Label>
            <Select value={withdrawType} onValueChange={(value: 'amount' | 'percentage') => setWithdrawType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {withdrawType === 'amount' ? (
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Withdrawal Amount ($)
              </Label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount to withdraw"
                className="mt-1"
                min="0"
                max={currentBalance}
                step="0.01"
              />
            </div>
          ) : (
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Withdrawal Percentage (%)
              </Label>
              <Input
                type="number"
                value={withdrawPercentage}
                onChange={(e) => setWithdrawPercentage(parseFloat(e.target.value) || 0)}
                placeholder="Enter percentage to withdraw"
                className="mt-1"
                min="0"
                max="100"
                step="0.1"
              />
              
              {/* Quick percentage buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                {presetPercentages.map((percentage) => (
                  <Button
                    key={percentage}
                    variant="outline"
                    size="sm"
                    onClick={() => setWithdrawPercentage(percentage)}
                    className="text-xs"
                  >
                    {percentage}%
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calculate Button */}
        <Button
          onClick={handleCalculate}
          className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
          disabled={finalWithdrawAmount <= 0}
        >
          Calculate Withdrawal Impact
        </Button>

        {/* Results */}
        {showResults && (
          <div className="space-y-4">
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Withdrawal Impact Analysis
              </h4>

              {/* Results Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Withdrawal Amount</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${finalWithdrawAmount.toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Remaining Balance</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${remainingBalance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* P&L Impact */}
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">P&L Impact</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Remaining P&L:</span>
                  <span className={`text-lg font-bold ${remainingPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${remainingPnL.toFixed(2)} ({remainingProfitPercentage >= 0 ? '+' : ''}{remainingProfitPercentage.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Rules and Warnings */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Withdrawal Rules & Warnings</h5>
                {rules.map((rule, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 p-3 rounded-lg ${
                      rule.type === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : rule.type === 'warning'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    }`}
                  >
                    {rule.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : rule.type === 'warning' ? (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span
                      className={`text-sm ${
                        rule.type === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : rule.type === 'warning'
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}
                    >
                      {rule.message}
                    </span>
                  </div>
                ))}
              </div>

              {/* Reset Button */}
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full mt-4"
              >
                Reset Calculator
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
