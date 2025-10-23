import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from '@/shared/utils/cn'

const skeletonVariants = cva(
  "animate-pulse rounded-md bg-muted",
  {
    variants: {
      variant: {
        default: "bg-muted",
        card: "rounded-lg bg-card",
        text: "h-4 rounded",
        circle: "rounded-full",
        rectangle: "rounded-md",
        button: "h-10 rounded-md",
        input: "h-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Skeleton = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
})

Skeleton.displayName = "Skeleton"

// Skeleton específico para cards
const SkeletonCard = ({ className, ...props }) => (
  <div className={cn("p-6 space-y-4 bg-card rounded-lg border", className)} {...props}>
    <Skeleton variant="text" className="h-6 w-3/4" />
    <Skeleton variant="text" className="h-4 w-full" />
    <Skeleton variant="text" className="h-4 w-2/3" />
    <div className="flex space-x-2">
      <Skeleton variant="button" className="w-20" />
      <Skeleton variant="button" className="w-16" />
    </div>
  </div>
)

// Skeleton específico para listas
const SkeletonList = ({ items = 3, className, ...props }) => (
  <div className={cn("space-y-3", className)} {...props}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton variant="circle" className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="h-4 w-3/4" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
)

// Skeleton específico para tabelas
const SkeletonTable = ({ rows = 5, columns = 4, className, ...props }) => (
  <div className={cn("space-y-3", className)} {...props}>
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} variant="text" className="h-4 w-full" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" className="h-3 w-full" />
        ))}
      </div>
    ))}
  </div>
)

// Skeleton específico para formulários
const SkeletonForm = ({ fields = 3, className, ...props }) => (
  <div className={cn("space-y-6", className)} {...props}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton variant="text" className="h-4 w-1/4" />
        <Skeleton variant="input" className="w-full" />
      </div>
    ))}
    <div className="flex space-x-2">
      <Skeleton variant="button" className="w-24" />
      <Skeleton variant="button" className="w-20" />
    </div>
  </div>
)

// Skeleton específico para perfis/usuários
const SkeletonProfile = ({ className, ...props }) => (
  <div className={cn("flex items-center space-x-4 p-4", className)} {...props}>
    <Skeleton variant="circle" className="h-16 w-16" />
    <div className="space-y-2 flex-1">
      <Skeleton variant="text" className="h-5 w-1/3" />
      <Skeleton variant="text" className="h-4 w-1/2" />
      <Skeleton variant="text" className="h-3 w-1/4" />
    </div>
  </div>
)

// Skeleton específico para dashboard
const SkeletonDashboard = ({ className, ...props }) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6", className)} {...props}>
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

export {
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonForm,
  SkeletonProfile,
  SkeletonDashboard,
}
