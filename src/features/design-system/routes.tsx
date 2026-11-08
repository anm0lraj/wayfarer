import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Menu as MenuIcon, X } from 'lucide-react'
import { SearchField } from '@/components/ui/Input'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { SkipLink } from '@/components/layout/SkipLink'
import { announce } from '@/lib/a11y/announce'
import { cn } from '@/lib/cn'
import { installForcedStates } from './forcedStates'
import { navEntries, findExample, type NavEntry, type Section } from './registry'
import { ComponentPage, GuideView, Overview } from './pages'

/*
 * The design-system library at /_design (development builds only: the route is added under import.meta.env.DEV in
 * app/router.tsx, so none of this reaches the production bundle). Every preview renders the real components.
 */

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'foundations', label: 'Foundations' },
  { id: 'components', label: 'Components' },
  { id: 'patterns', label: 'Patterns' },
]

function matches(e: NavEntry, q: string) {
  const s = q.trim().toLowerCase()
  return !s || e.title.toLowerCase().includes(s) || e.id.includes(s) || (e.group ?? '').toLowerCase().includes(s)
}

function LibraryNav({ onNavigate, searchRef }: { onNavigate: () => void; searchRef: React.RefObject<HTMLInputElement> }) {
  const [query, setQuery] = useState('')
  const shown = navEntries.filter((e) => matches(e, query))
  return (
    <nav aria-label="Design system" className="space-y-5">
      <SearchField ref={searchRef} label="Filter the library" placeholder="Filter… (press /)" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p role="status" className="sr-only">{query ? `${shown.length} ${shown.length === 1 ? 'page' : 'pages'} match` : ''}</p>
      {shown.length === 0 && <p className="px-1 text-sm text-fg-muted">Nothing matches “{query}”.</p>}
      {SECTIONS.map((s) => {
        const entries = shown.filter((e) => e.section === s.id)
        if (!entries.length) return null
        const groups = [...new Set(entries.map((e) => e.group ?? ''))]
        return (
          <div key={s.id} className="space-y-1">
            <h2 className="px-3 text-xs font-bold uppercase tracking-wide text-fg-muted">{s.label}</h2>
            {groups.map((g) => (
              <div key={g || s.id}>
                {g && <h3 className="px-3 pb-0.5 pt-2 text-xs font-semibold text-fg-muted">{g}</h3>}
                <ul>
                  {entries.filter((e) => (e.group ?? '') === g).map((e) => (
                    <li key={e.path}>
                      <NavLink
                        to={e.path}
                        onClick={onNavigate}
                        className={({ isActive }) => cn(
                          'flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition-colors duration-fast',
                          isActive ? 'bg-primary text-primary-fg shadow-primary' : 'text-fg hover:bg-primary/10 hover:text-primary',
                        )}
                      >
                        {e.title}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      })}
    </nav>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const first = useRef(true)

  useEffect(() => installForcedStates(), [])
  // A new page: move focus to the content and say where we are (as RouteEffects does in the app).
  useEffect(() => {
    if (first.current) { first.current = false; return }
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
    const h1 = main.current?.querySelector('h1')?.textContent
    if (h1) announce(h1)
  }, [pathname])
  // "/" jumps to the filter, as in many docs sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key !== '/' || e.metaKey || e.ctrlKey || t.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      setOpen(true)
      requestAnimationFrame(() => search.current?.focus())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SkipLink />
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-3 pt-safe backdrop-blur sm:px-5">
        <button
          type="button"
          className="grid min-h-touch min-w-touch place-items-center rounded-md text-fg hover:bg-surface-2 lg:hidden"
          aria-expanded={open}
          aria-controls="ds-nav"
          aria-label={open ? 'Close contents' : 'Open contents'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X aria-hidden className="size-5" /> : <MenuIcon aria-hidden className="size-5" />}
        </button>
        <Link to="/_design" className="flex min-h-touch items-center gap-2 rounded-md text-primary">
          <img src="/icon.svg" alt="" className="size-8 rounded-md shadow-primary" />
          <span className="font-display text-lg font-extrabold tracking-tight">Wayfarer <span className="text-fg">Design System</span></span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Link to="/" className="hidden min-h-touch items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg sm:inline-flex">
            <ArrowLeft aria-hidden className="size-4" />Back to the app
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="mx-auto flex max-w-[90rem]">
        <aside
          id="ds-nav"
          className={cn(
            'w-72 shrink-0 overflow-y-auto border-r border-border bg-surface px-3 py-5',
            'fixed inset-y-0 left-0 top-14 z-20 lg:sticky lg:block lg:h-[calc(100dvh-3.5rem)]',
            open ? 'block shadow-lg' : 'hidden',
          )}
        >
          <LibraryNav onNavigate={() => setOpen(false)} searchRef={search} />
        </aside>
        <main ref={main} id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-24 pt-6 outline-none sm:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}

/** One example on its own, at a real viewport width (opened by the previews' Phone / Tablet / Desktop switch). */
function Frame() {
  const { scope = '', exampleId = '' } = useParams()
  const [params] = useSearchParams()
  const theme = params.get('theme') === 'dark' ? 'dark' : 'light'
  const example = useMemo(() => findExample(scope, exampleId), [scope, exampleId])
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => installForcedStates(), [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.title = `${example?.title ?? 'Example'} · frame`
  }, [theme, example])
  useEffect(() => {
    const el = root.current
    if (!el || window.parent === window) return
    const send = () => window.parent.postMessage({ dsFrameHeight: Math.ceil(el.getBoundingClientRect().height) }, location.origin)
    const ro = new ResizeObserver(send)
    ro.observe(el)
    send()
    return () => ro.disconnect()
  }, [])
  if (!example) return <p className="p-4">Unknown example.</p>
  return (
    <main ref={root} data-theme={theme} className="bg-bg p-4 text-fg">
      <h1 className="sr-only">{example.title}</h1>
      <div className={example.stack ? 'flex flex-col gap-6' : 'flex flex-wrap items-end gap-6'}>{example.render()}</div>
    </main>
  )
}

export function DesignSystem() {
  return (
    <Routes>
      <Route path="frame/:scope/:exampleId" element={<Frame />} />
      <Route path="*" element={
        <Shell>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="components/:id/*" element={<ComponentPage />} />
            <Route path="foundations/:id" element={<GuideView section="foundations" />} />
            <Route path="patterns/:id" element={<GuideView section="patterns" />} />
            <Route path="*" element={<Navigate to="/_design" replace />} />
          </Routes>
        </Shell>
      } />
    </Routes>
  )
}
