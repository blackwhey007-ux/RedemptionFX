'use client'

import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProgressStep {
  id: string
  label: string
  description?: string
  estimatedTime?: string
}

interface ProgressStepsProps {
  steps: ProgressStep[]
  currentStep: number
  className?: string
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep
        const isPending = stepNumber > currentStep

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg transition-all",
              isCurrent && "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800",
              isCompleted && "opacity-75"
            )}
          >
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              isCompleted && "bg-green-500 text-white",
              isCurrent && "bg-blue-500 text-white",
              isPending && "bg-gray-200 dark:bg-gray-800 text-gray-500"
            )}>
              {isCompleted && <Check className="h-4 w-4" />}
              {isCurrent && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending && <span className="text-sm">{stepNumber}</span>}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={cn(
                  "font-medium",
                  isCompleted && "text-green-600 dark:text-green-400",
                  isCurrent && "text-blue-600 dark:text-blue-400",
                  isPending && "text-gray-500"
                )}>
                  {step.label}
                </p>
                {step.estimatedTime && isCurrent && (
                  <span className="text-xs text-gray-500">
                    {step.estimatedTime}
                  </span>
                )}
              </div>
              {step.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}




