import { Bookmark, Plus, Share2, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { Place } from '@/types'

interface PlaceCardProps {
  place: Place
  saved: boolean
  onSave: () => void
  onAdd: () => void
  onShare: () => void
}

/** Recommendation card with the spec §14 actions that exist in Phase 2: Save, Add to trip, Share. */
export function PlaceCard({ place, saved, onSave, onAdd, onShare }: PlaceCardProps) {
  const cost = place.costEstimate
  return (
    <article id={`place-${place.id}`} className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="relative aspect-[16/10] bg-surface-2">
        <img src={place.images[0]} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        <button
          type="button"
          onClick={onSave}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
          className="absolute right-2 top-2 grid min-h-touch min-w-touch place-items-center rounded-full bg-surface/95 text-fg shadow-sm backdrop-blur hover:bg-surface"
        >
          <Bookmark aria-hidden className={cn('size-5', saved && 'fill-primary text-primary')} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          <h3 className="text-base font-semibold leading-snug">{place.name}</h3>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-fg-muted">
            {place.rating && <span className="inline-flex items-center gap-1"><Star aria-hidden className="size-3.5 fill-current" />{place.rating.toFixed(1)}<span className="sr-only"> out of 5</span></span>}
            {place.typicalDurationMin && <span>{place.typicalDurationMin >= 60 ? `${+(place.typicalDurationMin / 60).toFixed(1)} h` : `${place.typicalDurationMin} min`}</span>}
            {cost && <span>{cost.amount === 0 ? 'Free' : formatMoney(cost)}</span>}
          </p>
        </div>
        <p className="line-clamp-3 text-sm text-fg-muted">{place.description}</p>
        <div className="mt-auto flex gap-2 pt-1">
          <Button size="sm" onClick={onAdd} className="flex-1"><Plus aria-hidden className="size-4" /> Add to trip</Button>
          <Button size="icon" variant="secondary" onClick={onShare} aria-label={`Share ${place.name}`}><Share2 aria-hidden className="size-4" /></Button>
        </div>
      </div>
    </article>
  )
}
