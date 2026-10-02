import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { announce } from '@/lib/a11y/announce'
import { routeKey, titleFor } from './routeKey'
import { routeState } from './routeState'

/**
 * What a full page load does for free but a single-page app must do by hand (WCAG 2.4.2, 2.4.3, 4.1.3):
 * give the new page a title, move focus to the main content, and tell screen readers where they are.
 * Runs only when the *page* changes (not for sheets, days or filters) and never steals focus from an open dialog.
 * Pages that set their own title (public trips set Open Graph tags) are left alone.
 */
export function RouteEffects() {
  const { pathname } = useLocation()
  const key = routeKey(pathname)

  useEffect(() => {
    // Only the first page of the session is a "load". Moving between layouts (public → app → onboarding) mounts a
    // new copy of this component, so "was there a previous page" lives in shared state, not in the component.
    const first = routeState.lastKey === null
    let tries = 0
    // Lazy routes render after the navigation, so wait for the heading to exist.
    const timer = setInterval(() => {
      tries++
      const h1 = document.querySelector('main h1')?.textContent ?? null
      if (!h1 && tries < 8) return
      clearInterval(timer)
      // Recorded once handled, so a dev-mode double mount (StrictMode) still counts as the first load.
      routeState.lastKey = key
      if (!document.head.querySelector('meta[property="og:title"]')) {
        const title = titleFor(pathname, h1)
        document.title = title === 'Wayfarer' ? title : `${title} · Wayfarer`
      }
      if (first) return
      // Never pull focus away from a field the person has already started using, or from an open dialog.
      const typing = document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')
      if (!typing && !document.querySelector('[role="dialog"]')) document.getElementById('main')?.focus({ preventScroll: true })
      announce(h1 ?? 'Page loaded')
    }, 120)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a different *page* should re-run this
  }, [key])

  return null
}
