import { useSyncExternalStore } from 'react'

export type LayoutClass = 'phone' | 'tablet' | 'desktop'

// Breakpoints match tailwind.config.ts: phone < 640, tablet 640–1023, desktop ≥ 1024.
const TABLET = '(min-width: 640px)'
const DESKTOP = '(min-width: 1024px)'

function subscribe(cb: () => void) {
  const queries = [matchMedia(TABLET), matchMedia(DESKTOP)]
  queries.forEach((q) => q.addEventListener('change', cb))
  return () => queries.forEach((q) => q.removeEventListener('change', cb))
}

const snapshot = (): LayoutClass => (matchMedia(DESKTOP).matches ? 'desktop' : matchMedia(TABLET).matches ? 'tablet' : 'phone')

/**
 * Current layout class. Prefer CSS (Tailwind `sm:`/`lg:`) for pure styling; use this only when behaviour
 * differs — e.g. a bottom sheet on phone vs. a side panel on tablet/desktop.
 */
export function useLayoutClass(): LayoutClass {
  return useSyncExternalStore(subscribe, snapshot, () => 'phone')
}
