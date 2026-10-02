import { Outlet } from 'react-router-dom'
import { BottomNav, NavRail, Sidebar } from '../nav/Navigation'
import { useSidebarCollapsed } from '../nav/useSidebarCollapsed'
import { AppHeader } from './AppHeader'
import { DemoClockBanner } from './DemoClockBanner'
import { OfflineBanner } from '@/components/feedback/States'
import { cn } from '@/lib/cn'

/**
 * Responsive shell. Phone: bottom nav. Tablet (640–1023): left rail. Desktop (≥1024): collapsible sidebar.
 * Only one navigation is visible at a time (the others are `display: none` via breakpoint classes).
 */
export function AppShell() {
  const [collapsed, toggle] = useSidebarCollapsed()
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only-focusable fixed left-2 top-2 z-[70] rounded-md bg-primary px-4 py-2 font-semibold text-primary-fg">
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <NavRail />
      <div className={cn('sm:pl-rail', collapsed ? 'lg:pl-sidebar-c' : 'lg:pl-sidebar')}>
        <OfflineBanner />
        <DemoClockBanner />
        <AppHeader />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl px-4 pb-[calc(var(--nav-h)+var(--safe-bottom)+1.5rem)] pt-5 outline-none sm:px-6 sm:pb-10 lg:px-8"
        >
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
