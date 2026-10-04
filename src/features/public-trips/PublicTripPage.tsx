import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, Clock, MapPin, Wallet } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { Badge, Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useSession } from '@/app/providers/session'
import { useDestination } from '@/data/queries/catalog'
import { useMediaUrl } from '@/data/queries/media'
import { usePublicTrip, useSignInGate } from '@/data/queries/publicTrips'
import { CATEGORY_META } from '@/features/itinerary/categoryMeta'
import { WhenVisible } from '@/components/layout/WhenVisible'
import { TripMap } from '@/features/map/TripMap'
import { useDocumentMeta } from '@/lib/hooks/useDocumentMeta'
import { formatMoney } from '@/lib/money'
import type { MapMarker } from '@/services/maps/types'
import type { GeoPoint, PublicTrip } from '@/types'
import { PublicTripActions } from './components/PublicTripActions'
import { UseItinerarySheet } from './components/UseItinerarySheet'

type Snapshot = PublicTrip['snapshot']

function Photo({ mediaUrl, caption }: { mediaUrl: string; caption?: string }) {
  const url = useMediaUrl(mediaUrl)
  return (
    <figure className="overflow-hidden rounded-lg bg-surface-2">
      {url ? <img src={url} alt={caption ?? 'Trip photo'} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <Skeleton className="aspect-[4/3] w-full" />}
      {caption && <figcaption className="px-3 py-2 text-sm text-fg-muted">{caption}</figcaption>}
    </figure>
  )
}

/** Where each snapshot item is, from its custom location or its place. */
function pointOf(snap: Snapshot, item: Snapshot['items'][number]): GeoPoint | undefined {
  return item.customLocation?.point ?? snap.places.find((p) => p.id === item.placeId)?.location
}

function markersFor(snap: Snapshot, dayNumber: number): { markers: MapMarker[]; route: GeoPoint[] } {
  const days = dayNumber === 0 ? snap.days : snap.days.filter((d) => d.dayNumber === dayNumber)
  let n = 0
  const markers: MapMarker[] = []
  for (const day of days) {
    for (const item of snap.items.filter((i) => i.dayId === day.id).sort((a, b) => a.position - b.position)) {
      const point = pointOf(snap, item)
      if (!point) continue
      n++
      markers.push({ id: item.id, point, label: String(dayNumber === 0 ? day.dayNumber : n), kind: 'itinerary', ariaLabel: `Day ${day.dayNumber}: ${item.title}` })
    }
  }
  return { markers, route: dayNumber === 0 ? [] : markers.map((m) => m.point) }
}

