import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, pointerWithin, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Map as MapIcon, MoreHorizontal, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useDestination } from '@/data/queries/catalog'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { GenerateItinerarySheet } from '@/features/ai/components/GenerateItinerarySheet'
import { RegenerateDaySheet } from '@/features/ai/components/RegenerateDaySheet'
import { TripMap } from '@/features/map/TripMap'
import { dayMarkers, useHotelMarkers, useItemPoints } from '@/features/map/useMapData'
import { announce } from '@/lib/a11y/announce'
import { useLayoutClass } from '@/lib/hooks/useLayoutClass'
import { useSplitView } from '@/lib/hooks/useMediaQuery'
import { useServices } from '@/services'
import type { ItineraryDay, ItineraryItem } from '@/types'
import { ActivitySheet } from './components/ActivitySheet'
import { AddActivitySheet } from './components/AddActivitySheet'
import { DayChips } from './components/DayChips'
import { ItemCardBody, SortableItemCard } from './components/ItemCard'
import { dayLoad, scheduleWarnings } from './schedule'
import { useItineraryActions } from './useItineraryActions'

/** What the URL under /trips/:id/itinerary/* asks for. */
function parseRest(rest: string | undefined): { dayNumber: number; add: boolean } | { itemId: string } | null {
  const r = (rest ?? '').replace(/\/$/, '')
  const day = /^day\/(\d+)(\/add)?$/.exec(r)
  if (day) return { dayNumber: Number(day[1]), add: !!day[2] }
  const item = /^items\/([^/]+)$/.exec(r)
  return item ? { itemId: item[1]! } : null
}

// Stable empties so memo dependencies don't change on every render while the plan loads.
const NO_DAYS: ItineraryDay[] = []
const NO_ITEMS: ItineraryItem[] = []

const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  return within.length ? within : closestCenter(args)
}

