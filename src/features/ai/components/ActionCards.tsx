import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Check, MapPin, Navigation, Plus, Star, Undo2 } from 'lucide-react'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useSavedPlaceIds, useToggleSavedPlace } from '@/data/queries/catalog'
import { useTripPlan, type TripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { aiRepo, applyAIAction, catalogRepo, type AppliedAction } from '@/data/repositories'
import { CATEGORY_META } from '@/features/itinerary/categoryMeta'
import { itemCategoryForPlace } from '@/features/itinerary/placeCategory'
import { suggestNextStart } from '@/features/itinerary/schedule'
import { useItineraryActions } from '@/features/itinerary/useItineraryActions'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/cn'
import { useServices } from '@/services'
import type { AIAction, AIMessage, NewDayInput, Place } from '@/types'
import { DayPreview } from './DayPreview'

type ActionState = 'pending' | 'applied' | 'dismissed' | 'undone'

interface Props {
  message: AIMessage
  trip?: TripWithState
}

/**
 * The assistant never edits your trip. Each proposal is a card; pressing its button validates the action and
 * applies it through the same repositories as a manual edit, with a confirmation for anything destructive and an Undo.
 */
export function ActionCards({ message, trip }: Props) {
  const plan = useTripPlan(trip?.id)
  const undos = useRef(new Map<number, AppliedAction['undo']>())
  const qc = useQueryClient()

  const setState = async (index: number, state: ActionState) => {
    await aiRepo.setActionState(message.id, index, state)
    await qc.invalidateQueries({ queryKey: ['ai', 'messages', message.conversationId] })
  }

  const apply = async (index: number, action: AIAction) => {
    if (!trip) return
    try {
      const result = await applyAIAction(trip.id, action)
      undos.current.set(index, result.undo)
      await qc.invalidateQueries({ queryKey: ['trips'] })
      await setState(index, 'applied')
      toast({
        title: result.summary,
        action: { label: 'Undo', onClick: () => void undo(index) },
      })
    } catch (e) {
      toast({ title: 'Couldn’t apply that', description: e instanceof Error ? e.message : undefined })
    }
  }

  const undo = async (index: number) => {
    const fn = undos.current.get(index)
    if (!fn) return
    await fn()
    undos.current.delete(index)
    await qc.invalidateQueries({ queryKey: ['trips'] })
    await setState(index, 'undone')
  }

  if (!message.actions?.length) return null
  // If the reply proposes adding something to a specific day, suggestions default to that day.
  const hintDay = message.actions.find((a): a is Extract<AIAction, { type: 'ADD_ACTIVITY' }> => a.type === 'ADD_ACTIVITY')?.dayNumber
  return (
    <div className="mt-3 space-y-2">
      {message.actions.map((action, index) => {
        const state = (message.actionStates?.[String(index)] as ActionState | undefined) ?? 'pending'
        const common = { state, canUndo: undos.current.has(index), onUndo: () => void undo(index), onDismiss: () => void setState(index, 'dismissed'), disabled: !trip }
        switch (action.type) {
          case 'SUGGEST_PLACES':
          case 'FIND_RESTAURANTS':
            return <PlaceSuggestions key={index} placeIds={action.placeIds} kind={action.type} trip={trip} plan={plan.data} hintDay={hintDay} />
          case 'ADD_ACTIVITY': {
            const meta = CATEGORY_META[action.item.category]
            return (
              <CardShell key={index} label="Add to itinerary" {...common} applyLabel={`Add to Day ${action.dayNumber}`} onApply={() => void apply(index, action)}>
                <p className="font-semibold">{action.item.title}</p>
                <p className="text-sm text-fg-muted">Day {action.dayNumber} · {action.item.startTime} · {action.item.durationMin} min · {meta.label}</p>
              </CardShell>
            )
          }
          case 'MOVE_ACTIVITY': {
            const item = plan.data?.items.find((i) => i.id === action.itemId)
            return (
              <CardShell key={index} label="Move activity" {...common} applyLabel={`Move to Day ${action.toDayNumber}`} onApply={() => void apply(index, action)}>
                <p className="font-semibold">{item?.title ?? 'This activity'} → Day {action.toDayNumber}</p>
                <p className="text-sm text-fg-muted">It becomes the {action.position === 0 ? 'first' : `#${action.position + 1}`} stop that day.</p>
              </CardShell>
            )
          }
          case 'REMOVE_ACTIVITY': {
            const item = plan.data?.items.find((i) => i.id === action.itemId)
            return (
              <CardShell key={index} label="Remove activity" destructive confirmLabel="Yes, remove it" {...common} applyLabel="Remove" onApply={() => void apply(index, action)}>
                <p className="font-semibold">{item?.title ?? 'This activity'}</p>
                <p className="text-sm text-fg-muted">It’s removed from your itinerary. You can undo this.</p>
              </CardShell>
            )
          }
          case 'REORDER_ITINERARY':
          case 'OPTIMIZE_ROUTE': {
            const titles = (ids: string[]) => ids.map((id) => plan.data?.items.find((i) => i.id === id)?.title ?? 'Activity')
            const before = plan.data?.items.filter((i) => plan.data?.days.find((d) => d.id === i.dayId)?.dayNumber === action.dayNumber).sort((a, b) => a.position - b.position).map((i) => i.title) ?? []
            return (
              <CardShell key={index} label={action.type === 'OPTIMIZE_ROUTE' ? 'Shorter route' : 'New order'} {...common} applyLabel="Apply this order" onApply={() => void apply(index, action)}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <OrderList title={`Day ${action.dayNumber} now`} items={before} />
                  <OrderList title="Proposed" items={titles(action.itemIds)} highlight />
                </div>
                <p className="mt-2 text-xs text-fg-muted">Start times stay as they are; use “Re-time day” in the itinerary afterwards if needed.</p>
              </CardShell>
            )
          }
          case 'CREATE_ITINERARY': {
            const existing = plan.data?.items.length ?? 0
            return (
              <CardShell key={index} label="Itinerary draft" {...common} applyLabel="Add to my trip" onApply={() => void apply(index, action)}>
                {existing > 0 && <p role="note" className="mb-2 rounded-md bg-warning/15 px-2 py-1.5 text-sm text-warning">Your trip already has {existing} activities. These are added after them.</p>}
                <DaysPreview days={action.days} />
              </CardShell>
            )
          }
        }
      })}
    </div>
  )
}

function CardShell({
  label, children, state, canUndo, onUndo, onDismiss, onApply, applyLabel, destructive, confirmLabel, disabled,
}: {
  label: string; children: React.ReactNode; state: ActionState; canUndo: boolean; onUndo: () => void; onDismiss: () => void
  onApply: () => void; applyLabel: string; destructive?: boolean; confirmLabel?: string; disabled?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <Card className={cn('space-y-3 p-3', destructive && 'border-error/40')} role="group" aria-label={label}>
      <p className={cn('text-xs font-semibold uppercase tracking-wide', destructive ? 'text-error' : 'text-primary')}>{label}</p>
      <div>{children}</div>
      {state === 'pending' ? (
        <div className="flex flex-wrap items-center gap-2">
          {destructive && confirming ? (
            <>
              <Button size="sm" variant="danger" onClick={() => { setConfirming(false); onApply() }}>{confirmLabel}</Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>Keep it</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant={destructive ? 'danger' : 'primary'} disabled={disabled} onClick={() => (destructive ? setConfirming(true) : onApply())}>{applyLabel}</Button>
              <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
              {disabled && <span className="text-xs text-fg-muted">Choose a trip to apply this.</span>}
            </>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-fg-muted" role="status">
          {state === 'applied' && <><Check aria-hidden className="size-4 text-success" /> Done{canUndo && <Button size="sm" variant="ghost" onClick={onUndo}><Undo2 aria-hidden className="size-4" /> Undo</Button>}</>}
          {state === 'undone' && 'Undone'}
          {state === 'dismissed' && 'Dismissed'}
        </p>
      )}
    </Card>
  )
}

function OrderList({ title, items, highlight }: { title: string; items: string[]; highlight?: boolean }) {
  return (
    <div className={cn('rounded-md border p-2', highlight ? 'border-primary/50 bg-primary/5' : 'border-border')}>
      <p className="mb-1 text-xs font-semibold text-fg-muted">{title}</p>
      <ol className="list-decimal space-y-0.5 pl-5 text-sm">{items.map((t, i) => <li key={`${t}-${i}`}>{t}</li>)}</ol>
    </div>
  )
}

function DaysPreview({ days }: { days: NewDayInput[] }) {
  return <div className="max-h-64 space-y-2 overflow-y-auto pr-1">{days.map((d, i) => <DayPreview key={i} day={d} title={`Day ${i + 1}${d.title && d.title !== `Day ${i + 1}` ? ` · ${d.title}` : ''}`} />)}</div>
}

/** SUGGEST_PLACES / FIND_RESTAURANTS: read-only suggestions with Add to day, Save, View on map and Navigate. */
function PlaceSuggestions({ placeIds, kind, trip, plan, hintDay }: { placeIds: string[]; kind: AIAction['type']; trip?: TripWithState; plan?: TripPlan; hintDay?: number }) {
  const { maps } = useServices()
  const places = useQuery({ queryKey: ['places-by-id', placeIds.join(',')], staleTime: Infinity, queryFn: () => catalogRepo.getPlaces(placeIds) })
  const saved = useSavedPlaceIds()
  const toggle = useToggleSavedPlace()
  const actions = useItineraryActions(trip?.id ?? '')
  const days = plan?.days ?? []
  const [dayId, setDayId] = useState<string>()
  const targetDay = days.find((d) => d.id === dayId) ?? days.find((d) => d.dayNumber === hintDay) ?? days[0]

  const add = (p: Place) => {
    if (!trip || !targetDay) return
    const dayItems = (plan?.items ?? []).filter((i) => i.dayId === targetDay.id).sort((a, b) => a.position - b.position)
    void actions.add(targetDay.id, targetDay.dayNumber, {
      title: p.name, startTime: suggestNextStart(dayItems), durationMin: p.typicalDurationMin ?? 90, category: itemCategoryForPlace(p),
      placeId: p.id, description: p.description, estimatedCost: p.costEstimate, image: p.images[0],
    })
  }

  return (
    <Card className="space-y-3 p-3" role="group" aria-label={kind === 'FIND_RESTAURANTS' ? 'Restaurant suggestions' : 'Place suggestions'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{kind === 'FIND_RESTAURANTS' ? 'Restaurants' : 'Places'}</p>
        {trip && days.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-fg-muted">Add to</span>
            <select value={targetDay?.id ?? ''} onChange={(e) => setDayId(e.target.value)} className="min-h-touch rounded-md border border-border-strong bg-surface px-2">
              {days.map((d) => <option key={d.id} value={d.id}>Day {d.dayNumber}</option>)}
            </select>
          </label>
        )}
      </div>
      <ul className="space-y-2">
        {(places.data ?? []).map((p) => {
          const isSaved = saved.data?.has(p.id) ?? false
          const added = !!targetDay && (plan?.items ?? []).some((i) => i.dayId === targetDay.id && i.placeId === p.id)
          return (
            <li key={p.id} className="flex gap-3 rounded-lg border border-border p-2">
              <img src={p.images[0]} alt="" className="size-16 shrink-0 rounded-md object-cover" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div>
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                    {p.rating && <span className="inline-flex items-center gap-0.5"><Star aria-hidden className="size-3 fill-current" />{p.rating.toFixed(1)}</span>}
                    {p.costEstimate && <span>{p.costEstimate.amount === 0 ? 'Free' : formatMoney(p.costEstimate)}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {trip && <Button size="sm" variant={added ? 'ghost' : 'primary'} disabled={added || !targetDay} onClick={() => add(p)} aria-label={added ? `${p.name} is already in Day ${targetDay?.dayNumber}` : `Add ${p.name} to Day ${targetDay?.dayNumber}`}>{added ? <><Check aria-hidden className="size-4" /> Added</> : <><Plus aria-hidden className="size-4" /> Add</>}</Button>}
                  <Button size="sm" variant="secondary" aria-pressed={isSaved} onClick={() => toggle.mutate(p.id)} aria-label={isSaved ? `Remove ${p.name} from saved` : `Save ${p.name}`}><Bookmark aria-hidden className={cn('size-4', isSaved && 'fill-primary text-primary')} /></Button>
                  {trip && <Button asChild size="sm" variant="secondary"><Link to={`/trips/${trip.id}/map?place=${p.id}`} aria-label={`View ${p.name} on map`}><MapPin aria-hidden className="size-4" /> Map</Link></Button>}
                  <Button asChild size="sm" variant="secondary"><a href={maps.links.deepLink(p.location, 'directions', p.name)} target="_blank" rel="noopener noreferrer" aria-label={`Navigate to ${p.name}`}><Navigation aria-hidden className="size-4" /></a></Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
