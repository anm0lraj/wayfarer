import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Renders `children` only once the spot is close to the screen. Used for heavy things below the fold (the map library is
 * a quarter of a megabyte of script) so they don't compete with what the visitor sees first. Where the browser cannot
 * tell (no IntersectionObserver, e.g. in tests) it renders at once. `fallback` holds the space, so nothing jumps.
 */
export function WhenVisible({ children, fallback, margin = '300px', className }: { children: ReactNode; fallback?: ReactNode; margin?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (seen || !ref.current) return
    const watcher = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setSeen(true) }, { rootMargin: margin })
    watcher.observe(ref.current)
    return () => watcher.disconnect()
  }, [seen, margin])

  return <div ref={ref} className={className}>{seen ? children : fallback}</div>
}
