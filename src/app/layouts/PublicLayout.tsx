import { Link, Outlet } from 'react-router-dom'
import { OfflineBanner } from '@/components/feedback/States'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

/**
 * Shell-less layout for pages visible without signing in (public trips, sign-in). Kept free of app-state
 * dependencies so these routes can later be server-rendered or pre-rendered for SEO and link previews.
 */
export function PublicLayout() {
  return (
    <div className="min-h-dvh">
      <OfflineBanner />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 pt-[calc(var(--safe-top)+0.75rem)]">
        <Link to="/" className="flex min-h-touch items-center gap-2 font-bold text-primary">
          <img src="/icon.svg" alt="" className="size-8 rounded-lg" /> Wayfarer
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link to="/explore" className="min-h-touch content-center rounded-md px-3 font-medium text-fg-muted hover:text-fg">Explore</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 pb-12 outline-none"><Outlet /></main>
    </div>
  )
}
