import { create } from 'zustand'
import { announce } from '@/lib/a11y/announce'

export interface ToastOptions {
  title: string
  description?: string
  /** Optional action, e.g. "Undo" after deleting an activity. */
  action?: { label: string; onClick: () => void }
  durationMs?: number
}

export interface ToastItem extends ToastOptions { id: number }

export const useToastStore = create<{ items: ToastItem[]; remove: (id: number) => void }>((set) => ({
  items: [],
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}))

let nextId = 1
export function toast(options: ToastOptions) {
  const id = nextId++
  useToastStore.setState((s) => ({ items: [...s.items, { ...options, id }] }))
  announce(options.title)
  return id
}
