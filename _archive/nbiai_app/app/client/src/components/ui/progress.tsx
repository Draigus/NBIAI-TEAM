import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

function getProgressColour(value: number): string {
  if (value >= 100) return 'bg-status-red'
  if (value >= 80) return 'bg-status-amber'
  return 'bg-status-green'
}

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number
}

function Progress({ className, value = 0, ...props }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100)

  return (
    <ProgressPrimitive.Root
      className={cn(
        'relative h-1.5 w-full overflow-hidden rounded-full bg-elevated',
        className,
      )}
      value={clamped}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full rounded-full transition-all duration-300 ease-out',
          getProgressColour(clamped),
        )}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
