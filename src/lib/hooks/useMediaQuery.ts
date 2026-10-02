import { useSyncExternalStore } from 'react'

/** Subscribes to a CSS media query. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

/**
 * True when there's room for itinerary and map side by side: desktop, or tablet in landscape.
 * (A phone held sideways is wide but short, so it needs a minimum height too.)
 */
export const useSplitView = () => useMediaQuery('(min-width: 1024px), (min-width: 640px) and (orientation: landscape) and (min-height: 500px)')
