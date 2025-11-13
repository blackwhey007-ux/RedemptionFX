import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'card' | 'table' | 'text' | 'chart'
  count?: number
  rows?: number
  lines?: number
}

export function Skeleton({ 
  className,
  variant = 'default',
  count = 1,
  rows = 3,
  lines = 2
}: SkeletonProps) {
  if (variant === 'card' && count > 1) {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/4 animate-pulse" />
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/4 animate-pulse" />
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/4 animate-pulse" />
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/4 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse",
              i === lines - 1 ? "w-4/5" : "w-full"
            )}
          />
        ))}
      </div>
    )
  }

  if (variant === 'chart') {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-6 animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse",
        className
      )}
    />
  )
}




