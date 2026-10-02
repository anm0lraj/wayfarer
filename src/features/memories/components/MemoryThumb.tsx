import { FileText, MapPin, Mic, Video } from 'lucide-react'
import { useMediaUrl } from '@/data/queries/media'
import type { Memory } from '@/types'

const icons = { text: FileText, location: MapPin, voice: Mic, video: Video, photo: FileText } as const

/** Square preview of a memory for pickers. Photos show the photo; everything else shows its type. */
export function MemoryThumb({ memory, className = '' }: { memory: Memory; className?: string }) {
  const url = useMediaUrl(memory.kind === 'photo' ? memory.mediaKey : undefined)
  const Icon = icons[memory.kind]
  return url ? (
    <img src={url} alt="" className={`aspect-square object-cover ${className}`} />
  ) : (
    <span className={`grid aspect-square place-items-center bg-surface-2 text-fg-muted ${className}`}><Icon aria-hidden className="size-6" /></span>
  )
}
