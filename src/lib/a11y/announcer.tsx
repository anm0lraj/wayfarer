import { useAnnouncerStore } from './announce'

/** Mount once near the root. Alternating the text forces repeat messages to be re-read. */
export function LiveRegion() {
  const { message, tick } = useAnnouncerStore()
  return (
    <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
      {message}
      {tick % 2 ? '​' : ''}
    </div>
  )
}
