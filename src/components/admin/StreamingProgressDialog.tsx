'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ProgressSteps, ProgressStep } from '@/components/ui/progress-steps'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

interface StreamingProgressDialogProps {
  isOpen: boolean
  currentStep: number
  onClose: () => void
  onCancel?: () => void
}

const STREAMING_STEPS: ProgressStep[] = [
  {
    id: 'connect',
    label: 'Connecting to MetaAPI',
    description: 'Establishing connection...',
    estimatedTime: '2-3s'
  },
  {
    id: 'deploy',
    label: 'Deploying Account',
    description: 'Preparing MT5 account...',
    estimatedTime: '3-5s'
  },
  {
    id: 'broker',
    label: 'Waiting for Broker Connection',
    description: 'Connecting to MT5 server... This may take a while',
    estimatedTime: '10-20s'
  },
  {
    id: 'websocket',
    label: 'Creating WebSocket Connection',
    description: 'Setting up real-time streaming...',
    estimatedTime: '2-3s'
  },
  {
    id: 'sync',
    label: 'Synchronizing Positions',
    description: 'Loading current positions from MT5...',
    estimatedTime: '3-5s'
  },
  {
    id: 'complete',
    label: 'Streaming Active!',
    description: 'Real-time monitoring is now active'
  }
]

export function StreamingProgressDialog({ 
  isOpen, 
  currentStep, 
  onClose,
  onCancel 
}: StreamingProgressDialogProps) {
  const isComplete = currentStep >= STREAMING_STEPS.length

  return (
    <Dialog open={isOpen} onOpenChange={isComplete ? onClose : undefined}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
            {isComplete ? 'Streaming Started!' : 'Starting Real-Time Streaming'}
          </DialogTitle>
          <DialogDescription className="text-left">
            {isComplete ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                Your MT5 positions will now be detected and sent to Telegram automatically!
              </span>
            ) : (
              <span>
                This process takes 15-30 seconds. Please wait while we connect to your MT5 account.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ProgressSteps steps={STREAMING_STEPS} currentStep={currentStep} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {isComplete ? (
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          ) : (
            <>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button variant="ghost" disabled>
                <span className="text-sm text-gray-500">
                  Estimated: {currentStep < 3 ? '10-25s' : '5-10s'} remaining
                </span>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