export function ItineraryView() {
  const trip = useOutletContext<TripWithState>()
  const params = useParams()
  const navigate = useNavigate()
  const { maps } = useServices()
  const layout = useLayoutClass()
  const split = useSplitView()
  const plan = useTripPlan(trip.id)
  const destination = useDestination(trip.destinationIds[0])
  const actions = useItineraryActions(trip.id)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>()
  const [stripOpen, setStripOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const parsed = parseRest(params['*'])
  const base = `/trips/${trip.id}/itinerary`

  const days = plan.data?.days ?? NO_DAYS
  const allItems = plan.data?.items ?? NO_ITEMS
  const detailItem = parsed && 'itemId' in parsed ? allItems.find((i) => i.id === parsed.itemId) : undefined
  const day = parsed ? ('itemId' in parsed ? days.find((d) => d.id === detailItem?.dayId) : days.find((d) => d.dayNumber === parsed.dayNumber)) : undefined
  const items = useMemo(() => (day ? allItems.filter((i) => i.dayId === day.id).sort((a, b) => a.position - b.position) : []), [allItems, day])

  const points = useItemPoints(items)
  const hotelMarkers = useHotelMarkers(plan.data?.bookings ?? [])
  const markers = useMemo(() => [...dayMarkers(items, points), ...hotelMarkers], [items, points, hotelMarkers])
  const route = useMemo(() => dayMarkers(items, points).map((m) => m.point), [items, points])
  const warnings = useMemo(() => scheduleWarnings(items), [items])
  const load = dayLoad(items)
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of allItems) m.set(i.dayId, (m.get(i.dayId) ?? 0) + 1)
    return m
  }, [allItems])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const currentSelected = detailItem?.id ?? selectedId
  useEffect(() => {
    if (currentSelected) document.getElementById(`item-${currentSelected}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentSelected])

  if (!parsed) return <Navigate to={`${base}/day/1`} replace />
  if (plan.isPending) return <SkeletonGroup label="Loading itinerary" className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-20" /><Skeleton className="h-20" /></SkeletonGroup>
  if (plan.isError) return <ErrorState title="Couldn’t load the itinerary" onRetry={() => void plan.refetch()} />
  if (!day) {
    return 'itemId' in parsed
      ? <EmptyState title="We can’t find that activity" description="It may have been deleted." action={<Button asChild><Link to={`${base}/day/1`}>Back to the itinerary</Link></Button>} />
      : <Navigate to={`${base}/day/1`} replace />
  }

  const dayPath = `${base}/day/${day.dayNumber}`
  const openItem = (i: ItineraryItem) => navigate(`${base}/items/${i.id}`)
  const move = (item: ItineraryItem, by: -1 | 1) => {
    const from = items.findIndex((i) => i.id === item.id)
    const to = from + by
    if (to < 0 || to >= items.length) return
    void actions.reorder(day.id, arrayMove(items, from, to).map((i) => i.id))
    announce(`Moved ${item.title} ${by < 0 ? 'up' : 'down'}. Position ${to + 1} of ${items.length}.`)
  }
  const dateLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const dragged = allItems.find((i) => i.id === activeId)
  const dayItemsEmpty = items.length === 0
  const tripEmpty = allItems.length === 0

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const item = allItems.find((i) => i.id === active.id)
    if (!item) return
    const overId = String(over.id)
    if (overId.startsWith('day:')) {
      const target = days.find((d) => `day:${d.id}` === overId)
      if (target && target.id !== item.dayId) void actions.moveToDay(item, target.id, target.dayNumber)
      return
    }
    const overItem = items.find((i) => i.id === overId)
    if (!overItem || overItem.id === item.id || overItem.dayId !== item.dayId) return
    const from = items.findIndex((i) => i.id === item.id)
    const to = items.findIndex((i) => i.id === overItem.id)
    void actions.reorder(day.id, arrayMove(items, from, to).map((i) => i.id))
    announce(`Moved ${item.title} to position ${to + 1} of ${items.length}.`)
  }

  const mapPane = (className: string) => (
    <TripMap
      className={className} markers={markers} route={route} selectedId={currentSelected} onSelect={setSelectedId} fitKey={day.id}
      fallbackCenter={destination.data?.location ?? { lat: 0, lng: 0 }}
    />
  )

  const list = (
    <div className="min-w-0 space-y-4">
      <DndContext
        sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}
        accessibility={{
          screenReaderInstructions: { draggable: 'To pick up an activity, press space. Use the arrow keys to move it, space to drop it, or escape to cancel. You can also use the actions menu.' },
          announcements: {
            onDragStart: ({ active }) => `Picked up ${allItems.find((i) => i.id === active.id)?.title ?? 'activity'}.`,
            onDragOver: ({ active, over }) => (over && String(over.id).startsWith('day:') ? `${allItems.find((i) => i.id === active.id)?.title} is over ${days.find((d) => `day:${d.id}` === String(over.id)) ? `Day ${days.find((d) => `day:${d.id}` === String(over.id))!.dayNumber}` : 'a day'}.` : undefined),
            onDragEnd: ({ active }) => `Dropped ${allItems.find((i) => i.id === active.id)?.title ?? 'activity'}.`,
            onDragCancel: () => 'Move cancelled.',
          },
        }}
      >
        <DayChips tripId={trip.id} days={days} activeDayId={day.id} counts={counts} dragging={!!activeId} />

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Day {day.dayNumber}{day.title ? ` · ${day.title}` : ''}</h2>
            <p className="text-sm text-fg-muted">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {!split && <Button asChild variant="secondary" size="sm"><Link to={`/trips/${trip.id}/map?day=${day.dayNumber}`}><MapIcon aria-hidden className="size-4" /> View day on map</Link></Button>}
            <Button asChild size="sm"><Link to={`${dayPath}/add`}><Plus aria-hidden className="size-4" /> Add activity</Link></Button>
            <Menu
              trigger={<Button variant="secondary" size="icon" aria-label="Day options"><MoreHorizontal aria-hidden className="size-4" /></Button>}
            >
              <MenuItem icon={<RefreshCw className="size-4" />} disabled={dayItemsEmpty} onSelect={() => setRegenerating(true)}>Regenerate this day</MenuItem>
              <MenuItem icon={<Sparkles className="size-4" />} onSelect={() => setGenerating(true)}>Draft whole itinerary</MenuItem>
              <MenuItem icon={<Clock className="size-4" />} disabled={items.length < 2} onSelect={() => void actions.retimeDay(day.id)}>Re-time this day</MenuItem>
            </Menu>
          </div>
        </header>

        {warnings.length > 0 && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
            <span className="flex items-center gap-2"><AlertTriangle aria-hidden className="size-4" /> {warnings.length} timing {warnings.length === 1 ? 'issue' : 'issues'} on this day</span>
            <Button size="sm" variant="secondary" onClick={() => void actions.retimeDay(day.id)}>Re-time day</Button>
          </div>
        )}
        {load.busy && (
          <p role="note" className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg-muted">
            This day looks packed: {load.count} stops and about {Math.round(load.busyMinutes / 60)} hours of activity and travel. Consider moving something to another day.
          </p>
        )}

        {dayItemsEmpty ? (
          <EmptyState
            title={`Nothing planned for Day ${day.dayNumber}`}
            description="Add a place, or let the assistant draft your days — you’ll see a preview before anything changes."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild><Link to={`${dayPath}/add`}><Plus aria-hidden className="size-4" /> Add activity</Link></Button>
                {tripEmpty && <Button variant="secondary" onClick={() => setGenerating(true)}><Sparkles aria-hidden className="size-4" /> Draft itinerary</Button>}
              </div>
            }
          />
        ) : (
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ol aria-label={`Day ${day.dayNumber} activities`} className="space-y-1">
              {items.map((item, index) => {
                const point = points.get(item.id)
                return (
                  <li key={item.id}>
                    <SortableItemCard
                      item={item} index={index} count={items.length} days={days} selected={item.id === currentSelected} splitView={split}
                      warning={warnings.find((w) => w.itemId === item.id)}
                      directionsHref={point ? maps.links.deepLink(point, 'directions', item.title) : undefined}
                      onOpen={openItem} onSelect={(i) => setSelectedId(i.id)} onMove={move}
                      onMoveToDay={(i, d) => void actions.moveToDay(i, d.id, d.dayNumber)}
                      onDuplicate={(i) => void actions.duplicate(i)} onDelete={(i) => void actions.remove(i)}
                    />
                  </li>
                )
              })}
            </ol>
          </SortableContext>
        )}

        <DragOverlay>
          {dragged ? <ItemCardBody item={dragged} index={0} count={1} days={days} selected={false} splitView={split} onOpen={() => {}} onSelect={() => {}} onMove={() => {}} onMoveToDay={() => {}} onDuplicate={() => {}} onDelete={() => {}} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )

  return (
    <>
      {split ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {list}
          <div className="sticky top-20 h-[calc(100dvh-7rem)] min-h-80">{mapPane('size-full')}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {layout === 'tablet' && (
            <section aria-label="Map">
              {mapPane(stripOpen ? 'h-[55dvh]' : 'h-40')}
              <Button variant="ghost" size="sm" className="mt-1 w-full" aria-expanded={stripOpen} onClick={() => setStripOpen(!stripOpen)}>
                {stripOpen ? <><ChevronUp aria-hidden className="size-4" /> Collapse map</> : <><ChevronDown aria-hidden className="size-4" /> Expand map</>}
              </Button>
            </section>
          )}
          {list}
        </div>
      )}

      <AddActivitySheet trip={trip} day={day} dayItems={items} open={'dayNumber' in parsed && parsed.add} onClose={() => navigate(dayPath)} actions={actions} />
      <ActivitySheet
        trip={trip} item={detailItem} day={day} open={!!detailItem} onClose={() => navigate(dayPath)} actions={actions}
        booking={detailItem?.bookingId ? plan.data?.bookings.find((b) => b.id === detailItem.bookingId) : undefined}
        point={detailItem ? points.get(detailItem.id) : undefined}
      />
      <GenerateItinerarySheet trip={trip} plan={plan.data} open={generating} onClose={() => setGenerating(false)} />
      <RegenerateDaySheet trip={trip} day={day} items={items} open={regenerating} onClose={() => setRegenerating(false)} />
    </>
  )
}
