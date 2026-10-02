import type { ReactNode } from 'react'
import { LazyMotion, m, useReducedMotion } from 'framer-motion'
import { routeKey } from './routeKey'

// The animation engine loads after first paint, so it never delays the app.
const features = () => import('framer-motion').then((mod) => mod.domAnimation)

/** A short fade-and-rise when moving between pages. Skipped entirely for `prefers-reduced-motion`. */
export function PageTransition({ pathname, children }: { pathname: string; children: ReactNode }) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
  return (
    <LazyMotion features={features} strict>
      <m.div key={routeKey(pathname)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
        {children}
      </m.div>
    </LazyMotion>
  )
}
