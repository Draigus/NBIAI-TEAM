import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest border',
  {
    variants: {
      variant: {
        default:
          'bg-elevated border-default text-muted',
        success:
          'bg-[#22C55E1A] border-[#22C55E33] text-status-green',
        warning:
          'bg-[#F59E0B1A] border-[#F59E0B33] text-status-amber',
        error:
          'bg-[#EF44441A] border-[#EF444433] text-status-red',
        info:
          'bg-accent-muted border-accent-border text-accent',
        outline:
          'bg-transparent border-default text-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      />
    )
  },
)

Badge.displayName = 'Badge'

export { Badge, badgeVariants }
