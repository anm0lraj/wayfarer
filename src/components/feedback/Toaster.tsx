import * as Toast from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { toastDuration, useToastStore } from './toast'

/**
 * Draws the toasts. Placement follows the shell (`--toast-left` / `--toast-bottom`, set from `data-shell` on <html> in
 * globals.css): phone above the bottom nav and the home indicator, tablet beside the rail, desktop bottom-left of the
 * content so it never covers the docked assistant panel on the right. Toasts never take focus; F8 moves focus to them.
 */
export function Toaster() {
  const { items, remove } = useToastStore()
  return (
    <Toast.Provider swipeDirection="down" duration={toastDuration.plain}>
      {items.map((t) => (
        <Toast.Root
          key={t.id}
          type="background"
          duration={t.durationMs ?? (t.action ? toastDuration.action : toastDuration.plain)}
          onOpenChange={(open) => !open && remove(t.id)}
          className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-surface py-2 pl-4 pr-2 text-fg shadow-lg"
        >
          <div className="min-w-0 flex-1 py-1">
            <Toast.Title className="font-semibold leading-snug">{t.title}</Toast.Title>
            {t.description && <Toast.Description className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{t.description}</Toast.Description>}
          </div>
          {t.action && (
            <Toast.Action altText={`Press F8 to reach ${t.action.label}`} asChild>
              <button type="button" onClick={t.action.onClick} className="min-h-touch shrink-0 rounded-md px-3 font-bold text-primary hover:bg-primary/10">
                {t.action.label}
              </button>
            </Toast.Action>
          )}
          <Toast.Close aria-label="Dismiss" className="grid min-h-touch min-w-touch shrink-0 place-items-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X aria-hidden className="size-4" />
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="pointer-events-none fixed bottom-0 left-[var(--toast-left)] right-0 z-[60] mx-auto flex max-w-md flex-col gap-2 px-[max(1rem,var(--safe-right))] pb-[var(--toast-bottom)] pt-2 sm:px-6 lg:mx-0 lg:max-w-sm lg:px-8" />
    </Toast.Provider>
  )
}
