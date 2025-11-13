'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MT5TradeHistory, updateTradeHistory } from '@/lib/mt5TradeHistoryService'
import { toast } from 'sonner'

interface EditTradeDialogProps {
  trade: MT5TradeHistory | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditTradeDialog({ trade, open, onOpenChange, onSuccess }: EditTradeDialogProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<MT5TradeHistory>>({})

  // Update form when trade changes
  const currentTrade = trade ? { ...trade, ...formData } : null

  const handleSave = async () => {
    if (!trade?.id) return
    
    try {
      setSaving(true)
      await updateTradeHistory(trade.id, formData)
      toast.success('Trade updated successfully')
      onSuccess()
      onOpenChange(false)
      setFormData({})
    } catch (error) {
      console.error('Error updating trade:', error)
      toast.error('Failed to update trade')
    } finally {
      setSaving(false)
    }
  }

  if (!currentTrade) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trade</DialogTitle>
          <DialogDescription>
            Manually edit trade data. Changes are saved to database.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label>Symbol</Label>
            <Input 
              value={formData.symbol ?? currentTrade.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            />
          </div>

          <div>
            <Label>Type</Label>
            <Select 
              value={formData.type ?? currentTrade.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as 'BUY' | 'SELL' })}
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
            <Label>Open Price</Label>
            <Input 
              type="number"
              step="0.00001"
              value={formData.openPrice ?? currentTrade.openPrice}
              onChange={(e) => setFormData({ ...formData, openPrice: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <Label>Close Price</Label>
            <Input 
              type="number"
              step="0.00001"
              value={formData.closePrice ?? currentTrade.closePrice}
              onChange={(e) => setFormData({ ...formData, closePrice: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <Label>Stop Loss</Label>
            <Input 
              type="number"
              step="0.00001"
              value={formData.stopLoss ?? currentTrade.stopLoss ?? ''}
              onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>

          <div>
            <Label>Take Profit</Label>
            <Input 
              type="number"
              step="0.00001"
              value={formData.takeProfit ?? currentTrade.takeProfit ?? ''}
              onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>

          <div>
            <Label>Profit ($)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.profit ?? currentTrade.profit}
              onChange={(e) => setFormData({ ...formData, profit: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <Label>Pips</Label>
            <Input 
              type="number"
              step="0.1"
              value={formData.pips ?? currentTrade.pips}
              onChange={(e) => setFormData({ ...formData, pips: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <Label>Volume</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.volume ?? currentTrade.volume}
              onChange={(e) => setFormData({ ...formData, volume: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <Label>Commission ($)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.commission ?? currentTrade.commission}
              onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <Label>Swap ($)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.swap ?? currentTrade.swap}
              onChange={(e) => setFormData({ ...formData, swap: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <Label>Closed By</Label>
            <Select 
              value={formData.closedBy ?? currentTrade.closedBy}
              onValueChange={(value) => setFormData({ ...formData, closedBy: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TP">Take Profit</SelectItem>
                <SelectItem value="SL">Stop Loss</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="UNKNOWN">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

