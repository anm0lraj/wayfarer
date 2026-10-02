import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { useLayoutClass } from '@/lib/hooks/useLayoutClass'
import { cn } from '@/lib/cn'

export interface ResponsiveSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  /**
   * How it presents above the phone layout. Phone is always a bottom sheet.
   * 'panel' (default) → right side panel; 'dialog' → centred dialog (e.g. Create Trip).
   */
  wide?: 'panel' | 'dialog'
  /** Phone presentation: 'sheet' (default bottom sheet) or 'full' for multi-step flows like Create Trip. */
  phone?: 'sheet' | 'full'
}

/**
 * One API, three presentations: bottom sheet (phone), side panel (tablet/desktop) or centred dialog.
 * Built on Radix Dialog, so focus is trapped, Escape closes, and focus returns to the trigger.
 */
export function ResponsiveSheet({ open, onOpenChange, title, description, children, wide = 'panel', phone = 'sheet' }: ResponsiveSheetProps) {
  const layout = useLayoutClass()
  const placement = layout === 'phone' ? (phone === 'full' ? 'full' : 'bottom') : wide === 'dialog' ? 'center' : 'side'
  // The sheet is opened from external state (no Dialog.Trigger), so Radix has nothing to return focus to.
  // Remember whatever had focus when it opened and restore it on close.
  const opener = useRef<HTMLElement | null>(null)
  if (open && !opener.current && typeof document !== 'undefined') opener.current = document.activeElement as HTMLElement | null
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in" />
        <Dialog.Content
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            opener.current?.focus()
            opener.current = null
          }}
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-50 flex flex-col bg-surface text-fg shadow-lg outline-none',
            placement === 'bottom' && 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-lg pb-safe',
            placement === 'full' && 'inset-0 pb-safe pt-safe',
            placement === 'side' && 'inset-y-0 right-0 w-[26rem] max-w-full border-l border-border',
            placement === 'center' && 'left-1/2 top-1/2 max-h-[88dvh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg',
          )}
        >
          {placement === 'bottom' && <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border" />}
          <header className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
            <div>
              <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-sm text-fg-muted">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close"><X aria-hidden className="size-5" /></Button>
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
