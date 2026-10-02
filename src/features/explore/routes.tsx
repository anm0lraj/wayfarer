import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Calendar, Clock, Wallet } from 'lucide-react'
import { WeatherChip } from '@/components/domain/WeatherChip'
import { DestinationCard } from '@/components/domain/DestinationCard'
import { PublicTripCard } from '@/components/domain/PublicTripCard'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { PageHeader } from '@/components/layout/PageHeader'
import { CardRow, Section } from '@/components/layout/Section'
import { ScreenStub } from '@/components/layout/ScreenStub'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { SearchField } from '@/components/ui/Input'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useDestination, useDestinations, usePlaces, useSavedPlaceIds, useToggleSavedPlace } from '@/data/queries/catalog'
import { usePublicTrips } from '@/data/queries/community'
import { useForecast } from '@/data/queries/weather'
import { AddToTripSheet } from './components/AddToTripSheet'
import { PlaceCard } from './components/PlaceCard'
import { EXPLORE_CATEGORIES } from './categories'
import { addDays, dateInTimezone } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { shareLink } from '@/lib/share'
import { clock } from '@/services/clock/clock'
import type { DestinationCategory, Place } from '@/types'

export function Explore() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') as DestinationCategory | null
  const { data, isPending, isError, refetch } = useDestinations()

  const update = (next: { q?: string; category?: string | null }) => {
    const p = new URLSearchParams(params)
    if (next.q !== undefined) next.q ? p.set('q', next.q) : p.delete('q')
    if (next.category !== undefined) next.category ? p.set('category', next.category) : p.delete('category')
    setParams(p, { replace: true })
  }

  const term = q.trim().toLowerCase()
  const results = (data ?? []).filter(
    (d) => (!category || d.tags.includes(category)) && (!term || [d.name, d.country, d.region ?? ''].some((s) => s.toLowerCase().includes(term))),
  )

  return (
    <>
      <PageHeader title="Explore" description="Find your next trip" actions={<Button variant="secondary" asChild><Link to="/explore/itineraries">Traveller itineraries</Link></Button>} />
      <div className="space-y-4">
        <SearchField label="Search destinations" placeholder="Where do you want to go?" value={q} onChange={(e) => update({ q: e.target.value })} />
        <div role="group" aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {EXPLORE_CATEGORIES.map((c) => (
            <Chip key={c.id} className="shrink-0" selected={category === c.id} onClick={() => update({ category: category === c.id ? null : c.id })}>{c.label}</Chip>
          ))}
        </div>
      </div>

      <div className="mt-6" aria-live="polite">
        {isPending && (
          <SkeletonGroup label="Loading destinations" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/3]" />)}
          </SkeletonGroup>
        )}
        {isError && <ErrorState title="Couldn’t load destinations" onRetry={() => void refetch()} />}
        {data && results.length === 0 && (
          <EmptyState
            title={term ? `No destinations match “${q.trim()}”` : 'No destinations in this category yet'}
            description="Try a different spelling or clear your filters."
            action={<Button variant="secondary" onClick={() => update({ q: '', category: null })}>Clear filters</Button>}
          />
        )}
        {results.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((d) => <li key={d.id}><DestinationCard destination={d} /></li>)}
          </ul>
        )}
      </div>
    </>
  )
}

const REC_TABS: Array<{ id: string; label: string; match: (p: Place) => boolean }> = [
  { id: 'popular', label: 'Popular places', match: (p) => ['attraction', 'viewpoint', 'shop'].includes(p.kind) },
  { id: 'eat', label: 'Eat & drink', match: (p) => p.kind === 'restaurant' },
  { id: 'experiences', label: 'Experiences', match: (p) => p.kind === 'activity' },
  { id: 'hidden', label: 'Hidden gems', match: (p) => p.kind === 'hidden_gem' },
]

