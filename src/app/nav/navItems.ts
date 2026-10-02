import { Bot, Compass, Home, Luggage, Radio, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** True for "/" so it doesn't match every route. */
  end?: boolean
  live?: boolean
}

export const primaryNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/trips', label: 'Trips', icon: Luggage },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/ai', label: 'AI', icon: Bot },
  { to: '/profile', label: 'Profile', icon: User },
]

/** Prominent entry shown only while a trip is Active. */
export const liveNavItem = (tripId: string): NavItem => ({ to: `/trips/${tripId}/live`, label: 'Live', icon: Radio, live: true })
