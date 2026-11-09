import { useState } from 'react'
import { cn } from '@/lib/cn'
import { responsiveImage } from '@/lib/photos/responsive'
import type { PlacePhotoCredit } from '@/types'
import type { ShownPhoto } from './useItemPhoto'

const link = 'font-medium text-fg underline underline-offset-2 hover:no-underline'

/** "Photo by Ana on Unsplash", both linked, as the provider asks; a licence (Commons) follows. */
export function PhotoCredit({ credit, className }: { credit: PlacePhotoCredit; className?: string }) {
  return (
    <p className={cn('text-xs text-fg-muted', className)}>
      Photo by{' '}
      <a className={link} href={credit.profileUrl ?? credit.photoUrl} target="_blank" rel="noopener">{credit.name}</a>
      {' '}on{' '}
      <a className={link} href={credit.providerUrl} target="_blank" rel="noopener">{credit.provider}</a>
      {credit.licence ? ` · ${credit.licence}` : null}
    </p>
  )
}

/**
 * A place photo with its credit underneath (never over the picture, so it stays readable on any photo). If the image
 * can't load (offline before it was cached), the generated illustration for `seed` takes its place and the credit goes.
 */
export function PlacePhotoFigure({ photo, seed, sizes = '(min-width: 640px) 28rem, 100vw', className }: { photo: ShownPhoto; seed: string; sizes?: string; className?: string }) {
  const [fallback, setFallback] = useState<string>()
  const onError = () => void import('@/lib/placeholder').then(({ placeholderImage }) => setFallback(placeholderImage(seed, '', [16, 9])))
  return (
    <figure className={cn('space-y-1.5', className)}>
      <img
        {...(fallback ? { src: fallback } : responsiveImage(photo.url, sizes))}
        alt={fallback ? '' : photo.alt}
        width={photo.width} height={photo.height}
        loading="lazy" decoding="async" onError={fallback ? undefined : onError}
        className="aspect-[16/9] w-full rounded-lg bg-surface-2 object-cover"
      />
      {photo.credit && !fallback && <figcaption><PhotoCredit credit={photo.credit} /></figcaption>}
    </figure>
  )
}
