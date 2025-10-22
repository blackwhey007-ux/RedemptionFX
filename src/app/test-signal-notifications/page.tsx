'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createSignal } from '@/lib/signalService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function TestSignalNotificationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: 'Test Signal',
    description: 'This is a test signal to check notifications',
    category: 'free' as 'free' | 'vip',
    pair: 'EUR/USD',
    type: 'BUY' as 'BUY' | 'SELL',
    entryPrice: '1.0850',
    stopLoss: '1.0800',
    takeProfit1: '1.0900'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const signalData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        pair: formData.pair,
        type: formData.type,
        entryPrice: parseFloat(formData.entryPrice),
        stopLoss: parseFloat(formData.stopLoss),
        takeProfit1: parseFloat(formData.takeProfit1),
        status: 'active' as const,
        postedAt: new Date(),
        createdBy: user.uid,
        createdByName: user.displayName || 'Admin'
      }

      await createSignal(signalData)
      toast.success('Test signal created! Check notifications.')
    } catch (error) {
      console.error('Error creating test signal:', error)
      toast.error('Failed to create test signal')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Test Signal Notifications</CardTitle>
            <CardDescription>Please sign in to test notifications</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-black dark:via-black dark:to-black p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Test Signal Notifications</CardTitle>
            <CardDescription>
              Create a test signal to check if sound and visual notifications work for VIP/Guest users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Signal Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: 'free' | 'vip') => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free Signal</SelectItem>
                      <SelectItem value="vip">VIP Signal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="pair">Pair</Label>
                  <Input
                    id="pair"
                    value={formData.pair}
                    onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'BUY' | 'SELL') => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="entryPrice">Entry Price</Label>
                  <Input
                    id="entryPrice"
                    type="number"
                    step="0.0001"
                    value={formData.entryPrice}
                    onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stopLoss">Stop Loss</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    step="0.0001"
                    value={formData.stopLoss}
                    onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="takeProfit1">Take Profit 1</Label>
                  <Input
                    id="takeProfit1"
                    type="number"
                    step="0.0001"
                    value={formData.takeProfit1}
                    onChange={(e) => setFormData({ ...formData, takeProfit1: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating Signal...' : 'Create Test Signal'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Testing Instructions:</h3>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>1. Open this page in two browser tabs/windows</li>
                <li>2. Sign in as admin in one tab, VIP/Guest in another</li>
                <li>3. Create a signal here (admin tab)</li>
                <li>4. Check if VIP/Guest tab gets sound + visual notification</li>
                <li>5. The notification bell should pulse and the badge should bounce</li>
              </ol>
            </div>

            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Sound Test:</h3>
              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                Test the notification sound directly:
              </p>
              <Button 
                onClick={() => {
                  // Test sound directly
                  try {
                    const audio = new Audio()
                    const sampleRate = 44100
                    const duration = 0.3
                    const frequency = 800
                    const samples = Math.floor(sampleRate * duration)
                    const buffer = new ArrayBuffer(44 + samples * 2)
                    const view = new DataView(buffer)
                    
                    // WAV header
                    const writeString = (offset: number, string: string) => {
                      for (let i = 0; i < string.length; i++) {
                        view.setUint8(offset + i, string.charCodeAt(i))
                      }
                    }
                    
                    writeString(0, 'RIFF')
                    view.setUint32(4, 36 + samples * 2, true)
                    writeString(8, 'WAVE')
                    writeString(12, 'fmt ')
                    view.setUint32(16, 16, true)
                    view.setUint16(20, 1, true)
                    view.setUint16(22, 1, true)
                    view.setUint32(24, sampleRate, true)
                    view.setUint32(28, sampleRate * 2, true)
                    view.setUint16(32, 2, true)
                    view.setUint16(34, 16, true)
                    writeString(36, 'data')
                    view.setUint32(40, samples * 2, true)
                    
                    // Generate sine wave
                    for (let i = 0; i < samples; i++) {
                      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3
                      view.setInt16(44 + i * 2, sample * 32767, true)
                    }
                    
                    const blob = new Blob([buffer], { type: 'audio/wav' })
                    const url = URL.createObjectURL(blob)
                    
                    audio.src = url
                    audio.volume = 0.5
                    audio.play().then(() => {
                      console.log('Sound played successfully!')
                      toast.success('Sound test successful!')
                    }).catch((error) => {
                      console.error('Sound play failed:', error)
                      toast.error('Sound test failed: ' + error.message)
                    })
                    
                    // Clean up
                    setTimeout(() => {
                      URL.revokeObjectURL(url)
                    }, 1000)
                  } catch (error) {
                    console.error('Sound generation failed:', error)
                    toast.error('Sound generation failed: ' + error.message)
                  }
                }}
                className="w-full"
              >
                🔊 Test Sound
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
