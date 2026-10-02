import { MapPin, Mic } from 'lucide-react'
import { useMediaUrl } from '@/data/queries/media'
import { Skeleton } from '@/components/ui/Skeleton'
import { useServices } from '@/services'
import type { Memory } from '@/types'

/** The content of one memory. Fixed aspect ratios for photos/video so the timeline doesn't jump as media loads. */
export function MemoryMedia({ memory, className = '' }: { memory: Memory; className?: string }) {
  const url = useMediaUrl(memory.mediaKey)
  const { maps } = useServices()
  const label = memory.caption ?? 'Photo'

  switch (memory.kind) {
    case 'photo':
      return url ? <img src={url} alt={label} loading="lazy" className={`aspect-[4/3] w-full object-cover ${className}`} /> : <Skeleton className={`aspect-[4/3] w-full ${className}`} />
    case 'video':
      return url ? <video src={url} controls preload="metadata" aria-label={memory.caption ?? 'Video'} className={`aspect-video w-full bg-black ${className}`} /> : <Skeleton className={`aspect-video w-full ${className}`} />
    case 'voice':
      return (
        <div className={`flex items-center gap-3 bg-surface-2 p-4 ${className}`}>
          <Mic aria-hidden className="size-6 shrink-0 text-fg-muted" />
          {url ? <audio src={url} controls preload="metadata" aria-label={memory.caption ?? 'Voice note'} className="w-full" /> : <Skeleton className="h-10 w-full" />}
        </div>
      )
    case 'text':
      return <blockquote className={`bg-surface-2 p-5 text-lg leading-relaxed ${className}`}>{memory.text}</blockquote>
    case 'location':
      return (
        <div className={`flex items-center gap-3 bg-surface-2 p-4 ${className}`}>
          <MapPin aria-hidden className="size-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-medium">{memory.text || 'A place I want to remember'}</p>
            {memory.point && (
              <a className="text-sm text-primary underline" href={maps.links.deepLink(memory.point, 'view', memory.text)} target="_blank" rel="noopener noreferrer">
                {memory.point.lat.toFixed(4)}, {memory.point.lng.toFixed(4)} — open in maps
              </a>
            )}
          </div>
        </div>
      )
  }
}
