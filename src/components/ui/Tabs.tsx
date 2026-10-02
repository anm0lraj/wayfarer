import * as RadixTabs from '@radix-ui/react-tabs'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { NavLink, type NavLinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'

const listClass = 'flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]'
const triggerClass =
  'inline-flex min-h-touch shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-4 text-base font-medium text-fg-muted transition-colors hover:text-fg data-[state=active]:border-primary data-[state=active]:text-fg'

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

/** Route-driven tab strip: each tab is a real link, so tabs are shareable URLs and back/forward just work. */
export function TabNav({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  return <nav aria-label={label} className={cn(listClass, className)}>{children}</nav>
}

export function TabLink({ className, ...props }: NavLinkProps) {
  return (
    <NavLink
      className={({ isActive }) => cn(triggerClass, isActive && 'border-primary text-fg', typeof className === 'string' && className)}
      {...props}
    />
  )
}
