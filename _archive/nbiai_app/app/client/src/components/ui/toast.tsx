import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitive.Provider

const toastVariants = cva(
  [
    'pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-md',
    'transition-all duration-150',
    'data-[state=open]:animate-slide-in-from-top',
    'data-[state=closed]:animate-fade-in',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-elevated border-default text-primary',
        success: 'bg-elevated border-[#22C55E33] text-primary',
        error: 'bg-elevated border-[#EF444433] text-primary',
        warning: 'bg-elevated border-[#F59E0B33] text-primary',
        info: 'bg-elevated border-accent-border text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const iconMap = {
  default: null,
  success: <CheckCircle className="size-4 text-status-green mt-0.5 shrink-0" />,
  error: <AlertCircle className="size-4 text-status-red mt-0.5 shrink-0" />,
  warning: <AlertTriangle className="size-4 text-status-amber mt-0.5 shrink-0" />,
  info: <Info className="size-4 text-accent mt-0.5 shrink-0" />,
} as const

interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {}

function Toast({ className, variant = 'default', children, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Root
      className={cn(toastVariants({ variant, className }))}
      {...props}
    >
      {iconMap[variant ?? 'default']}
      <div className="flex-1 min-w-0">{children}</div>
      <ToastPrimitive.Close className="shrink-0 text-muted hover:text-primary transition-colors">
        <X className="size-3.5" />
        <span className="sr-only">Close</span>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}

function ToastTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      className={cn('text-sm font-medium text-primary', className)}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      className={cn('text-xs text-secondary mt-0.5', className)}
      {...props}
    />
  )
}

function ToastViewport({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)]',
        className,
      )}
      {...props}
    />
  )
}

export {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastViewport,
  ToastPrimitive,
}
