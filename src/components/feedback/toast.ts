import { create } from 'zustand'

/** How long a toast stays: a plain message, and one that offers an action such as Undo (more time to reach it). */
export const toastDuration = { plain: 6000, action: 10000 } as const

export interface ToastOptions {
  title: string
  description?: string
  /** Optional action, e.g. "Undo" after deleting an activity. */
  action?: { label: string; onClick: () => void }
  /** Defaults to toastDuration.plain, or .action with an action. The timer pauses while the toast is hovered or focused. */
  durationMs?: number
}

export interface ToastItem extends ToastOptions { id: number }

export const useToastStore = create<{ items: ToastItem[]; remove: (id: number) => void }>((set) => ({
  items: [],
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}))

let nextId = 1
/** Shows a toast. The Toaster's live region announces it (title, description and how to reach the action). */
export function toast(options: ToastOptions) {
  const id = nextId++
  useToastStore.setState((s) => ({ items: [...s.items, { ...options, id }] }))
  return id
}

/** Closes a toast early, e.g. when what its Undo would restore is gone. */
export function dismissToast(id: number) {
  useToastStore.getState().remove(id)
}
