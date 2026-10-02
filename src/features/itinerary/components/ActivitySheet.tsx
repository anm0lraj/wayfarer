import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Copy, MapPin, Navigation, Trash2 } from 'lucide-react'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { bookingRepo, catalogRepo, itineraryRepo } from '@/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/services'
import { itemCategorySchema, timeSchema, type Booking, type GeoPoint, type ItineraryDay, type ItineraryItem, type Trip } from '@/types'
import { CATEGORY_META } from '../categoryMeta'
import { endTime } from '../schedule'
import type { useItineraryActions } from '../useItineraryActions'

type Actions = ReturnType<typeof useItineraryActions>

const schema = z
  .object({
    title: z.string().trim().min(1, 'Give it a name'),
    startTime: timeSchema,
    duration: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 5 && Number(v) <= 1440, 'Enter 5–1440 minutes'),
    category: itemCategorySchema,
    cost: z.string().refine((v) => v.trim() === '' || (Number(v) >= 0 && Number.isFinite(Number(v))), 'Enter an amount of 0 or more'),
    notes: z.string(),
    locName: z.string(),
    locAddress: z.string(),
    lat: z.string(),
    lng: z.string(),
  })
  .superRefine((d, ctx) => {
    const has = (s: string) => s.trim() !== ''
    if (has(d.lat) !== has(d.lng)) ctx.addIssue({ code: 'custom', path: [has(d.lat) ? 'lng' : 'lat'], message: 'Enter both latitude and longitude' })
    if (has(d.lat) && !(Math.abs(Number(d.lat)) <= 90)) ctx.addIssue({ code: 'custom', path: ['lat'], message: 'Latitude is between −90 and 90' })
    if (has(d.lng) && !(Math.abs(Number(d.lng)) <= 180)) ctx.addIssue({ code: 'custom', path: ['lng'], message: 'Longitude is between −180 and 180' })
  })
type Values = z.infer<typeof schema>

const valuesFor = (item: ItineraryItem): Values => ({
  title: item.title, startTime: item.startTime, duration: String(item.durationMin), category: item.category,
  cost: item.estimatedCost ? String(item.estimatedCost.amount) : '', notes: item.notes ?? '',
  locName: item.customLocation?.name ?? '', locAddress: item.customLocation?.address ?? '',
  lat: item.customLocation ? String(item.customLocation.point.lat) : '', lng: item.customLocation ? String(item.customLocation.point.lng) : '',
})

interface Props {
  trip: Trip
  item: ItineraryItem | undefined
  day: ItineraryDay | undefined
  open: boolean
  onClose: () => void
  actions: Actions
  booking?: Booking
  point?: GeoPoint
}

