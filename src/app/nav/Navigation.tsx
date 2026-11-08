import { NavLink, useMatch } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { liveNavItem, primaryNav, type NavItem } from './navItems'
import { useActiveTrip } from '@/data/queries/trips'
import { cn } from '@/lib/cn'

/**
 * Primary items, with Live Trip first while a trip is active. On the Live Trip page itself only Live is the current
 * item: `/trips` would otherwise also match `/trips/:id/live` and two items would read as "current page".
 */
function useNavItems(): NavItem[] {
  const active = useActiveTrip()
  const onLive = useMatch('/trips/:tripId/live') !== null
  const items = onLive ? primaryNav.map((item) => (item.to === '/trips' ? { ...item, end: true } : item)) : primaryNav
  return active ? [liveNavItem(active.id), ...items] : items
}

/*
 * Active states: phone and tablet put a blue pill behind the current icon; the desktop sidebar fills the whole row in
 * Electric Blue. Live Trip is always orange ("happening now"): a bright orange pill with dark ink around its icon and a
 * deep-orange label, so it stands out whichever page is open.
 */
const pill = 'grid h-8 w-14 place-items-center rounded-full transition-colors duration-fast'
const iconPill = (isActive: boolean, live?: boolean) =>
  cn(pill, live ? 'bg-accent text-accent-fg shadow-accent' : isActive ? 'bg-primary/[0.12] text-primary' : 'group-hover:bg-surface-2')
const navLabel = (isActive: boolean, live?: boolean) =>
  cn('text-xs', isActive || live ? 'font-bold' : 'font-medium', live ? 'text-secondary' : isActive ? 'text-primary' : 'text-fg-muted')

/** Phone: fixed bottom bar (5 primary destinations + Live when a trip is active). */
export function BottomNav() {
  const items = useNavItems()
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-safe shadow-[0_-4px_16px_-8px_rgb(26_60_160/0.15)] backdrop-blur sm:hidden">
      <ul className="flex h-nav items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, end, live }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink to={to} end={end} className="group flex h-full flex-col items-center justify-center gap-0.5 text-fg-muted">
              {({ isActive }) => (
                <>
                  <span className={iconPill(isActive, live)}><Icon aria-hidden className="size-5" strokeWidth={isActive || live ? 2.4 : 2} /></span>
                  <span className={navLabel(isActive, live)}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Tablet: left rail, icons with labels. */
export function NavRail() {
  const items = useNavItems()
  return (
    <nav aria-label="Primary" className="fixed inset-y-0 left-0 z-30 hidden w-rail flex-col items-center gap-1 border-r border-border bg-surface pb-4 pt-[calc(1rem+var(--safe-top))] sm:flex lg:hidden">
      <Brand compact />
      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {items.map(({ to, label, icon: Icon, end, live }) => (
          <li key={to}>
            <NavLink to={to} end={end} className="group flex w-16 flex-col items-center gap-1 py-1 text-fg-muted">
              {({ isActive }) => (
                <>
                  <span className={iconPill(isActive, live)}><Icon aria-hidden className="size-5" strokeWidth={isActive || live ? 2.4 : 2} /></span>
                  <span className={navLabel(isActive, live)}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Desktop: collapsible left sidebar. */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const items = useNavItems()
  return (
    <nav aria-label="Primary" className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col gap-1 border-r border-border bg-surface p-3 lg:flex', collapsed ? 'w-sidebar-c' : 'w-sidebar')}>
      <div className={cn('flex items-center py-2', collapsed ? 'justify-center' : 'px-2')}><Brand compact={collapsed} /></div>
      <ul className="mt-3 flex flex-1 flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end, live }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-touch items-center gap-3 rounded-md px-3 font-semibold transition-colors duration-fast',
                  collapsed && 'justify-center px-0',
                  live
                    ? isActive ? 'bg-accent text-accent-fg shadow-accent' : 'text-secondary hover:bg-accent/15'
                    : isActive ? 'bg-primary text-primary-fg shadow-primary' : 'text-fg-muted hover:bg-primary/10 hover:text-primary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon aria-hidden className="size-5 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                  <span className={cn(collapsed && 'sr-only')}>{live ? 'Live Trip' : label}</span>
                  {live && !isActive && <span aria-hidden className={cn('size-2.5 rounded-full bg-accent ring-2 ring-surface motion-safe:animate-pulse', collapsed ? 'absolute right-1.5 top-1.5' : 'ml-auto')} />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="flex min-h-touch items-center gap-3 rounded-md px-3 text-fg-muted hover:bg-surface-2 hover:text-fg"
      >
        {collapsed ? <PanelLeftOpen aria-hidden className="mx-auto size-5" /> : <><PanelLeftClose aria-hidden className="size-5" /><span>Collapse</span></>}
      </button>
    </nav>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2 text-primary">
      <img src="/icon.svg" alt="" className="size-9 rounded-md shadow-primary" />
      {!compact && <span className="font-display text-xl font-extrabold tracking-tight">Wayfarer</span>}
    </span>
  )
}
