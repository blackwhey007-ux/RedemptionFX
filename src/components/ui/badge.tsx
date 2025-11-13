import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        buy: `
          bg-green-50 dark:bg-green-950/30
          text-green-700 dark:text-green-400
          border-green-200 dark:border-green-800
        `,
        sell: `
          bg-red-50 dark:bg-red-950/30
          text-red-700 dark:text-red-400
          border-red-200 dark:border-red-800
        `,
        success: `
          bg-green-50 dark:bg-green-950/30
          text-green-700 dark:text-green-400
          border-green-200 dark:border-green-800
        `,
        warning: `
          bg-amber-50 dark:bg-amber-950/30
          text-amber-700 dark:text-amber-400
          border-amber-200 dark:border-amber-800
        `,
        info: `
          bg-blue-50 dark:bg-blue-950/30
          text-blue-700 dark:text-blue-400
          border-blue-200 dark:border-blue-800
        `,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
