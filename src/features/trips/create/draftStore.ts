import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_DRAFT, type TripDraft } from './schema'

interface DraftState {
  draft: TripDraft
  setDraft: (draft: TripDraft) => void
  clear: () => void
}

/**
 * In-progress Create Trip answers. Persisted so a refresh or closed tab doesn't lose the user's input.
 * localStorage is fine here: it holds no secrets, only the user's own half-finished choices.
 */
export const useTripDraft = create<DraftState>()(
  persist(
    (set) => ({ draft: DEFAULT_DRAFT, setDraft: (draft) => set({ draft }), clear: () => set({ draft: DEFAULT_DRAFT }) }),
    { name: 'trip-draft', version: 1 },
  ),
)
