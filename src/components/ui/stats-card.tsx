import { Card } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  trend?: string
  icon?: LucideIcon
  decorativeColor?: 'phoenix' | 'gold' | 'green' | 'blue'
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  decorativeColor = 'phoenix',
  className 
}: StatsCardProps) {
  const decorativeColors = {
    phoenix: 'bg-phoenix-500/5',
    gold: 'bg-gold-500/5',
    green: 'bg-green-500/5',
    blue: 'bg-blue-500/5',
  }

  return (
    <Card className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-br from-white to-gray-50",
      "dark:from-gray-900 dark:to-gray-950",
      "border border-gray-200/50 dark:border-gray-800/50",
      "rounded-2xl p-6",
      "transition-all duration-300",
      "hover:shadow-xl hover:-translate-y-0.5",
      className
    )}>
      {/* Decorative background */}
      <div className={cn(
        "absolute -right-6 -top-6 w-28 h-28 rounded-full blur-3xl pointer-events-none",
        decorativeColors[decorativeColor]
      )} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {title}
          </p>
          {Icon && (
            <Icon className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
          {value}
        </p>
        {trend && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {trend}
          </p>
        )}
      </div>
    </Card>
  )
}

