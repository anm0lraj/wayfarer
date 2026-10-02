import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CloudCheck, CloudDownload } from 'lucide-react'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { TripWithState } from '@/data/queries/trips'
import { makeAvailableOffline, removeOfflineMark, summariseOffline, type OfflineSummary } from './offlineTrip'

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

/** Overview card for spec §29: keep this trip usable with no connection. */
export function OfflineCard({ trip }: { trip: TripWithState }) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [persistent, setPersistent] = useState<boolean>()
  const summary = useQuery({ queryKey: ['offline-summary', trip.id, trip.offlineAvailable], queryFn: () => summariseOffline(trip.id) })

  const run = async (fn: () => Promise<OfflineSummary | void>, failure: string) => {
    setBusy(true)
    try {
      const s = await fn()
      if (s) setPersistent(s.persistent)
      await qc.invalidateQueries({ queryKey: ['trips'] })
    } catch (e) {
      toast({ title: failure, description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }
  const s = summary.data
  const on = trip.offlineAvailable

  return (
    <Card className="space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-semibold">{on ? <CloudCheck aria-hidden className="size-5 text-success" /> : <CloudDownload aria-hidden className="size-5" />} {on ? 'Available offline' : 'Use offline'}</h3>
      <p className="text-sm text-fg-muted">
        {on
          ? 'Your plan, bookings and memories are saved on this device. You can read and edit them with no signal; changes sync when you’re back online.'
          : 'Keep this trip usable with no signal. Everything is stored on this device — nothing extra to download.'}
      </p>
      {s && <p className="text-sm">{plural(s.days, 'day')} · {plural(s.stops, 'stop')} · {plural(s.stays, 'stay')} · {plural(s.flights, 'flight')} · {plural(s.memories, 'memory')}</p>}
      {on && persistent === false && <p className="text-sm text-warning">Your browser may clear this data if the device runs low on space. Installing the app helps keep it.</p>}
      <p className="text-sm text-fg-muted">Map tiles are cached as you view them; areas you haven’t opened won’t show offline.</p>
      {on ? (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => removeOfflineMark(trip), 'Couldn’t update')}>Turn off</Button>
      ) : (
        <Button variant="secondary" disabled={busy} onClick={() => void run(() => makeAvailableOffline(trip), 'Couldn’t prepare this trip')}>{busy ? 'Preparing…' : 'Make available offline'}</Button>
      )}
    </Card>
  )
}
