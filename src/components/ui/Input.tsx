import { forwardRef, useId, type InputHTMLAttributes } from 'react'
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
      <label htmlFor={inputId} className={cn('text-sm font-semibold', hideLabel && 'sr-only')}>{label}</label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          'min-h-touch w-full rounded-md border bg-surface px-3.5 text-base text-fg shadow-sm transition-colors duration-fast placeholder:text-fg-muted hover:border-primary/70 focus-visible:border-primary',
          error ? 'border-error' : 'border-border-strong',
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

/** Rounded search input with a leading magnifier; the label is kept for screen readers only. */
export const SearchField = forwardRef<HTMLInputElement, Omit<InputProps, 'label'> & { label?: string }>(
  ({ label = 'Search', className, ...props }, ref) => (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-primary" />
      <Input ref={ref} type="search" label={label} hideLabel className={cn('rounded-full pl-11', className)} {...props} />
    </div>
  ),
)
SearchField.displayName = 'SearchField'