function DayList({ snap, onPick }: { snap: Snapshot; onPick: (dayNumber: number) => void }) {
  return (
    <div className="space-y-6">
      {snap.days.map((day) => {
        const items = snap.items.filter((i) => i.dayId === day.id).sort((a, b) => a.position - b.position)
        return (
          <section key={day.id} aria-labelledby={`day-${day.id}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 id={`day-${day.id}`} className="text-lg font-semibold">Day {day.dayNumber}{day.title ? ` — ${day.title}` : ''}</h3>
              <Button size="sm" variant="ghost" onClick={() => onPick(day.dayNumber)}><MapPin aria-hidden className="size-4" /> Show on map</Button>
            </div>
            <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {items.map((item) => {
                const meta = CATEGORY_META[item.category]
                return (
                  <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <span aria-hidden className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${meta.tone}`}><meta.icon className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="flex flex-wrap gap-x-3 text-sm text-fg-muted">
                        <span className="inline-flex items-center gap-1"><Clock aria-hidden className="size-3.5" />{item.startTime} · {item.durationMin} min</span>
                        {item.estimatedCost && item.estimatedCost.amount > 0 && <span>{formatMoney(item.estimatedCost)}</span>}
                      </p>
                      {item.description && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{item.description}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

function Loaded({ trip }: { trip: PublicTrip }) {
  const session = useSession()
  const gate = useSignInGate()
  const [params] = useSearchParams()
  const [useOpen, setUseOpen] = useState(false)
  const [mapDay, setMapDay] = useState(0)
  const dest = useDestination(trip.destinationIds[0]).data
  const snap = trip.snapshot
  const [low, high] = trip.budgetRange
  const map = useMemo(() => markersFor(snap, mapDay), [snap, mapDay])
  const center = map.markers[0]?.point ?? dest?.location ?? { lat: 0, lng: 0 }
  const isMine = !!session && session.user.id === trip.ownerId

  useDocumentMeta({ title: trip.title, description: trip.description, image: trip.coverImage, path: `/t/${trip.slug}` })
  useEffect(() => { if (params.get('use') === '1') gate(() => setUseOpen(true)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <article className="space-y-8">
      <div className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-xl">
        <img src={trip.coverImage} alt="" fetchPriority="high" className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]" />
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {dest && <Badge tone="primary"><MapPin aria-hidden className="size-3.5" />{dest.name}, {dest.country}</Badge>}
          <Badge>{trip.travelStyle}</Badge>
          {trip.visibility === 'link' && <Badge tone="warning">Unlisted — only people with the link</Badge>}
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl">{trip.title}</h1>
        <p className="text-fg-muted">by {trip.ownerName}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-lg">
          <li className="inline-flex items-center gap-2"><CalendarDays aria-hidden className="size-5 text-fg-muted" />{trip.durationDays} days</li>
          {high.amount > 0 && <li className="inline-flex items-center gap-2"><Wallet aria-hidden className="size-5 text-fg-muted" />About {formatMoney(low)}–{formatMoney(high)}</li>}
        </ul>
        <p className="max-w-3xl text-lg">{trip.description}</p>
        {isMine && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm">This is your published trip. {trip.tripId && <Link className="font-medium text-primary underline" to={`/trips/${trip.tripId}/share`}>Manage sharing</Link>}</p>}
        <PublicTripActions trip={trip} onUse={() => setUseOpen(true)} />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
        <section aria-labelledby="itin-h" className="space-y-4">
          <h2 id="itin-h" className="text-2xl font-semibold">Day by day</h2>
          <DayList snap={snap} onPick={(n) => { setMapDay(n); document.getElementById('trip-map')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }) }} />
        </section>

        <aside className="space-y-6 lg:sticky lg:top-4">
          <section id="trip-map" aria-labelledby="map-h" className="space-y-2">
            <h2 id="map-h" className="text-xl font-semibold">Map</h2>
            <div role="group" aria-label="Map days" className="flex flex-wrap gap-2">
              <Chip selected={mapDay === 0} onClick={() => setMapDay(0)}>All days</Chip>
              {snap.days.map((d) => <Chip key={d.id} selected={mapDay === d.dayNumber} onClick={() => setMapDay(d.dayNumber)}>Day {d.dayNumber}</Chip>)}
            </div>
            <div className="relative h-72 overflow-hidden rounded-lg border border-border lg:h-80">
              {/* Below the fold: the map library loads when the visitor scrolls near it, not while the cover is still arriving. */}
              <WhenVisible className="absolute inset-0" fallback={<Skeleton className="size-full" />}>
                <TripMap className="absolute inset-0" markers={map.markers} route={map.route} fallbackCenter={center} fitKey={`${trip.id}-${mapDay}`} />
              </WhenVisible>
            </div>
          </section>

          {trip.tips.length > 0 && (
            <section aria-labelledby="tips-h">
              <h2 id="tips-h" className="mb-2 text-xl font-semibold">Tips from {trip.ownerName.split(' ')[0]}</h2>
              <ul className="list-disc space-y-1 pl-5 text-fg-muted">{trip.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          )}

          <section aria-labelledby="places-h">
            <h2 id="places-h" className="mb-2 text-xl font-semibold">Places visited</h2>
            <ul className="flex flex-wrap gap-2">{snap.places.map((p) => <li key={p.id}><Badge>{p.name}</Badge></li>)}</ul>
          </section>
        </aside>
      </div>

      {snap.memories.length > 0 && (
        <section aria-labelledby="photos-h" className="space-y-3">
          <h2 id="photos-h" className="text-2xl font-semibold">Photos & memories</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{snap.memories.map((m) => <Photo key={m.id} mediaUrl={m.mediaUrl} caption={m.caption} />)}</div>
        </section>
      )}

      <UseItinerarySheet trip={trip} open={useOpen} onOpenChange={setUseOpen} />
    </article>
  )
}

/** `/t/:publicSlug` — a published trip, readable without signing in (spec §24). */
export function PublicTripPage() {
  const { publicSlug } = useParams()
  const q = usePublicTrip(publicSlug)

  if (q.isPending) {
    return (
      <SkeletonGroup label="Loading trip" className="space-y-4">
        <Skeleton className="aspect-[21/9] w-full" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-24 w-full" />
      </SkeletonGroup>
    )
  }
  if (q.isError) return <ErrorState as="h1" title="Couldn’t load this trip" onRetry={() => void q.refetch()} />
  if (!q.data) {
    return (
      <EmptyState as="h1"
        title="This itinerary isn’t available"
        description="It may have been unpublished, or the link is wrong."
        action={<Button asChild><Link to="/explore/itineraries">Browse itineraries</Link></Button>}
      />
    )
  }
  return <Loaded trip={q.data} />
}
