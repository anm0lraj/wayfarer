import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { SearchField } from '@/components/ui/Input'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useDestinations } from '@/data/queries/catalog'
import { usePublicDestinationIds, usePublicFeed } from '@/data/queries/publicTrips'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { PublicFeedCard } from './components/PublicFeedCard'

/** Columns: 1 on phone, 2 on tablet, 3 on desktop, 4 on wide desktop (spec §25). */
function useColumns() {
  const sm = useMediaQuery('(min-width: 640px)')
  const lg = useMediaQuery('(min-width: 1024px)')
  const xl = useMediaQuery('(min-width: 1536px)')
  return xl ? 4 : lg ? 3 : sm ? 2 : 1
}

const chunk = <T,>(list: T[], n: number): T[][] => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))

/** `/explore/itineraries` — other travellers’ published trips, with infinite scroll and a virtualised grid. */
export function PublicFeed() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const destinationId = params.get('destination') ?? undefined
  const [draft, setDraft] = useState(q)
  const feed = usePublicFeed({ q: q || undefined, destinationId })
  const destinations = useDestinations().data ?? []
  const withTrips = usePublicDestinationIds().data ?? []
  const cols = useColumns()
  const listRef = useRef<HTMLDivElement>(null)

  const set = (key: string, value: string | undefined) =>
    setParams((p) => { value ? p.set(key, value) : p.delete(key); return p }, { replace: true })

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => { if (draft !== q) set('q', draft.trim() || undefined) }, 300)
    return () => clearTimeout(id)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  const trips = useMemo(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data])
  const rows = useMemo(() => chunk(trips, cols), [trips, cols])
  const virtual = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 330,
    overscan: 3,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  })
  const items = virtual.getVirtualItems()
  const lastIndex = items[items.length - 1]?.index ?? -1
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed

  useEffect(() => {
    if (lastIndex >= rows.length - 1 && rows.length > 0 && hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [lastIndex, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <>
      <PageHeader title="Public itineraries" description="Trips other travellers have shared. Save one, or copy it and make it yours." />
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 max-w-xl">
        <SearchField label="Search itineraries" placeholder="Search by place, title or traveller" value={draft} onChange={(e) => setDraft(e.target.value)} />
      </form>
      <div role="group" aria-label="Filter by destination" className="mb-6 flex flex-wrap gap-2">
        <Chip selected={!destinationId} onClick={() => set('destination', undefined)}>All</Chip>
        {destinations.filter((d) => withTrips.includes(d.id)).map((d) => (
          <Chip key={d.id} selected={destinationId === d.id} onClick={() => set('destination', destinationId === d.id ? undefined : d.id)}>{d.name}</Chip>
        ))}
      </div>

      {feed.isPending && (
        <SkeletonGroup label="Loading itineraries" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/3]" />)}
        </SkeletonGroup>
      )}
      {feed.isError && <ErrorState title="Couldn’t load itineraries" onRetry={() => void feed.refetch()} />}
      {feed.isSuccess && trips.length === 0 && (
        q || destinationId ? (
          <EmptyState
            title="No itineraries match"
            description={q ? `Nothing for “${q}”. Try a different place or clear the filters.` : 'Nothing has been shared for that place yet. Try another, or clear the filter.'}
            action={<Button variant="secondary" onClick={() => { setDraft(''); setParams({}, { replace: true }) }}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            title="Nothing shared yet"
            description="When travellers publish their trips they show up here. Publish one of yours to be the first."
            action={<Button asChild variant="secondary"><Link to="/trips">Your trips</Link></Button>}
          />
        )
      )}

      {trips.length > 0 && (
        <div ref={listRef}>
          <p className="sr-only" role="status">{trips.length} itineraries loaded</p>
          <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
            {items.map((row) => (
              <div
                key={row.key}
                data-index={row.index}
                ref={virtual.measureElement}
                className="absolute left-0 top-0 grid w-full gap-4 pb-4"
                style={{ transform: `translateY(${row.start - virtual.options.scrollMargin}px)`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {rows[row.index]!.map((t) => <PublicFeedCard key={t.id} trip={t} />)}
              </div>
            ))}
          </div>
          <div className="flex justify-center py-6">
            {hasNextPage ? (
              <Button variant="secondary" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>{isFetchingNextPage ? 'Loading…' : 'Load more'}</Button>
            ) : (
              <p className="text-fg-muted">You’ve seen them all.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
