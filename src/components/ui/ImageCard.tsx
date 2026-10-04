import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ImageCardProps {
  src: string
  alt: string
  title: string
  subtitle?: string
  badge?: ReactNode
  /** Fixed ratio reserves space, so images never cause layout shift. */
  ratio?: '16/9' | '4/3' | '3/4' | '1/1'
  className?: string
  /** The picture is in view when the page opens: load it at once instead of lazily (it is usually the largest thing on screen). */
  priority?: boolean
}

const ratios = { '16/9': 'aspect-[16/9]', '4/3': 'aspect-[4/3]', '3/4': 'aspect-[3/4]', '1/1': 'aspect-square' }

/** Large-image card with a text scrim for contrast. Wrap in a Link/button for interactivity. */
export function ImageCard({ src, alt, title, subtitle, badge, ratio = '4/3', className, priority }: ImageCardProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-surface-2', ratios[ratio], className)}>
      <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" className="size-full object-cover" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
      {badge && <div className="absolute left-3 top-3">{badge}</div>}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="text-lg font-semibold leading-tight">{title}</p>
        {subtitle && <p className="text-sm text-white/85">{subtitle}</p>}
      </div>
    </div>
  )
}
