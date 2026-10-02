import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { itineraryRepo } from '@/data/repositories'
import { useTripPlan } from '@/data/queries/plan'
import { useTrips } from '@/data/queries/trips'
import { itemCategoryForPlace } from '@/features/itinerary/placeCategory'
import { formatDateRange } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { Place } from '@/types'

/** Pick one of your trips to this destination, a day and a start time; the place becomes an itinerary item. */
export function AddToTripSheet({ place, onClose }: { place: Place | null; onClose: () => void }) {
  const qc = useQueryClient()
  const trips = useTrips()
  const eligible = (trips.data ?? []).filter(
    (t) => place && t.destinationIds.includes(place.destinationId) && !['completed', 'archived'].includes(t.effectiveState),
  )
  const [tripId, setTripId] = useState<string>()
  const [dayId, setDayId] = useState<string>()
  const [time, setTime] = useState('10:00')
  const [busy, setBusy] = useState(false)
  const plan = useTripPlan(tripId)

  useEffect(() => {
    if (place) { setTripId(eligible[0]?.id); setDayId(undefined); setTime('10:00') }
    // reset only when a different place is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.id])
  useEffect(() => { if (!tripId && eligible[0]) setTripId(eligible[0].id) }, [tripId, eligible])
  useEffect(() => { if (plan.data && !plan.data.days.some((d) => d.id === dayId)) setDayId(plan.data.days[0]?.id) }, [plan.data, dayId])

  const add = async () => {
    if (!place || !tripId || !dayId) return
    setBusy(true)
    try {
      const item = await itineraryRepo.addItem(tripId, dayId, {
        title: place.name, startTime: time, durationMin: place.typicalDurationMin ?? 90, category: itemCategoryForPlace(place),
        placeId: place.id, description: place.description, estimatedCost: place.costEstimate,
      })
      await qc.invalidateQueries({ queryKey: ['trips'] })
      const dayNumber = plan.data?.days.find((d) => d.id === dayId)?.dayNumber
      toast({
        title: `Added to Day ${dayNumber}`, description: place.name,
        action: { label: 'Undo', onClick: () => void itineraryRepo.removeItem(item.id).then(() => qc.invalidateQueries({ queryKey: ['trips'] })) },
      })
      onClose()
    } catch (e) {
      toast({ title: 'Couldn’t add it', description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ResponsiveSheet open={!!place} onOpenChange={(o) => !o && onClose()} title="Add to trip" description={place?.name}>
      {eligible.length === 0 ? (
        <div className="space-y-3 py-2">
          <p className="text-fg-muted">You don’t have a trip to this destination yet.</p>
          <Button asChild><Link to={`/trips/new/destination?destination=${place?.destinationId ?? ''}`} onClick={onClose}>Plan a trip here</Link></Button>
        </div>
      ) : (
        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Trip</legend>
            {eligible.map((t) => (
              <label key={t.id} className={cn('flex min-h-touch cursor-pointer items-center gap-3 rounded-md border p-3', tripId === t.id ? 'border-primary bg-primary/10' : 'border-border')}>
                <input type="radio" name="trip" className="size-4 accent-[rgb(var(--primary))]" checked={tripId === t.id} onChange={() => setTripId(t.id)} />
                <span><span className="block font-medium">{t.title}</span><span className="block text-sm text-fg-muted">{formatDateRange(t.startDate, t.endDate)}</span></span>
              </label>
            ))}
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-day" className="text-sm font-medium">Day</label>
              <select id="add-day" value={dayId ?? ''} onChange={(e) => setDayId(e.target.value)} className="min-h-touch rounded-md border border-border bg-surface px-3" disabled={!plan.data}>
                {plan.data?.days.map((d) => <option key={d.id} value={d.id}>Day {d.dayNumber}{d.title ? ` — ${d.title}` : ''}</option>)}
              </select>
            </div>
            <Input label="Start time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <Button className="w-full" disabled={busy || !dayId || !time} onClick={() => void add()}>{busy ? 'Adding…' : 'Add to itinerary'}</Button>
        </div>
      )}
    </ResponsiveSheet>
  )
}
