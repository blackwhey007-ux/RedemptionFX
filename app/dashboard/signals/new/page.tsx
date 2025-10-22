'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TRADING_PAIRS, SIGNAL_TYPES, TIMEFRAMES } from '@/lib/constants'
import { TrendingUp, Calculator, Upload, Eye } from 'lucide-react'
import { toast } from 'sonner'

const signalSchema = z.object({
  pair: z.string().min(1, 'Trading pair is required'),
  type: z.enum(['BUY', 'SELL']),
  entryPrice: z.string().min(1, 'Entry price is required'),
  stopLoss: z.string().min(1, 'Stop loss is required'),
  takeProfit1: z.string().min(1, 'Take profit 1 is required'),
  takeProfit2: z.string().optional(),
  takeProfit3: z.string().optional(),
  timeframe: z.enum(['SCALP', 'DAY_TRADE', 'SWING']),
  reasoning: z.string().min(10, 'Reasoning must be at least 10 characters'),
  chartImage: z.any().optional(),
})

type SignalFormData = z.infer<typeof signalSchema>

export default function NewSignalPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [riskReward, setRiskReward] = useState<string>('')

  const form = useForm<SignalFormData>({
    resolver: zodResolver(signalSchema),
    defaultValues: {
      type: 'BUY',
      timeframe: 'SWING',
    },
  })

  const watchedValues = form.watch()

  // Calculate risk/reward ratio
  const calculateRiskReward = () => {
    const entry = parseFloat(watchedValues.entryPrice || '0')
    const sl = parseFloat(watchedValues.stopLoss || '0')
    const tp1 = parseFloat(watchedValues.takeProfit1 || '0')
    
    if (entry && sl && tp1) {
      const risk = Math.abs(entry - sl)
      const reward = Math.abs(tp1 - entry)
      const ratio = risk > 0 ? (reward / risk).toFixed(1) : '0'
      setRiskReward(`1:${ratio}`)
      return ratio
    }
    return '0'
  }

  // Update risk/reward when values change
  React.useEffect(() => {
    calculateRiskReward()
  }, [watchedValues.entryPrice, watchedValues.stopLoss, watchedValues.takeProfit1])

  const onSubmit = async (data: SignalFormData) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          riskReward: parseFloat(calculateRiskReward()),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create signal')
      }

      toast.success('Signal posted successfully!')
      router.push('/dashboard/signals')
    } catch (error) {
      toast.error('Failed to post signal. Please try again.')
      console.error('Error creating signal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTelegramMessage = (data: SignalFormData) => {
    const typeEmoji = data.type === 'BUY' ? '📈' : '📉'
    const timeframeText = TIMEFRAMES.find(t => t.value === data.timeframe)?.label || data.timeframe
    
    return `🔔 NEW SIGNAL - RedemptionFX

${typeEmoji} Pair: ${data.pair}
💼 Type: ${data.type}
📍 Entry: ${data.entryPrice}
🛑 Stop Loss: ${data.stopLoss}
🎯 TP1: ${data.takeProfit1} (+${Math.abs(parseFloat(data.takeProfit1) - parseFloat(data.entryPrice)).toFixed(0)} pips)
${data.takeProfit2 ? `🎯 TP2: ${data.takeProfit2} (+${Math.abs(parseFloat(data.takeProfit2) - parseFloat(data.entryPrice)).toFixed(0)} pips)` : ''}
${data.takeProfit3 ? `🎯 TP3: ${data.takeProfit3} (+${Math.abs(parseFloat(data.takeProfit3) - parseFloat(data.entryPrice)).toFixed(0)} pips)` : ''}
⚖️ Risk/Reward: ${riskReward}
⏰ Timeframe: ${timeframeText}

📝 Analysis: ${data.reasoning}

⚠️ Risk only 1-2% per trade
🔥 Follow with discipline`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Post New Signal</h1>
          <p className="text-gray-400 mt-2">Create and distribute a new trading signal</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signal Form */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Signal Details
            </CardTitle>
            <CardDescription className="text-gray-400">
              Fill in the trading signal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Trading Pair */}
              <div className="space-y-2">
                <Label htmlFor="pair" className="text-gray-300">Trading Pair</Label>
                <Select
                  value={watchedValues.pair}
                  onValueChange={(value) => form.setValue('pair', value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select trading pair" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {TRADING_PAIRS.map((pair) => (
                      <SelectItem key={pair} value={pair} className="text-white hover:bg-gray-700">
                        {pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.pair && (
                  <p className="text-red-400 text-sm">{form.formState.errors.pair.message}</p>
                )}
              </div>

              {/* Signal Type */}
              <div className="space-y-2">
                <Label className="text-gray-300">Signal Type</Label>
                <div className="flex space-x-4">
                  {SIGNAL_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      type="button"
                      variant={watchedValues.type === type.value ? "default" : "outline"}
                      className={`flex-1 ${
                        watchedValues.type === type.value
                          ? type.value === 'BUY' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-red-600 hover:bg-red-700'
                          : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                      }`}
                      onClick={() => form.setValue('type', type.value as 'BUY' | 'SELL')}
                    >
                      {type.emoji} {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Entry Price */}
              <div className="space-y-2">
                <Label htmlFor="entryPrice" className="text-gray-300">Entry Price</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.00001"
                  placeholder="2050.00"
                  className="bg-gray-800 border-gray-700 text-white"
                  {...form.register('entryPrice')}
                />
                {form.formState.errors.entryPrice && (
                  <p className="text-red-400 text-sm">{form.formState.errors.entryPrice.message}</p>
                )}
              </div>

              {/* Stop Loss */}
              <div className="space-y-2">
                <Label htmlFor="stopLoss" className="text-gray-300">Stop Loss</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="0.00001"
                  placeholder="2045.00"
                  className="bg-gray-800 border-gray-700 text-white"
                  {...form.register('stopLoss')}
                />
                {form.formState.errors.stopLoss && (
                  <p className="text-red-400 text-sm">{form.formState.errors.stopLoss.message}</p>
                )}
              </div>

              {/* Take Profits */}
              <div className="space-y-4">
                <Label className="text-gray-300">Take Profit Levels</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="takeProfit1" className="text-sm text-gray-400">TP1 (Required)</Label>
                  <Input
                    id="takeProfit1"
                    type="number"
                    step="0.00001"
                    placeholder="2060.00"
                    className="bg-gray-800 border-gray-700 text-white"
                    {...form.register('takeProfit1')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="takeProfit2" className="text-sm text-gray-400">TP2 (Optional)</Label>
                  <Input
                    id="takeProfit2"
                    type="number"
                    step="0.00001"
                    placeholder="2070.00"
                    className="bg-gray-800 border-gray-700 text-white"
                    {...form.register('takeProfit2')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="takeProfit3" className="text-sm text-gray-400">TP3 (Optional)</Label>
                  <Input
                    id="takeProfit3"
                    type="number"
                    step="0.00001"
                    placeholder="2080.00"
                    className="bg-gray-800 border-gray-700 text-white"
                    {...form.register('takeProfit3')}
                  />
                </div>
              </div>

              {/* Risk/Reward Display */}
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Risk/Reward Ratio:</span>
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                    {riskReward || '1:0'}
                  </Badge>
                </div>
              </div>

              {/* Timeframe */}
              <div className="space-y-2">
                <Label className="text-gray-300">Timeframe</Label>
                <Select
                  value={watchedValues.timeframe}
                  onValueChange={(value) => form.setValue('timeframe', value as any)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {TIMEFRAMES.map((timeframe) => (
                      <SelectItem key={timeframe.value} value={timeframe.value} className="text-white hover:bg-gray-700">
                        <div>
                          <div className="font-medium">{timeframe.label}</div>
                          <div className="text-sm text-gray-400">{timeframe.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reasoning */}
              <div className="space-y-2">
                <Label htmlFor="reasoning" className="text-gray-300">Analysis & Reasoning</Label>
                <Textarea
                  id="reasoning"
                  placeholder="Explain why you're taking this trade. Include technical analysis, market conditions, risk factors, etc."
                  className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
                  {...form.register('reasoning')}
                />
                {form.formState.errors.reasoning && (
                  <p className="text-red-400 text-sm">{form.formState.errors.reasoning.message}</p>
                )}
              </div>

              {/* Chart Upload */}
              <div className="space-y-2">
                <Label htmlFor="chartImage" className="text-gray-300">Chart Screenshot (Optional)</Label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Upload chart image</p>
                  <Input
                    id="chartImage"
                    type="file"
                    accept="image/*"
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                    {...form.register('chartImage')}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gradient-red text-white hover:opacity-90"
              >
                {isSubmitting ? 'Posting Signal...' : 'Post Signal'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Telegram Preview
            </CardTitle>
            <CardDescription className="text-gray-400">
              How your signal will appear in Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-300">
              {formatTelegramMessage(watchedValues)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
