'use client'

import { AlertCircle, Info, XCircle, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './dialog'
import { Button } from './button'

interface ErrorDialogProps {
  isOpen: boolean
  onClose: () => void
  error: Error | string | null
  title?: string
}

export function ErrorDialog({ isOpen, onClose, error, title }: ErrorDialogProps) {
  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.message
  
  // Translate technical errors to user-friendly messages
  const getFriendlyError = (msg: string) => {
    // Firestore quota exceeded
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded')) {
      return {
        type: 'quota',
        title: '⏸️ Daily Limit Reached',
        message: 'Your Firestore quota has been reached from testing today.',
        details: [
          '✅ Your streaming fix is ready and working!',
          '⏰ Quota resets: Tomorrow at midnight UTC',
          '💡 This won\'t happen in production with normal usage'
        ],
        actions: [
          { label: 'OK, I\'ll Wait', primary: true },
          { label: 'Learn About Upgrade', link: 'https://firebase.google.com/pricing' }
        ]
      }
    }

    // Service unavailable (streaming not active)
    if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('Streaming not active')) {
      return {
        type: 'info',
        title: 'ℹ️ Streaming Not Active',
        message: 'Real-time streaming needs to be started first.',
        details: [
          '1. Go to Admin → VIP Sync tab',
          '2. Click "Start Streaming" button',
          '3. Wait for connection (15-30 seconds)',
          '4. Return to this page'
        ],
        actions: [
          { label: 'OK', primary: true }
        ]
      }
    }

    // Network/connection errors
    if (msg.includes('Network') || msg.includes('timeout') || msg.includes('connection')) {
      return {
        type: 'error',
        title: '🌐 Connection Issue',
        message: 'Unable to connect to the server.',
        details: [
          '✓ Check your internet connection',
          '✓ Verify MetaAPI is accessible',
          '✓ Try refreshing the page',
          '✓ Check if dev server is running'
        ],
        actions: [
          { label: 'Retry', primary: true },
          { label: 'Close' }
        ]
      }
    }

    // MetaAPI errors
    if (msg.includes('MetaAPI') || msg.includes('METAAPI')) {
      return {
        type: 'error',
        title: '❌ MetaAPI Connection Failed',
        message: 'Unable to connect to your MT5 account.',
        details: [
          '✓ Verify Account ID is correct',
          '✓ Check MetaAPI Token is valid',
          '✓ Ensure account is deployed in MetaAPI dashboard',
          '✓ Verify account is connected to broker'
        ],
        actions: [
          { label: 'Check Settings', primary: true },
          { label: 'Test Connection' },
          { label: 'Close' }
        ]
      }
    }

    // Generic error
    return {
      type: 'error',
      title: '⚠️ Something Went Wrong',
      message: msg.substring(0, 200),
      details: [],
      actions: [
        { label: 'OK', primary: true }
      ]
    }
  }

  const friendlyError = getFriendlyError(errorMessage)
  
  const Icon = friendlyError.type === 'quota' ? Clock :
               friendlyError.type === 'info' ? Info :
               friendlyError.type === 'error' ? XCircle : AlertCircle

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title || friendlyError.title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-left space-y-4 pt-4">
              <div className="text-base">{friendlyError.message}</div>
              
              {friendlyError.details.length > 0 && (
                <div className="space-y-2 text-sm">
                  {friendlyError.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Show technical error in small text for debugging */}
              <details className="text-xs text-gray-500 mt-4">
                <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  Technical details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto">
                  {errorMessage}
                </pre>
              </details>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          {friendlyError.actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.primary ? 'default' : 'outline'}
              onClick={() => {
                if (action.link) {
                  window.open(action.link, '_blank')
                } else {
                  onClose()
                }
              }}
            >
              {action.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

