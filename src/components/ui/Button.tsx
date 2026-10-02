import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors select-none disabled:pointer-events-none disabled:opacity-50 min-h-touch',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary/90',
        secondary: 'border border-border bg-surface text-fg hover:bg-surface-2',
        ghost: 'text-fg hover:bg-surface-2',
        danger: 'bg-error text-error-fg hover:bg-error/90',
      },
      size: { md: 'px-4 text-base', sm: 'px-3 text-sm', icon: 'min-w-touch px-0', lg: 'px-6 text-lg min-h-14' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, type, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} type={asChild ? undefined : (type ?? 'button')} className={cn(button({ variant, size }), className)} {...props} />
})
Button.displayName = 'Button'
