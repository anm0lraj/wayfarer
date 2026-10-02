import { create } from 'zustand'

export const useAnnouncerStore = create<{ message: string; tick: number }>(() => ({ message: '', tick: 0 }))

/** Announce a status change to screen readers, e.g. announce('Activity marked completed'). */
export function announce(message: string) {
  useAnnouncerStore.setState((s) => ({ message, tick: s.tick + 1 }))
}
