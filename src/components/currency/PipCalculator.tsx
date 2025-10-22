'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, CheckCircle, XCircle, Info, TrendingUp, TrendingDown } from 'lucide-react'

interface PipCalculatorProps {
  pipValue: number
  pipPosition: number
  baseCurrency: string
  quoteCurrency: string
  pipDisplayMultiplier?: number
  onValidationChange?: (isValid: boolean) => void
  onPipDisplayMultiplierChange?: (multiplier: number) => void
}

export default function PipCalculator({
  pipValue,
  pipPosition,
  baseCurrency,
  quoteCurrency,
  pipDisplayMultiplier = 1,
  onValidationChange,
  onPipDisplayMultiplierChange
}: PipCalculatorProps) {
  const [entryPrice, setEntryPrice] = useState<string>('1.0000')
  const [exitPrice, setExitPrice] = useState<string>('1.0020')
  const [manualPips, setManualPips] = useState<string>('')
  const [lotSize, setLotSize] = useState<number>(1.0)
  const [calculationMode, setCalculationMode] = useState<'price' | 'pips'>('price')
  const [pipMultiplier, setPipMultiplier] = useState<number>(pipDisplayMultiplier)
  const [result, setResult] = useState<{
    pips: number
    displayPips: number
    profit: number
    isProfit: boolean
    pipValue: number
    totalValue: number
  } | null>(null)

  // Sync pipMultiplier with prop changes
  useEffect(() => {
    setPipMultiplier(pipDisplayMultiplier)
  }, [pipDisplayMultiplier])

  // Handle pip multiplier changes
  const handlePipMultiplierChange = (value: string) => {
    const newMultiplier = parseFloat(value)
    setPipMultiplier(newMultiplier)
    if (onPipDisplayMultiplierChange) {
      onPipDisplayMultiplierChange(newMultiplier)
    }
  }

  // Calculate pips and profit
  const calculateResult = () => {
    if (!pipValue || pipPosition === undefined) {
      setResult(null)
      return
    }

    let pips = 0
    let isProfit = true

    if (calculationMode === 'price') {
      // Price-based calculation
      if (!entryPrice || !exitPrice) {
        setResult(null)
        return
      }

      const entry = parseFloat(entryPrice)
      const exit = parseFloat(exitPrice)
      
      if (isNaN(entry) || isNaN(exit)) {
        setResult(null)
        return
      }

      // For indices, use simple point difference
      if (baseCurrency === 'NASDAQ' || baseCurrency === 'S&P500' || baseCurrency === 'DOW') {
        pips = Math.abs(exit - entry)
        isProfit = exit > entry
      } else {
        // For forex, use pip position calculation
        const priceDiff = Math.abs(exit - entry)
        const safePipPosition = Math.max(0, Math.min(4, pipPosition))
        const pipSize = Math.pow(10, -safePipPosition)
        pips = Math.round(priceDiff / pipSize)
        isProfit = exit > entry
      }
    } else {
      // Manual pips calculation
      if (!manualPips) {
        setResult(null)
        return
      }

      const manualPipsValue = parseFloat(manualPips)
      if (isNaN(manualPipsValue)) {
        setResult(null)
        return
      }

      pips = Math.abs(manualPipsValue)
      isProfit = manualPipsValue > 0
    }

    const finalPips = isProfit ? pips : -pips
    const displayPips = finalPips * pipMultiplier
    
    // Calculate profit/loss
    const profitPerPip = pipValue * lotSize
    const profit = finalPips * profitPerPip
    
    // Calculate total value
    const totalValue = Math.abs(profit)

    setResult({
      pips: finalPips,
      displayPips: displayPips,
      profit: profit,
      isProfit: isProfit,
      pipValue: profitPerPip,
      totalValue: totalValue
    })

    // Notify parent component
    onValidationChange?.(true)
  }

  // Auto-calculate when values change
  useEffect(() => {
    calculateResult()
  }, [entryPrice, exitPrice, manualPips, lotSize, pipValue, pipPosition, calculationMode, pipMultiplier])

  // Set default prices based on currency pair
  useEffect(() => {
    if (baseCurrency && quoteCurrency) {
      // Set realistic default prices based on currency pair
      let defaultEntry = '1.0000'
      let defaultExit = '1.0020'
      
      if (baseCurrency === 'NASDAQ') {
        defaultEntry = '24000'
        defaultExit = '24050'
      } else if (baseCurrency === 'S&P500') {
        defaultEntry = '5000'
        defaultExit = '5005'
      } else if (baseCurrency === 'DOW') {
        defaultEntry = '35000'
        defaultExit = '35025'
      } else if (baseCurrency === 'USD' && quoteCurrency === 'JPY') {
        defaultEntry = '110.00'
        defaultExit = '110.20'
      } else if (baseCurrency === 'GBP' && quoteCurrency === 'USD') {
        defaultEntry = '1.2500'
        defaultExit = '1.2520'
      } else if (baseCurrency === 'AUD' && quoteCurrency === 'USD') {
        defaultEntry = '0.6500'
        defaultExit = '0.6520'
      }
      
      setEntryPrice(defaultEntry)
      setExitPrice(defaultExit)
    }
  }, [baseCurrency, quoteCurrency])

  if (!pipValue || pipPosition === undefined) {
    return (
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Pip Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-600 dark:text-orange-400">
            Please fill in Pip Value and Pip Position to enable the calculator.
          </p>
        </CardContent>
      </Card>
    )
  }

  const safePipPosition = Math.max(0, Math.min(4, pipPosition))
  const priceDecimals = Math.max(1, safePipPosition)

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Professional Pip Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">Pip Value:</span> ${pipValue.toFixed(2)}
            </div>
            <div>
              <span className="font-medium">Pip Position:</span> {pipPosition}
            </div>
            <div>
              <span className="font-medium">Pair:</span> {baseCurrency}/{quoteCurrency}
            </div>
            <div>
              <span className="font-medium">Lot Size:</span> {lotSize}
            </div>
          </div>
        </div>

        {/* Calculation Mode Toggle */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={calculationMode === 'price' ? 'default' : 'outline'}
            onClick={() => setCalculationMode('price')}
            className="text-xs h-8"
          >
            Price Based
          </Button>
          <Button
            size="sm"
            variant={calculationMode === 'pips' ? 'default' : 'outline'}
            onClick={() => setCalculationMode('pips')}
            className="text-xs h-8"
          >
            Manual Pips
          </Button>
        </div>

        {/* Calculator Inputs */}
        <div className="space-y-3">
          {calculationMode === 'price' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="entryPrice" className="text-xs font-medium">Entry Price</Label>
                <Input
                  id="entryPrice"
                  type="text"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="1.0000"
                  className="text-sm h-9"
                />
              </div>
              <div>
                <Label htmlFor="exitPrice" className="text-xs font-medium">Exit Price</Label>
                <Input
                  id="exitPrice"
                  type="text"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="1.0020"
                  className="text-sm h-9"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="manualPips" className="text-xs font-medium">Pips Movement</Label>
              <Input
                id="manualPips"
                type="text"
                value={manualPips}
                onChange={(e) => setManualPips(e.target.value)}
                placeholder="50 (positive for profit, negative for loss)"
                className="text-sm h-9"
              />
              <div className="text-xs text-gray-500 mt-1">
                Enter positive number for profit (+50) or negative for loss (-25)
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lotSize" className="text-xs font-medium">Lot Size</Label>
              <Select value={lotSize.toString()} onValueChange={(value) => setLotSize(parseFloat(value))}>
                <SelectTrigger className="text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.01">0.01 (Micro)</SelectItem>
                  <SelectItem value="0.1">0.1 (Mini)</SelectItem>
                  <SelectItem value="1.0">1.0 (Standard)</SelectItem>
                  <SelectItem value="10.0">10.0 (Large)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pipMultiplier" className="text-xs font-medium">Pip Display Multiplier</Label>
              <Select value={pipMultiplier.toString()} onValueChange={handlePipMultiplierChange}>
                <SelectTrigger className="text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.1">0.1 (500→50)</SelectItem>
                  <SelectItem value="0.5">0.5 (500→250)</SelectItem>
                  <SelectItem value="1.0">1.0 (No change)</SelectItem>
                  <SelectItem value="2.0">2.0 (500→1000)</SelectItem>
                  <SelectItem value="10.0">10.0 (500→5000)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                {result.isProfit ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                Calculation Results
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Display Pips</div>
                  <div className={`text-lg font-bold ${result.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                    {result.displayPips > 0 ? '+' : ''}{result.displayPips.toFixed(1)} pips
                  </div>
                  {pipMultiplier !== 1 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Actual: {result.pips > 0 ? '+' : ''}{result.pips}
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Profit/Loss</div>
                  <div className={`text-lg font-bold ${result.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                    ${result.profit.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Calculation Details</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {calculationMode === 'price' && (
                    <>
                      <div>
                        <span className="font-medium">Price Difference:</span> {Math.abs(parseFloat(exitPrice) - parseFloat(entryPrice)).toFixed(priceDecimals)}
                      </div>
                      <div>
                        <span className="font-medium">Pip Size:</span> {Math.pow(10, -safePipPosition).toFixed(4)}
                      </div>
                    </>
                  )}
                  <div>
                    <span className="font-medium">Actual Pips:</span> {result.pips > 0 ? '+' : ''}{result.pips}
                  </div>
                  {pipMultiplier !== 1 && (
                    <div>
                      <span className="font-medium">Display Multiplier:</span> {pipMultiplier}x
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Value per Pip:</span> ${result.pipValue.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Total Value:</span> ${result.totalValue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Test Buttons */}
        <div className="border-t pt-3">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Tests</div>
          <div className="grid grid-cols-3 gap-2">
            {calculationMode === 'price' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    const entry = parseFloat(entryPrice)
                    if (baseCurrency === 'NASDAQ' || baseCurrency === 'S&P500' || baseCurrency === 'DOW') {
                      setExitPrice((entry + 10).toString())
                    } else {
                      setExitPrice((entry + Math.pow(10, -safePipPosition) * 10).toFixed(priceDecimals))
                    }
                  }}
                >
                  +10 Pips
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    const entry = parseFloat(entryPrice)
                    if (baseCurrency === 'NASDAQ' || baseCurrency === 'S&P500' || baseCurrency === 'DOW') {
                      setExitPrice((entry + 20).toString())
                    } else {
                      setExitPrice((entry + Math.pow(10, -safePipPosition) * 20).toFixed(priceDecimals))
                    }
                  }}
                >
                  +20 Pips
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    const entry = parseFloat(entryPrice)
                    if (baseCurrency === 'NASDAQ' || baseCurrency === 'S&P500' || baseCurrency === 'DOW') {
                      setExitPrice((entry - 15).toString())
                    } else {
                      setExitPrice((entry - Math.pow(10, -safePipPosition) * 15).toFixed(priceDecimals))
                    }
                  }}
                >
                  -15 Pips
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setManualPips('10')}
                >
                  +10 Pips
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setManualPips('20')}
                >
                  +20 Pips
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setManualPips('-15')}
                >
                  -15 Pips
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}