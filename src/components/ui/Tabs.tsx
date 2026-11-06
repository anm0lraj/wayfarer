import * as RadixTabs from '@radix-ui/react-tabs'
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react'
import { NavLink, useLocation, type NavLinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'

const listClass = 'relative flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
const triggerClass =
  'inline-flex min-h-touch shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-4 text-base font-medium text-fg-muted transition-colors hover:text-fg data-[state=active]:border-primary data-[state=active]:text-fg'
// Route tabs on phones: smaller type and padding, sharing the width, so the five trip tabs fit a 390px screen.
const phoneLinkClass = 'flex-1 justify-center px-2 text-sm sm:flex-none sm:justify-start sm:px-4 sm:text-base'

/** In-page tabs (state-based). For URL-reflected tabs use `TabLink`. */
export const Tabs = RadixTabs.Root
export const TabsContent = RadixTabs.Content
export const TabsList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixTabs.List>>(({ className, ...p }, ref) => (
  <RadixTabs.List ref={ref} className={cn(listClass, className)} {...p} />
))
TabsList.displayName = 'TabsList'
export const TabsTrigger = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof RadixTabs.Trigger>>(({ className, ...p }, ref) => (
  <RadixTabs.Trigger ref={ref} className={cn(triggerClass, className)} {...p} />
))
TabsTrigger.displayName = 'TabsTrigger'

/** Which edges of a horizontally scrolling strip hide more tabs. */
function useOverflowEdges() {
  const ref = useRef<HTMLElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })
  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = el.scrollLeft > 1
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])
  return { ref, edges, measure }
}

const fade = '24px'
function maskFor({ start, end }: { start: boolean; end: boolean }): string | undefined {
  if (!start && !end) return undefined
  return `linear-gradient(to right, ${start ? 'transparent' : '#000'}, #000 ${fade}, #000 calc(100% - ${fade}), ${end ? 'transparent' : '#000'})`
}

/**
 * Route-driven tab strip: each tab is a real link, so tabs are shareable URLs and back/forward just work.
 * When the tabs don't fit (narrow phones, large text) the strip scrolls: the hidden side fades out to show there is
 * more, and the current tab is always scrolled into view.
 */
export function TabNav({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  const { ref, edges, measure } = useOverflowEdges()
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    const el = ref.current
    const current = el?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!el || !current) return
    // Scroll only the strip (scrollIntoView could also move the page).
    const left = current.offsetLeft // the strip is `relative`, so this is measured from its left edge
    if (left < el.scrollLeft) el.scrollLeft = Math.max(0, left - 16)
    else if (left + current.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = left + current.offsetWidth - el.clientWidth + 16
    measure()
  }, [pathname, ref, measure])
  const mask = maskFor(edges)
  return (
    <nav
      ref={ref}
      aria-label={label}
      onScroll={measure}
      className={cn(listClass, 'gap-0 sm:gap-1', className)}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
    >
      {children}
    </nav>
  )
}

export function TabLink({ className, ...props }: NavLinkProps) {
  return (
    <NavLink
      className={({ isActive }) => cn(triggerClass, phoneLinkClass, isActive && 'border-primary text-fg', typeof className === 'string' && className)}
      {...props}
    />
  )
}
