import * as Toast from '@radix-ui/react-toast'
import { useToastStore } from './toast'

export function Toaster() {
  const { items, remove } = useToastStore()
  return (
    <Toast.Provider swipeDirection="down" duration={6000}>
      {items.map((t) => (
        <Toast.Root
          key={t.id}
          duration={t.durationMs}
          onOpenChange={(open) => !open && remove(t.id)}
          className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 pr-2 text-fg shadow-lg"
        >
          <div className="min-w-0 flex-1">
            <Toast.Title className="font-semibold">{t.title}</Toast.Title>
            {t.description && <Toast.Description className="text-sm text-fg-muted">{t.description}</Toast.Description>}
          </div>
          {t.action && (
            <Toast.Action altText={t.action.label} asChild>
              <button type="button" onClick={t.action.onClick} className="min-h-touch rounded-md px-3 font-semibold text-primary hover:bg-surface-2">
                {t.action.label}
              </button>
            </Toast.Action>
          )}
          <Toast.Close aria-label="Dismiss" className="min-h-touch min-w-touch rounded-md text-fg-muted hover:bg-surface-2">×</Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-full max-w-md flex-col gap-2 p-4 pb-[calc(var(--nav-h)+var(--safe-bottom)+0.5rem)] outline-none sm:pb-4 lg:left-auto lg:right-0 lg:mx-0" />
    </Toast.Provider>
  )
}
