import { Check, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { toast } from '@/components/feedback/toast'
import { ErrorState } from '@/components/feedback/States'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useHotel, useRemoveBooking, useSaveBooking } from '@/data/queries/bookings'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { TripMap } from '@/features/map/TripMap'
import { formatDateRange, zonedIso } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/cn'
import { DemoBadge } from './BookingCard'
import { nightsBetween, parseHotelSearch, stayTotal, validStay } from './filters'
import type { Hotel } from '@/types'

function Gallery({ hotel }: { hotel: Hotel }) {
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)
  const n = hotel.images.length
  const go = (d: number) => setI((x) => (x + d + n) % n)
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen(true)} aria-label={`Open photo ${i + 1} of ${n} full size`} className="block w-full overflow-hidden rounded-lg">
        <img src={hotel.images[i]} alt={`${hotel.name}, photo ${i + 1} of ${n}`} className="aspect-[16/9] w-full object-cover" />
      </button>
      {n > 1 && (
        <ul className="flex gap-2" aria-label="Photos">
          {hotel.images.map((src, k) => (
            <li key={src}>
              <button type="button" aria-label={`Show photo ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} className={cn('overflow-hidden rounded-md border-2', k === i ? 'border-primary' : 'border-transparent')}>
                <img src={src} alt="" className="h-14 w-20 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={hotel.name} description={`Photo ${i + 1} of ${n}`} wide="dialog">
        <img src={hotel.images[i]} alt={`${hotel.name}, photo ${i + 1} of ${n}`} className="w-full rounded-md object-contain" />
        {n > 1 && (
          <div className="mt-3 flex justify-between">
            <Button variant="secondary" onClick={() => go(-1)}><ChevronLeft aria-hidden className="size-4" /> Previous</Button>
            <Button variant="secondary" onClick={() => go(1)}>Next <ChevronRight aria-hidden className="size-4" /></Button>
          </div>
        )}
      </ResponsiveSheet>
    </div>
  )
}

/** `/trips/:id/bookings/hotels/:hotelId` — photos, rooms, amenities, map and reviews, with an Add Hotel to Trip action. */
export function HotelDetails() {
  const trip = useOutletContext<TripWithState>()
  const { hotelId } = useParams()
  const [params] = useSearchParams()
  const hotel = useHotel(hotelId)
  const plan = useTripPlan(trip.id)
  const save = useSaveBooking()
  const remove = useRemoveBooking()
  const [roomId, setRoomId] = useState<string>()
  const back = `/trips/${trip.id}/bookings/hotels${params.toString() ? `?${params}` : ''}`

  if (hotel.isPending) return <SkeletonGroup label="Loading hotel" className="space-y-4"><Skeleton className="aspect-[16/9] w-full" /><Skeleton className="h-8 w-1/2" /><Skeleton className="h-32" /></SkeletonGroup>
  if (hotel.isError) return <ErrorState title="Couldn’t load this hotel" onRetry={() => void hotel.refetch()} />
  if (!hotel.data) return <ErrorState title="Hotel not found" action={<Link className="font-semibold text-primary underline" to={back}>Back to stays</Link>} />

  const h = hotel.data
  const stay = parseHotelSearch(params, trip)
  const stayOk = validStay(stay)
  const nights = stayOk ? nightsBetween(stay.checkIn, stay.checkOut) : 1
  const room = h.rooms.find((r) => r.id === (roomId ?? h.rooms[0]?.id)) ?? h.rooms[0]
  const perNight = room?.pricePerNight ?? h.pricePerNight
  const total = stayTotal(perNight, nights)
  const savedBooking = plan.data?.bookings.find((b) => b.type === 'hotel' && b.refId === h.id && b.status !== 'cancelled')

  const add = () =>
    save.mutate(
      {
        tripId: trip.id, type: 'hotel', refId: h.id, title: h.name, price: total,
        startAt: zonedIso(stay.checkIn, '14:00', trip.timezone), endAt: zonedIso(stay.checkOut, '11:00', trip.timezone),
        details: { checkIn: stay.checkIn, checkOut: stay.checkOut, nights, guests: stay.guests, roomId: room?.id, roomName: room?.name },
      },
      {
        onSuccess: (b) =>
          toast({ title: 'Saved to trip', description: `${h.name} — not booked`, action: { label: 'Undo', onClick: () => remove.mutate(b.id) } }),
        onError: (e) => toast({ title: 'Couldn’t save it', description: e instanceof Error ? e.message : undefined }),
      },
    )

  return (
    <div className="space-y-8">
      <Link to={back} className="inline-flex min-h-touch items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft aria-hidden className="size-4" /> All stays</Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <Gallery hotel={h} />
          <header>
            <h2 className="text-2xl font-bold">{h.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-fg-muted">
              <span>{h.propertyType}</span>
              <span className="inline-flex items-center gap-1"><Star aria-hidden className="size-4 fill-current text-warning" />{h.rating.toFixed(1)} ({h.reviewCount} reviews)</span>
              <span>{h.distanceFromCenterKm} km from centre</span>
            </p>
            <p className="mt-1 text-sm text-fg-muted">{h.address}</p>
          </header>

          <Section title="Rooms">
            <fieldset className="space-y-2">
              <legend className="sr-only">Choose a room</legend>
              {h.rooms.map((r) => (
                <label key={r.id} className={cn('flex min-h-touch cursor-pointer items-center gap-3 rounded-md border p-3', room?.id === r.id ? 'border-primary bg-primary/10' : 'border-border')}>
                  <input type="radio" name="room" className="size-4 accent-[rgb(var(--primary))]" checked={room?.id === r.id} onChange={() => setRoomId(r.id)} />
                  <span className="flex-1"><span className="block font-medium">{r.name}</span><span className="block text-sm text-fg-muted">Sleeps {r.sleeps}</span></span>
                  <span className="font-semibold">{formatMoney(r.pricePerNight)}<span className="text-sm font-normal text-fg-muted"> / night</span></span>
                </label>
              ))}
            </fieldset>
          </Section>

          <Section title="Amenities">
            <ul className="grid gap-2 sm:grid-cols-2">
              {h.amenities.map((a) => <li key={a} className="flex items-center gap-2"><Check aria-hidden className="size-4 text-success" />{a}</li>)}
            </ul>
          </Section>

          <Section title="Location">
            <TripMap className="h-56" markers={[{ id: h.id, point: h.location, kind: 'hotel', ariaLabel: h.name }]} fallbackCenter={h.location} fitKey={h.id} />
          </Section>

          <Section title="Reviews" description={`${h.rating.toFixed(1)} from ${h.reviewCount} guests`}>
            <ul className="space-y-3">
              {h.reviews.map((r) => (
                <li key={r.author + r.date} className="rounded-lg border border-border p-3">
                  <p className="flex items-center justify-between font-medium"><span>{r.author}</span><span className="text-sm text-fg-muted">{r.rating}/5</span></p>
                  <p className="mt-1 text-fg-muted">{r.text}</p>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside aria-label="Price and booking" className="self-start rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-20">
          <p><span className="text-2xl font-bold">{formatMoney(perNight)}</span><span className="text-fg-muted"> / night</span></p>
          <p className="mt-1 text-sm text-fg-muted">{stayOk ? `${formatDateRange(stay.checkIn, stay.checkOut)} · ${stay.guests} guest${stay.guests === 1 ? '' : 's'}` : 'Choose valid dates on the search page'}</p>
          <p className="mt-3 flex justify-between border-t border-border pt-3 font-semibold"><span>{nights} night{nights === 1 ? '' : 's'}</span><span>{formatMoney(total)}</span></p>
          <div className="mt-4 space-y-2">
            <DemoBadge />
            {savedBooking ? (
              <>
                <p role="status" className="font-semibold text-success">Saved to trip</p>
                <Button variant="secondary" className="w-full" disabled={remove.isPending} onClick={() => remove.mutate(savedBooking.id)}>Remove from trip</Button>
              </>
            ) : (
              <Button className="w-full" disabled={save.isPending || !stayOk} onClick={add}>Add hotel to trip</Button>
            )}
            <p className="text-xs text-fg-muted">This saves the stay to your plan. Nothing is reserved or charged.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
