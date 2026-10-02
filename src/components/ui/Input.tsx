import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  hideLabel?: boolean
}

/** Labelled input with hint/error wired to aria-describedby. */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, hideLabel, className, id, ...props }, ref) => {
  const auto = useId()
  const inputId = id ?? auto
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={cn('text-sm font-medium', hideLabel && 'sr-only')}>{label}</label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          'min-h-touch w-full rounded-md border bg-surface px-3 text-base text-fg placeholder:text-fg-muted',
          error ? 'border-error' : 'border-border',
          className,
        )}
        {...props}
      />
      {hint && !error && <p id={`${inputId}-hint`} className="text-sm text-fg-muted">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="text-sm text-error">{error}</p>}
    </div>
  )
})
Input.displayName = 'Input'

export const SearchField = forwardRef<HTMLInputElement, Omit<InputProps, 'label'> & { label?: string; trailing?: ReactNode }>(
  ({ label = 'Search', className, ...props }, ref) => (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-muted" />
      <Input ref={ref} type="search" label={label} hideLabel className={cn('pl-10', className)} {...props} />
    </div>
  ),
)
SearchField.displayName = 'SearchField'
