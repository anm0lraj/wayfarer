import { useState } from 'react'
import { isValid, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCopyItinerary } from '@/data/queries/publicTrips'
import { addDays, dateInTimezone, formatDateRange } from '@/lib/dates'
import { clock } from '@/services/clock/clock'
import type { PublicTrip } from '@/types'

interface Props {
  trip: PublicTrip
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Asks when you’d go, then copies the itinerary into a new trip of your own. The original is never changed. */
export function UseItinerarySheet({ trip, open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const copy = useCopyItinerary()
  const [start, setStart] = useState(() => addDays(dateInTimezone(clock.now(), 'UTC'), 30))
  const [error, setError] = useState<string>()
  // The date field can be cleared (or hold a partial value); nothing below may parse it then.
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(start) && isValid(parseISO(start))
  const end = valid ? addDays(start, trip.durationDays - 1) : undefined

  const submit = async () => {
    if (!end) return
    setError(undefined)
    try {
      const created = await copy.mutateAsync({ id: trip.id, startDate: start, endDate: end })
      onOpenChange(false)
      toast({ title: 'Itinerary copied to your trips', description: 'Make it yours — change anything you like.' })
      navigate(`/trips/${created.id}/itinerary`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t copy this itinerary.')
    }
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Use this itinerary" description="We’ll make a copy in your trips. The original stays as it is." wide="dialog">
      <div className="space-y-4 px-5 pb-6">
        <Input label="When do you want to start?" type="date" value={start} onChange={(e) => setStart(e.target.value)} error={end ? undefined : 'Choose a start date.'} required />
        {end && <p className="text-fg-muted">{trip.durationDays} days · {formatDateRange(start, end)}</p>}
        <p className="text-sm text-fg-muted">Bookings, notes and other people’s photos aren’t copied — just the days, places and timings.</p>
        {error && <p role="alert" className="text-error">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={() => void submit()} disabled={!end || copy.isPending}>{copy.isPending ? 'Copying…' : 'Copy to my trips'}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </div>
    </ResponsiveSheet>
  )
}
