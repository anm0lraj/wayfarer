import { MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMoney } from '@/lib/money'
import { stayTotal } from './filters'
import type { Hotel } from '@/types'

/** Image, name, rating, price/night, total for the stay, distance and a few amenities (spec §16). */
export function HotelCard({ hotel, nights, to, saved }: { hotel: Hotel; nights: number; to: string; saved?: boolean }) {
  return (
    <li>
      <article className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface sm:flex-row">
        <img src={hotel.images[0]} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover sm:aspect-auto sm:w-56 sm:shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">
                <Link to={to} className="after:absolute after:inset-0 hover:underline">{hotel.name}</Link>
              </h3>
              <p className="flex flex-wrap items-center gap-x-3 text-sm text-fg-muted">
                <span>{hotel.propertyType}</span>
                <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="size-3.5" />{hotel.distanceFromCenterKm} km from centre</span>
              </p>
            </div>
            <p className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
              <Star aria-hidden className="size-3.5 fill-current" />{hotel.rating.toFixed(1)}
              <span className="sr-only"> out of 5, {hotel.reviewCount} reviews</span>
              <span aria-hidden className="font-normal text-fg-muted">({hotel.reviewCount})</span>
            </p>
          </div>
          <p className="text-sm text-fg-muted">{hotel.amenities.slice(0, 4).join(' · ')}</p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
            {saved ? <span className="text-sm font-semibold text-success">Saved to trip</span> : <span />}
            <p className="text-right">
              <span className="text-lg font-bold">{formatMoney(hotel.pricePerNight)}</span><span className="text-sm text-fg-muted"> / night</span>
              <span className="block text-sm text-fg-muted">{formatMoney(stayTotal(hotel.pricePerNight, nights))} for {nights} night{nights === 1 ? '' : 's'}</span>
            </p>
          </div>
        </div>
      </article>
    </li>
  )
}
