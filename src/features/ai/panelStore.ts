import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const PANEL_MIN = 320
export const PANEL_MAX = 640

interface PanelState {
  open: boolean
  width: number
  setOpen: (open: boolean) => void
  setWidth: (width: number) => void
}

/** The docked assistant panel on desktop: open/closed and its width are remembered. */
export const useAIPanel = create<PanelState>()(
  persist(
    (set) => ({
      open: false,
      width: 400,
      setOpen: (open) => set({ open }),
      setWidth: (width) => set({ width: Math.max(PANEL_MIN, Math.min(PANEL_MAX, Math.round(width))) }),
    }),
    { name: 'ai-panel' },
  ),
)
