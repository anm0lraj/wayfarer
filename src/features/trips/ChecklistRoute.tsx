import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useChecklist, useChecklistActions } from '@/data/queries/bookings'
import type { TripWithState } from '@/data/queries/trips'
import { cn } from '@/lib/cn'
import type { ChecklistItem } from '@/types'

const autoTarget: Record<NonNullable<ChecklistItem['autoRule']>, string> = {
  flight_booked: 'bookings/flights', hotel_booked: 'bookings/hotels', activities_booked: 'bookings',
}

/** `/trips/:id/checklist` — preparation list (spec §18). Booking items tick themselves from saved bookings; the rest are yours to tick. */
export function TripChecklist() {
  const trip = useOutletContext<TripWithState>()
  const list = useChecklist(trip.id)
  const actions = useChecklistActions(trip.id)
  const [label, setLabel] = useState('')
  const base = `/trips/${trip.id}`

  if (list.isPending) return <SkeletonGroup label="Loading checklist" className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</SkeletonGroup>
  if (list.isError) return <ErrorState title="Couldn’t load the checklist" onRetry={() => void list.refetch()} />

  const items = list.data
  const done = items.filter((i) => i.done).length
  const percent = items.length ? (done / items.length) * 100 : 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = label.trim()
    if (!text) return
    actions.add.mutate(text, {
      onSuccess: () => setLabel(''),
      onError: (err) => toast({ title: 'Couldn’t add it', description: err instanceof Error ? err.message : undefined }),
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">Before you go</h2>
        <p className="text-fg-muted">{done} of {items.length} done</p>
        <ProgressBar value={percent} label={`Checklist ${Math.round(percent)}% complete`} />
      </header>

      <ul aria-label="Trip checklist" className="divide-y divide-border rounded-lg border border-border bg-surface">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3">
            {item.autoRule ? (
              <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center rounded border-2', item.done ? 'border-success bg-success text-success-fg' : 'border-border')}>{item.done ? '✓' : ''}</span>
            ) : null}
            {item.autoRule ? (
              <p className="flex min-h-touch flex-1 flex-wrap items-center justify-between gap-x-3">
                <span className={cn(item.done && 'text-fg-muted line-through')}>
                  <span className="sr-only">{item.done ? 'Done: ' : 'Not done: '}</span>{item.label}
                </span>
                {!item.done && <Link className="text-sm font-semibold text-primary hover:underline" to={`${base}/${autoTarget[item.autoRule]}`}>Add</Link>}
                {item.done && <span className="text-sm text-fg-muted">From your saved bookings</span>}
              </p>
            ) : (
              <label className="flex min-h-touch flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" className="size-5 accent-[rgb(var(--primary))]" checked={item.done} onChange={() => actions.toggle.mutate(item.id)} />
                <span className={cn(item.done && 'text-fg-muted line-through')}>{item.label}</span>
              </label>
            )}
            {!item.autoRule && (
              <Button variant="ghost" size="icon" aria-label={`Delete ${item.label}`} onClick={() => actions.remove.mutate(item.id)}><Trash2 aria-hidden className="size-4" /></Button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="flex items-end gap-2" aria-label="Add a checklist item">
        <div className="flex-1"><Input label="Add your own item" value={label} maxLength={80} placeholder="e.g. Download offline maps" onChange={(e) => setLabel(e.target.value)} /></div>
        <Button type="submit" disabled={!label.trim() || actions.add.isPending}><Plus aria-hidden className="size-4" /> Add</Button>
      </form>
    </div>
  )
}
