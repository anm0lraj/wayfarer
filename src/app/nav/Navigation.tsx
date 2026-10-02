import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { liveNavItem, primaryNav, type NavItem } from './navItems'
import { useActiveTrip } from '@/data/queries/trips'
import { cn } from '@/lib/cn'

function useNavItems(): NavItem[] {
  const active = useActiveTrip()
  return active ? [liveNavItem(active.id), ...primaryNav] : primaryNav
}

const liveDot = <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-error motion-safe:animate-pulse" />

/** Phone: fixed bottom bar (5 primary destinations + Live when a trip is active). */
export function BottomNav() {
  const items = useNavItems()
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-safe sm:hidden">
      <ul className="flex h-nav items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, end, live }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('relative flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium', isActive ? 'text-primary' : 'text-fg-muted', live && !isActive && 'text-error')
              }
            >
              <Icon aria-hidden className="size-6" />
              {label}
              {live && liveDot}
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
    <nav aria-label="Primary" className="fixed inset-y-0 left-0 z-30 hidden w-rail flex-col items-center gap-1 border-r border-border bg-surface py-4 pt-safe sm:flex lg:hidden">
      <Brand compact />
      <ul className="mt-4 flex flex-1 flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end, live }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('relative flex w-14 flex-col items-center gap-0.5 rounded-md py-2 text-xs font-medium', isActive ? 'bg-primary/15 text-primary' : 'text-fg-muted hover:bg-surface-2', live && !isActive && 'text-error')
              }
            >
              <Icon aria-hidden className="size-6" />
              {label}
              {live && liveDot}
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
                cn('relative flex min-h-touch items-center gap-3 rounded-md px-3 font-medium', collapsed && 'justify-center px-0', isActive ? 'bg-primary/15 text-primary' : 'text-fg-muted hover:bg-surface-2 hover:text-fg', live && !isActive && 'text-error')
              }
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              <span className={cn(collapsed && 'sr-only')}>{live ? 'Live Trip' : label}</span>
              {live && !collapsed && <span aria-hidden className="ml-auto size-2 rounded-full bg-error motion-safe:animate-pulse" />}
            </NavLink>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="flex min-h-touch items-center gap-3 rounded-md px-3 text-fg-muted hover:bg-surface-2"
      >
        {collapsed ? <PanelLeftOpen aria-hidden className="mx-auto size-5" /> : <><PanelLeftClose aria-hidden className="size-5" /><span>Collapse</span></>}
      </button>
    </nav>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-bold text-primary">
      <img src="/icon.svg" alt="" className="size-8 rounded-lg" />
      {!compact && <span className="text-lg">Wayfarer</span>}
    </span>
  )
}
