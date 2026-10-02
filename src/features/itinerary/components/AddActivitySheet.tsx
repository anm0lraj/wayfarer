import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Plus, Star } from 'lucide-react'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Input, SearchField } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useTripPlaces } from '@/data/queries/catalog'
import { formatMoney } from '@/lib/money'
import { itemCategorySchema, timeSchema, type ItineraryDay, type ItineraryItem, type Place, type Trip } from '@/types'
import { CATEGORY_META } from '../categoryMeta'
import { itemCategoryForPlace } from '../placeCategory'
import { suggestNextStart } from '../schedule'
import type { useItineraryActions } from '../useItineraryActions'

type Actions = ReturnType<typeof useItineraryActions>

const FILTERS: Array<{ id: string; label: string; match: (p: Place) => boolean }> = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'sights', label: 'Sights', match: (p) => ['attraction', 'viewpoint', 'hidden_gem'].includes(p.kind) },
  { id: 'food', label: 'Food', match: (p) => p.kind === 'restaurant' },
  { id: 'activities', label: 'Activities', match: (p) => p.kind === 'activity' },
  { id: 'shops', label: 'Shopping', match: (p) => p.kind === 'shop' },
]

const customSchema = z
  .object({
    title: z.string().trim().min(1, 'Give it a name'),
    startTime: timeSchema,
    duration: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 5 && Number(v) <= 1440, 'Enter 5–1440 minutes'),
    category: itemCategorySchema,
    locationName: z.string(),
    address: z.string(),
    lat: z.string(),
    lng: z.string(),
    cost: z.string().refine((v) => v.trim() === '' || (Number(v) >= 0 && Number.isFinite(Number(v))), 'Enter an amount of 0 or more'),
    notes: z.string(),
  })
  .superRefine((d, ctx) => {
    const has = (s: string) => s.trim() !== ''
    if (has(d.lat) !== has(d.lng)) ctx.addIssue({ code: 'custom', path: [has(d.lat) ? 'lng' : 'lat'], message: 'Enter both latitude and longitude' })
    if (has(d.lat) && !(Math.abs(Number(d.lat)) <= 90)) ctx.addIssue({ code: 'custom', path: ['lat'], message: 'Latitude is between −90 and 90' })
    if (has(d.lng) && !(Math.abs(Number(d.lng)) <= 180)) ctx.addIssue({ code: 'custom', path: ['lng'], message: 'Longitude is between −180 and 180' })
  })
type CustomValues = z.infer<typeof customSchema>

interface Props {
  trip: Trip
  day: ItineraryDay
  dayItems: ItineraryItem[]
  open: boolean
  onClose: () => void
  actions: Actions
}

