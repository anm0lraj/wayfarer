import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { ArrowDown, ArrowUp, Minus, Plus, X } from 'lucide-react'
import { Bot, Hand, Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { DateRangeField } from '@/components/ui/DateRangeField'
import { Input, SearchField } from '@/components/ui/Input'
import { OptionCard } from '@/components/ui/OptionCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDestinations } from '@/data/queries/catalog'
import { dateInTimezone } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { clock } from '@/services/clock/clock'
import { interestSchema, type BudgetTier, type TravelerGroup } from '@/types'
import { INTEREST_LABELS } from './interestLabels'
import { GROUP_DEFAULT_COUNT, MAX_TRAVELLERS, suggestBudget, type TripDraft } from './schema'

const useDraftForm = () => useFormContext<TripDraft>()

function StepHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {hint && <p className="text-fg-muted">{hint}</p>}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-2 text-sm text-error">{message}</p> : null
}

export function DestinationStep() {
  const { control, formState } = useDraftForm()
  const { data, isPending } = useDestinations()
  const [term, setTerm] = useState('')
  return (
    <Controller
      control={control}
      name="destinationIds"
      render={({ field: { value, onChange } }) => {
        const chosen = value.map((id) => data?.find((d) => d.id === id)).filter((d) => !!d)
        const t = term.trim().toLowerCase()
        const matches = (data ?? []).filter((d) => !value.includes(d.id) && (!t || [d.name, d.country, d.region ?? ''].some((s) => s.toLowerCase().includes(t))))
        const move = (i: number, by: number) => {
          const next = [...value]
          ;[next[i], next[i + by]] = [next[i + by]!, next[i]!]
          onChange(next)
        }
        return (
          <div>
            <StepHeading title="Where are you going?" hint="Add one place, or several to build a route like Delhi → Jaipur → Udaipur." />
            {chosen.length > 0 && (
              <ol aria-label="Your route" className="mb-4 space-y-2">
                {chosen.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 pl-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-fg">{i + 1}</span>
                    <span className="min-w-0 flex-1"><span className="block font-medium">{d.name}</span><span className="block text-sm text-fg-muted">{d.country}</span></span>
                    <Button size="icon" variant="ghost" aria-label={`Move ${d.name} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp aria-hidden className="size-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Move ${d.name} down`} disabled={i === chosen.length - 1} onClick={() => move(i, 1)}><ArrowDown aria-hidden className="size-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Remove ${d.name}`} onClick={() => onChange(value.filter((id) => id !== d.id))}><X aria-hidden className="size-4" /></Button>
                  </li>
                ))}
              </ol>
            )}
            <SearchField label="Search destinations" placeholder="Goa, Japan, Paris, Bali…" value={term} onChange={(e) => setTerm(e.target.value)} />
            <div className="mt-3">
              {isPending ? (
                <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
              ) : matches.length === 0 ? (
                <EmptyState title={t ? `No destinations match “${term.trim()}”` : 'All destinations added'} description={t ? 'Try a different spelling.' : undefined} className="py-6" />
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {matches.map((d) => (
                    <li key={d.id}>
                      <button type="button" onClick={() => { onChange([...value, d.id]); setTerm('') }} className="flex min-h-touch w-full items-center gap-3 rounded-lg border border-border bg-surface p-2 text-left hover:bg-surface-2">
                        <img src={d.heroImage} alt="" className="size-12 shrink-0 rounded-md object-cover" />
                        <span className="min-w-0 flex-1"><span className="block font-medium">{d.name}</span><span className="block truncate text-sm text-fg-muted">{d.region ?? d.country}</span></span>
                        <Plus aria-hidden className="size-4 text-fg-muted" /><span className="sr-only">Add {d.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <FieldError message={formState.errors.destinationIds?.message as string | undefined} />
          </div>
        )
      }}
    />
  )
}

export function DatesStep() {
  const { control, formState } = useDraftForm()
  const today = dateInTimezone(clock.now(), 'UTC')
  return (
    <div>
      <StepHeading title="When are you travelling?" hint="Pick the first and last day. We’ll work out the length." />
      <Controller
        control={control}
        name="start"
        render={({ field: start }) => (
          <Controller
            control={control}
            name="end"
            render={({ field: end }) => (
              <DateRangeField
                start={start.value} end={end.value} min={today}
                onChange={(r) => { start.onChange(r.start); end.onChange(r.end) }}
                errors={{ start: formState.errors.start?.message, end: formState.errors.end?.message }}
              />
            )}
          />
        )}
      />
    </div>
  )
}

const GROUPS: Array<{ id: TravelerGroup; label: string; fixed?: number }> = [
  { id: 'solo', label: 'Solo', fixed: 1 }, { id: 'couple', label: 'Couple', fixed: 2 }, { id: 'friends', label: 'Friends' }, { id: 'family', label: 'Family' }, { id: 'custom', label: 'Custom' },
]

export function TravellersStep() {
  const { control, setValue, watch, formState } = useDraftForm()
  const group = watch('group')
  const count = watch('count')
  const fixed = GROUPS.find((g) => g.id === group)?.fixed
  return (
    <div>
      <StepHeading title="Who’s coming?" />
      <div role="radiogroup" aria-label="Travel group" className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <Chip key={g.id} role="radio" aria-checked={group === g.id} selected={group === g.id} onClick={() => { setValue('group', g.id, { shouldDirty: true }); setValue('count', g.fixed ?? GROUP_DEFAULT_COUNT[g.id], { shouldValidate: true }) }}>{g.label}</Chip>
        ))}
      </div>
      <div className="mt-6">
        <p id="count-label" className="mb-2 text-sm font-medium">Number of travellers</p>
        <Controller
          control={control}
          name="count"
          render={({ field }) => (
            <div role="group" aria-labelledby="count-label" className="inline-flex items-center gap-3">
              <Button variant="secondary" size="icon" aria-label="Fewer travellers" disabled={fixed !== undefined || count <= 1} onClick={() => field.onChange(Math.max(1, count - 1))}><Minus aria-hidden className="size-4" /></Button>
              <span aria-live="polite" className="min-w-8 text-center text-xl font-semibold">{count}</span>
              <Button variant="secondary" size="icon" aria-label="More travellers" disabled={fixed !== undefined || count >= MAX_TRAVELLERS} onClick={() => field.onChange(Math.min(MAX_TRAVELLERS, count + 1))}><Plus aria-hidden className="size-4" /></Button>
            </div>
          )}
        />
        {fixed !== undefined && <p className="mt-2 text-sm text-fg-muted">Choose Friends, Family or Custom to change the number.</p>}
        <FieldError message={formState.errors.count?.message} />
      </div>
    </div>
  )
}

const TIERS: Array<{ id: BudgetTier; title: string; hint: string }> = [
  { id: 'economy', title: 'Economy', hint: 'Hostels, local food, public transport' },
  { id: 'comfort', title: 'Comfort', hint: 'Good 3–4★ stays, a mix of restaurants' },
  { id: 'premium', title: 'Premium', hint: 'Boutique stays, private transfers, nicer dining' },
  { id: 'luxury', title: 'Luxury', hint: 'Top resorts and experiences' },
]

export function BudgetStep() {
  const { control, register, watch, formState } = useDraftForm()
  const { data: destinations } = useDestinations()
  const [ids, tier, count, start, end] = watch(['destinationIds', 'tier', 'count', 'start', 'end'])
  const first = destinations?.find((d) => d.id === ids[0])
  const suggestion = first ? suggestBudget(first.estimatedDailyBudget.amount, count, start, end, tier) : null
  return (
    <div>
      <StepHeading title="What’s your budget style?" hint="This shapes the places and stays we suggest." />
      <Controller
        control={control}
        name="tier"
        render={({ field }) => (
          <div role="radiogroup" aria-label="Budget style" className="grid gap-2 sm:grid-cols-2">
            {TIERS.map((t) => <OptionCard key={t.id} selected={field.value === t.id} onSelect={() => field.onChange(t.id)} title={t.title} description={t.hint} />)}
          </div>
        )}
      />
      <div className="mt-6 max-w-sm">
        <Input
          label="Total budget (₹), optional" inputMode="numeric" placeholder={suggestion ? `e.g. ${suggestion}` : 'e.g. 60000'}
          hint={suggestion ? `Typical for ${count} ${count === 1 ? 'traveller' : 'travellers'}: about ${formatMoney({ amount: suggestion, currency: 'INR' })}` : 'Leave blank to decide later.'}
          error={formState.errors.customBudget?.message} {...register('customBudget')}
        />
      </div>
    </div>
  )
}

export function InterestsStep() {
  const { control } = useDraftForm()
  return (
    <Controller
      control={control}
      name="interests"
      render={({ field: { value, onChange } }) => (
        <div>
          <StepHeading title="What do you love doing?" hint="Pick a few. You can skip this and add them later." />
          <div role="group" aria-label="Interests" className="flex flex-wrap gap-2">
            {interestSchema.options.map((i) => (
              <Chip key={i} selected={value.includes(i)} onClick={() => onChange(value.includes(i) ? value.filter((x) => x !== i) : [...value, i])}>{INTEREST_LABELS[i]}</Chip>
            ))}
          </div>
        </div>
      )}
    />
  )
}

export function StyleStep() {
  const { control } = useDraftForm()
  return (
    <Controller
      control={control}
      name="style"
      render={({ field }) => (
        <div>
          <StepHeading title="How should we plan it?" hint="You can always change things later." />
          <div role="radiogroup" aria-label="Planning style" className="space-y-2">
            <OptionCard selected={field.value === 'hybrid'} onSelect={() => field.onChange('hybrid')} icon={<Sparkles className="size-5" />} title="AI + manual (recommended)" description="We draft a day-by-day plan, you refine every detail." />
            <OptionCard selected={field.value === 'ai'} onSelect={() => field.onChange('ai')} icon={<Bot className="size-5" />} title="Let AI plan it" description="A complete itinerary from your answers. You can still edit it." />
            <OptionCard selected={field.value === 'manual'} onSelect={() => field.onChange('manual')} icon={<Hand className="size-5" />} title="Build it manually" description="Start with empty days and add places yourself." />
          </div>
        </div>
      )}
    />
  )
}