/** View and edit one activity: time, duration, notes, cost, location and reservation. */
export function ActivitySheet({ trip, item, day, open, onClose, actions, booking, point }: Props) {
  const { maps } = useServices()
  const qc = useQueryClient()
  const place = useQuery({ queryKey: ['place', item?.placeId], enabled: !!item?.placeId, staleTime: Infinity, queryFn: () => catalogRepo.getPlace(item!.placeId!) }).data
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: item ? valuesFor(item) : undefined })
  const [reservation, setReservation] = useState({ name: '', ref: '' })

  useEffect(() => { if (item) form.reset(valuesFor(item)) }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!item || !day) return null

  const save = form.handleSubmit(async (v) => {
    const hasPoint = v.lat.trim() !== '' && v.lng.trim() !== ''
    await actions.update(item.id, {
      title: v.title.trim(), startTime: v.startTime, durationMin: Number(v.duration), category: v.category, notes: v.notes.trim() || undefined,
      estimatedCost: v.cost.trim() ? { amount: Number(v.cost), currency: 'INR' } : undefined,
      ...(item.placeId ? {} : {
        customLocation: hasPoint ? { name: v.locName.trim() || v.title.trim(), address: v.locAddress.trim() || undefined, point: { lat: Number(v.lat), lng: Number(v.lng) } } : undefined,
      }),
    })
    toast({ title: 'Saved' })
    onClose()
  })

  const addReservation = async () => {
    const ref = reservation.ref.trim()
    if (!ref) return
    // The user's own confirmation reference, stored as a demo "saved" entry — we never verify or imply it is booked by us.
    const startAt = new Date(`${day.date}T${item.startTime}:00`).toISOString()
    const b = await bookingRepo.saveDemo({
      tripId: trip.id, type: 'activity', provider: reservation.name.trim() || 'Reservation you noted', title: item.title,
      price: item.estimatedCost ?? { amount: 0, currency: 'INR' }, startAt, refId: item.placeId, details: { confirmationNumber: ref, source: 'user-entered' },
    })
    await itineraryRepo.updateItem(item.id, { bookingId: b.id })
    await qc.invalidateQueries({ queryKey: ['trips', trip.id] })
    setReservation({ name: '', ref: '' })
    toast({ title: 'Reservation noted' })
  }

  const meta = CATEGORY_META[item.category]
  const reserved = booking?.details && typeof booking.details.confirmationNumber === 'string' ? booking.details.confirmationNumber : undefined

  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title={item.title} description={`Day ${day.dayNumber} · ${item.startTime}–${endTime(item)} · ${meta.label}`}>
      <form noValidate onSubmit={(e) => void save(e)} className="space-y-4">
        <Input label="Name" error={form.formState.errors.title?.message} {...form.register('title')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start time" type="time" error={form.formState.errors.startTime?.message} {...form.register('startTime')} />
          <Input label="Duration (min)" inputMode="numeric" error={form.formState.errors.duration?.message} {...form.register('duration')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="act-category" className="text-sm font-medium">Category</label>
            <select id="act-category" className="min-h-touch rounded-md border border-border-strong bg-surface px-3" {...form.register('category')}>
              {itemCategorySchema.options.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
            </select>
          </div>
          <Input label="Cost, ₹" inputMode="numeric" error={form.formState.errors.cost?.message} {...form.register('cost')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="act-notes" className="text-sm font-medium">Notes</label>
          <textarea id="act-notes" rows={3} placeholder="Pickup time, what to bring…" className="rounded-md border border-border-strong bg-surface p-3" {...form.register('notes')} />
        </div>

        <fieldset className="space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">Location</legend>
          {place ? (
            <p className="flex items-start gap-2 text-sm"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" /><span><span className="font-medium">{place.name}</span>{place.address ? <><br /><span className="text-fg-muted">{place.address}</span></> : null}</span></p>
          ) : (
            <>
              <Input label="Place name" {...form.register('locName')} />
              <Input label="Address" {...form.register('locAddress')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Latitude" inputMode="decimal" error={form.formState.errors.lat?.message} {...form.register('lat')} />
                <Input label="Longitude" inputMode="decimal" error={form.formState.errors.lng?.message} {...form.register('lng')} />
              </div>
            </>
          )}
          {point && (
            <Button asChild variant="secondary" size="sm"><a href={maps.links.deepLink(point, 'directions', item.title)} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden className="size-4" /> Directions</a></Button>
          )}
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">Reservation</legend>
          {reserved ? (
            <p className="text-sm">Your reference: <span className="font-semibold">{reserved}</span> <Badge tone="warning" className="ml-1">Noted by you — not verified</Badge></p>
          ) : (
            <>
              <p className="text-sm text-fg-muted">Already booked this elsewhere? Note the confirmation here so it’s with your plan. We don’t book anything.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Booked with" placeholder="e.g. GetYourGuide" value={reservation.name} onChange={(e) => setReservation({ ...reservation, name: e.target.value })} />
                <Input label="Confirmation reference" value={reservation.ref} onChange={(e) => setReservation({ ...reservation, ref: e.target.value })} />
              </div>
              <Button type="button" variant="secondary" size="sm" disabled={!reservation.ref.trim()} onClick={() => void addReservation()}>Add reservation</Button>
            </>
          )}
        </fieldset>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>Save changes</Button>
          <Button type="button" variant="secondary" onClick={() => { void actions.duplicate(item); onClose() }}><Copy aria-hidden className="size-4" /> Duplicate</Button>
          <Button type="button" variant="ghost" className="text-error" onClick={() => { void actions.remove(item); onClose() }}><Trash2 aria-hidden className="size-4" /> Delete</Button>
        </div>
      </form>
    </ResponsiveSheet>
  )
}
