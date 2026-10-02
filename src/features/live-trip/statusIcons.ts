import { Check, CircleDashed, Footprints, Play, SkipForward, type LucideIcon } from 'lucide-react'
import type { ItemStatus } from '@/types'

export const STATUS_ICON: Record<ItemStatus, LucideIcon> = {
  upcoming: CircleDashed, on_the_way: Footprints, in_progress: Play, completed: Check, skipped: SkipForward,
}
