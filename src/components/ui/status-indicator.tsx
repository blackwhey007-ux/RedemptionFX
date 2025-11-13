import { cn } from "@/lib/utils"

interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'error'
  label?: string
  className?: string
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const colors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    error: 'bg-red-500',
  }
  
  const textColors = {
    active: 'text-green-600 dark:text-green-400',
    inactive: 'text-gray-600 dark:text-gray-400',
    error: 'text-red-600 dark:text-red-400',
  }
  
  const pingColors = {
    active: 'bg-green-400',
    inactive: 'bg-gray-400',
    error: 'bg-red-400',
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-3 w-3">
        {status === 'active' && (
          <span className={`
            animate-ping absolute inline-flex
            h-full w-full rounded-full
            ${pingColors[status]} opacity-75
          `} />
        )}
        <span className={`
          relative inline-flex rounded-full
          h-3 w-3 ${colors[status]}
        `} />
      </span>
      {label && (
        <span className={cn("text-sm font-medium", textColors[status])}>
          {label}
        </span>
      )}
    </div>
  )
}