export function AddActivitySheet({ trip, day, dayItems, open, onClose, actions }: Props) {
  const places = useTripPlaces(trip.destinationIds)
  const [term, setTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const inDay = useMemo(() => new Set(dayItems.map((i) => i.placeId).filter(Boolean)), [dayItems])

  const t = term.trim().toLowerCase()
  const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0]!
  const list = (places.data ?? []).filter((p) => p.kind !== 'airport' && f.match(p) && (!t || p.name.toLowerCase().includes(t) || p.tags.some((tag) => tag.includes(t))))

  const form = useForm<CustomValues>({
    resolver: zodResolver(customSchema),
    defaultValues: { title: '', startTime: suggestNextStart(dayItems), duration: '60', category: 'other', locationName: '', address: '', lat: '', lng: '', cost: '', notes: '' },
  })

  const addPlace = (p: Place) =>
    actions.add(day.id, day.dayNumber, {
      title: p.name, startTime: suggestNextStart(dayItems), durationMin: p.typicalDurationMin ?? 90, category: itemCategoryForPlace(p),
      placeId: p.id, description: p.description, estimatedCost: p.costEstimate, image: p.images[0],
    })

  const addCustom = form.handleSubmit(async (v) => {
    const hasPoint = v.lat.trim() !== '' && v.lng.trim() !== ''
    const where = [v.locationName.trim(), v.address.trim()].filter(Boolean).join(' · ')
    await actions.add(day.id, day.dayNumber, {
      title: v.title.trim(), startTime: v.startTime, durationMin: Number(v.duration), category: v.category,
      description: where || undefined,
      estimatedCost: v.cost.trim() ? { amount: Number(v.cost), currency: 'INR' } : undefined,
      customLocation: hasPoint ? { name: v.locationName.trim() || v.title.trim(), address: v.address.trim() || undefined, point: { lat: Number(v.lat), lng: Number(v.lng) } } : undefined,
      notes: v.notes.trim() || undefined,
    })
    form.reset()
    onClose()
  })

  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title={`Add to Day ${day.dayNumber}`} description="Pick a place or enter your own." wide="panel">
      <Tabs defaultValue="places">
        <TabsList aria-label="How to add">
          <TabsTrigger value="places">Places</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="places" className="space-y-3 pt-4">
          <SearchField label="Search places" placeholder="Search places" value={term} onChange={(e) => setTerm(e.target.value)} />
          <div role="group" aria-label="Place type" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
            {FILTERS.map((x) => <Chip key={x.id} className="shrink-0" selected={filter === x.id} onClick={() => setFilter(x.id)}>{x.label}</Chip>)}
          </div>
          {places.isPending && <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>}
          {places.data && list.length === 0 && <p className="py-6 text-center text-fg-muted">{t ? `No places match “${term.trim()}”.` : 'No places for this destination yet — use Custom to add your own.'}</p>}
          <ul className="space-y-2">
            {list.map((p) => {
              const added = inDay.has(p.id)
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2">
                  <img src={p.images[0]} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                      <span>{CATEGORY_META[itemCategoryForPlace(p)].label}</span>
                      {p.rating && <span className="inline-flex items-center gap-0.5"><Star aria-hidden className="size-3 fill-current" />{p.rating.toFixed(1)}</span>}
                      {p.costEstimate && <span>{p.costEstimate.amount === 0 ? 'Free' : formatMoney(p.costEstimate)}</span>}
                    </p>
                  </div>
                  <Button size="sm" variant={added ? 'ghost' : 'secondary'} disabled={added} onClick={() => void addPlace(p)} aria-label={added ? `${p.name} is already in Day ${day.dayNumber}` : `Add ${p.name}`}>
                    {added ? <><Check aria-hidden className="size-4" /> Added</> : <><Plus aria-hidden className="size-4" /> Add</>}
                  </Button>
                </li>
              )
            })}
          </ul>
          <Button variant="secondary" className="w-full" onClick={onClose}>Done</Button>
        </TabsContent>

        <TabsContent value="custom" className="pt-4">
          <form noValidate onSubmit={(e) => void addCustom(e)} className="space-y-4">
            <Input label="Name" placeholder="Beach picnic" error={form.formState.errors.title?.message} {...form.register('title')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start time" type="time" error={form.formState.errors.startTime?.message} {...form.register('startTime')} />
              <Input label="Duration (min)" inputMode="numeric" error={form.formState.errors.duration?.message} {...form.register('duration')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-category" className="text-sm font-medium">Category</label>
              <select id="custom-category" className="min-h-touch rounded-md border border-border bg-surface px-3" {...form.register('category')}>
                {itemCategorySchema.options.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
              </select>
            </div>
            <Input label="Location name (optional)" {...form.register('locationName')} />
            <Input label="Address (optional)" {...form.register('address')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitude (optional)" inputMode="decimal" error={form.formState.errors.lat?.message} {...form.register('lat')} />
              <Input label="Longitude (optional)" inputMode="decimal" error={form.formState.errors.lng?.message} {...form.register('lng')} />
            </div>
            <p className="-mt-2 text-xs text-fg-muted">Add coordinates to show this stop on the map.</p>
            <Input label="Estimated cost, ₹ (optional)" inputMode="numeric" error={form.formState.errors.cost?.message} {...form.register('cost')} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-notes" className="text-sm font-medium">Notes (optional)</label>
              <textarea id="custom-notes" rows={3} className="rounded-md border border-border bg-surface p-3" {...form.register('notes')} />
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>Add activity</Button>
          </form>
        </TabsContent>
      </Tabs>
    </ResponsiveSheet>
  )
}
