import { Armchair, BedDouble, Camera, Compass, MapPin, Plane, ShoppingBag, Sunset, Umbrella, Utensils, type LucideIcon } from 'lucide-react'
import type { ItemCategory } from '@/types'

export const CATEGORY_META: Record<ItemCategory, { label: string; icon: LucideIcon; tone: string }> = {
  transport: { label: 'Transport', icon: Plane, tone: 'bg-slate-500/15 text-slate-600 dark:text-slate-300' },
  lodging: { label: 'Stay', icon: BedDouble, tone: 'bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  food: { label: 'Food', icon: Utensils, tone: 'bg-orange-500/15 text-orange-600 dark:text-orange-300' },
  sightseeing: { label: 'Sightseeing', icon: Camera, tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-300' },
  activity: { label: 'Activity', icon: Compass, tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
  beach: { label: 'Beach', icon: Umbrella, tone: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300' },
  shopping: { label: 'Shopping', icon: ShoppingBag, tone: 'bg-pink-500/15 text-pink-600 dark:text-pink-300' },
  sunset: { label: 'Sunset', icon: Sunset, tone: 'bg-rose-500/15 text-rose-600 dark:text-rose-300' },
  free_time: { label: 'Free time', icon: Armchair, tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  other: { label: 'Other', icon: MapPin, tone: 'bg-surface-2 text-fg-muted' },
}
