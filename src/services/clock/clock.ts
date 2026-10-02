import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Demo-mode date simulator. When `simulatedNow` is set, every "now" in the app (trip state, countdowns,
 * live trip, notifications) uses it, so Upcoming/Live/Completed can be shown without waiting for real dates.
 */
interface ClockState {
  simulatedNow: string | null // ISO datetime
  setSimulatedNow: (iso: string | null) => void
}

export const useClockStore = create<ClockState>()(
  persist((set) => ({ simulatedNow: null, setSimulatedNow: (iso) => set({ simulatedNow: iso }) }), { name: 'demo-clock' }),
)

export const clock = {
  now(): Date {
    const sim = useClockStore.getState().simulatedNow
    return sim ? new Date(sim) : new Date()
  },
  isSimulated: () => useClockStore.getState().simulatedNow !== null,
}