export function DestinationDetails() {
  const { destinationId } = useParams()
  const destination = useDestination(destinationId)
  const places = usePlaces(destinationId)
  const saved = useSavedPlaceIds()
  const toggleSaved = useToggleSavedPlace()
  const publicTrips = usePublicTrips(20)
  const [addTarget, setAddTarget] = useState<Place | null>(null)

  const d = destination.data
  const today = dateInTimezone(clock.now(), d?.timezone ?? 'UTC')
  const forecast = useForecast(d?.location, today, addDays(today, 4))

  if (destination.isPending) {
    return <SkeletonGroup label="Loading destination" className="space-y-4"><Skeleton className="aspect-[21/9] w-full" /><Skeleton className="h-8 w-1/2" /><Skeleton className="h-24 w-full" /></SkeletonGroup>
  }
  if (destination.isError) return <ErrorState title="Couldn’t load this destination" onRetry={() => void destination.refetch()} />
  if (!d) {
    return <EmptyState title="Destination not found" description="It may have been removed." action={<Button asChild><Link to="/explore">Back to Explore</Link></Button>} />
  }

  const cityItineraries = (publicTrips.data ?? []).filter((t) => t.destinationIds.includes(d.id))
  const grouped = REC_TABS.map((t) => ({ ...t, items: (places.data ?? []).filter(t.match) }))
  const firstTab = grouped.find((g) => g.items.length)?.id ?? 'popular'

  return (
    <div className="space-y-8">
      <section aria-label={d.name} className="relative -mx-4 overflow-hidden bg-surface-2 sm:mx-0 sm:rounded-lg">
        <img src={d.heroImage} alt="" className="aspect-[16/10] w-full object-cover sm:aspect-[21/8]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 text-white sm:p-6">
          <div>
            <p className="text-sm text-white/85">{[d.region, d.country].filter(Boolean).join(', ')}</p>
            <h1 className="text-3xl font-bold sm:text-4xl">{d.name}</h1>
          </div>
          <Button asChild size="lg"><Link to={`/trips/new/destination?destination=${d.id}`}>Plan a Trip</Link></Button>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="min-w-0 space-y-8 lg:col-span-8">
          <Section title="Overview"><p className="max-w-prose text-fg-muted">{d.overview}</p></Section>

          <Section title="Things to do" description="Save places you like, or add them straight to a trip">
            {places.isPending && <Skeleton className="h-64" />}
            {places.isError && <ErrorState onRetry={() => void places.refetch()} />}
            {places.data && places.data.length === 0 && (
              <EmptyState title="Recommendations are coming soon" description={`We’re still collecting places for ${d.name}. You can plan a trip now and add your own stops.`} />
            )}
            {places.data && places.data.length > 0 && (
              <Tabs defaultValue={firstTab}>
                <TabsList aria-label="Recommendation types">
                  {grouped.map((g) => <TabsTrigger key={g.id} value={g.id} disabled={!g.items.length}>{g.label}</TabsTrigger>)}
                </TabsList>
                {grouped.map((g) => (
                  <TabsContent key={g.id} value={g.id} className="pt-4">
                    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {g.items.map((p) => (
                        <li key={p.id}>
                          <PlaceCard
                            place={p}
                            saved={saved.data?.has(p.id) ?? false}
                            onSave={() => toggleSaved.mutate(p.id)}
                            onAdd={() => setAddTarget(p)}
                            onShare={() => void shareLink({ title: p.name, text: p.description, url: `${location.origin}/explore/${d.id}#place-${p.id}` })}
                          />
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </Section>

          {cityItineraries.length > 0 && (
            <Section title={`Itineraries for ${d.name}`} to="/explore/itineraries">
              <CardRow>{cityItineraries.map((t) => <li key={t.id}><PublicTripCard trip={t} /></li>)}</CardRow>
            </Section>
          )}
        </div>

        <aside className="min-w-0 space-y-6 lg:col-span-4">
          <section aria-label="At a glance" className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-lg font-semibold">At a glance</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-3"><Calendar aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" /><div><dt className="text-fg-muted">Best time to visit</dt><dd className="font-medium">{d.bestTimeToVisit}</dd></div></div>
              <div className="flex gap-3"><Wallet aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" /><div><dt className="text-fg-muted">Estimated budget</dt><dd className="font-medium">{formatMoney(d.estimatedDailyBudget)} per person, per day</dd></div></div>
              <div className="flex gap-3"><Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" /><div><dt className="text-fg-muted">Time zone</dt><dd className="font-medium">{d.timezone.replace('_', ' ')}</dd></div></div>
            </dl>
          </section>

          <section aria-label="Weather" className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Weather, next 5 days</h2>
            {forecast.isPending && <Skeleton className="h-16" />}
            {forecast.isError && <p className="text-sm text-fg-muted">Weather isn’t available right now.</p>}
            {forecast.data && (
              <ul className="grid grid-cols-5 gap-1 text-center text-xs">
                {forecast.data.map((f) => (
                  <li key={f.date} className="space-y-1 rounded-md bg-surface-2 py-2">
                    <p className="text-fg-muted">{new Date(f.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                    <WeatherChip condition={f.condition} tempC={f.highC} className="flex-col !gap-0.5 font-medium" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Travel tips" className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Travel tips</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-fg-muted">{d.travelTips.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
        </aside>
      </div>

      <AddToTripSheet place={addTarget} onClose={() => setAddTarget(null)} />
    </div>
  )
}

export function PublicFeed() {
  return <ScreenStub title="Public itineraries" phase={7} spec="spec §25" />
}
