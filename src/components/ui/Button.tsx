import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/*
 * Filled buttons carry a little depth (an inner top highlight and a shadow in their own colour) and lift by a pixel
 * on hover; pressing pushes them back down. Hover only applies with a real pointer, and reduced motion keeps the
 * colour change but drops the movement.
 */
const button = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold select-none min-h-touch',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-out',
    'motion-safe:active:translate-y-px motion-safe:active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg shadow-primary hover:bg-primary/90 motion-safe:hover:-translate-y-px',
        secondary: 'border border-border-strong bg-surface text-fg shadow-sm hover:border-primary hover:text-primary',
        ghost: 'text-fg hover:bg-primary/10 hover:text-primary',
        danger: 'bg-error text-error-fg shadow-sm hover:bg-error/90',
      },
      size: { md: 'px-4 text-base', sm: 'px-3 text-sm', icon: 'min-w-touch px-0', lg: 'px-6 text-lg min-h-14 rounded-lg' },
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
