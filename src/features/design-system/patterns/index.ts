import type { GuidePage } from '../registry'
import { BookingsPage, examples as bookings } from './Bookings'
import { FormsPage, examples as forms } from './Forms'
import { LiveStatusPage, examples as live } from './LiveStatus'
import { OverlaysPage, examples as overlays } from './Overlays'
import { StatesPage, examples as states } from './States'
import { ToastsPage, examples as toasts } from './Toasts'

const raw = import.meta.glob<string>('./*.tsx', { eager: true, query: '?raw', import: 'default' })

export const patternPages: GuidePage[] = [
  { id: 'forms', title: 'Forms and validation', summary: 'React Hook Form + Zod, errors next to the field, focus on the first error, keep what was typed.', Page: FormsPage, examples: forms, raw: raw['./Forms.tsx'] },
  { id: 'states', title: 'Loading, empty, error, offline', summary: 'Every screen has all four; skeletons, not spinners.', Page: StatesPage, examples: states, raw: raw['./States.tsx'] },
  { id: 'overlays', title: 'Sheets and dialogs', summary: 'Which overlay for which job, per layout class.', Page: OverlaysPage, examples: overlays, raw: raw['./Overlays.tsx'] },
  { id: 'toasts', title: 'Toasts and Undo', summary: 'Act at once and offer Undo; optimistic edits roll back with a toast.', Page: ToastsPage, examples: toasts, raw: raw['./Toasts.tsx'] },
  { id: 'live-status', title: 'Live trip status', summary: 'Subtle orange for happening now; statuses and what is never inferred.', Page: LiveStatusPage, examples: live, raw: raw['./LiveStatus.tsx'] },
  { id: 'bookings', title: 'Booking labels', summary: 'Demo bookings say “Saved to trip — not booked”, always.', Page: BookingsPage, examples: bookings, raw: raw['./Bookings.tsx'] },
]
