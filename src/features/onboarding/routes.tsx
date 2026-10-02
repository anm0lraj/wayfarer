import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/providers/session'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { OptionCard } from '@/components/ui/OptionCard'
import { Stepper } from '@/components/ui/Stepper'
import { userRepo } from '@/data/repositories'
import { INTEREST_LABELS } from '@/features/trips/create/interestLabels'
import { accommodationTypeSchema, interestSchema, type AccommodationType, type BudgetTier, type Interest, type TravelerGroup, type User } from '@/types'

const STEPS = [{ slug: 'you', label: 'About you' }, { slug: 'style', label: 'Style' }, { slug: 'interests', label: 'Interests' }, { slug: 'habits', label: 'Trips' }] as const

const STYLES = ['Relaxed', 'Adventurous', 'Cultural', 'Foodie', 'Luxury'] as const
const BUDGETS: Array<{ value: BudgetTier; label: string; hint: string }> = [
  { value: 'economy', label: 'Economy', hint: 'Hostels, local food, public transport' },
  { value: 'comfort', label: 'Comfort', hint: 'Good mid-range stays and a few treats' },
  { value: 'premium', label: 'Premium', hint: 'Boutique hotels, guided experiences' },
  { value: 'luxury', label: 'Luxury', hint: 'The best of everything' },
]
const COMPANIONS: Array<{ value: TravelerGroup; label: string }> = [{ value: 'solo', label: 'Solo' }, { value: 'couple', label: 'Couple' }, { value: 'friends', label: 'Friends' }, { value: 'family', label: 'Family' }]
const DURATIONS = [3, 5, 7, 10]
const STAY_LABEL: Record<AccommodationType, string> = { hotel: 'Hotel', resort: 'Resort', hostel: 'Hostel', apartment: 'Apartment', villa: 'Villa', homestay: 'Homestay' }

type Draft = {
  name: string; homeLocation: string; travelStyle?: string; budgetRange?: BudgetTier; companions?: TravelerGroup
  interests: Interest[]; typicalDurationDays?: number; accommodation?: AccommodationType; destinations: string
}

const fromUser = (u: User): Draft => ({
  name: u.name, homeLocation: u.homeLocation ?? '', travelStyle: u.preferences.travelStyle, budgetRange: u.preferences.budgetRange, companions: u.preferences.companions,
  interests: u.preferences.interests, typicalDurationDays: u.preferences.typicalDurationDays, accommodation: u.preferences.accommodation, destinations: u.preferences.preferredDestinations.join(', '),
})

function Form({ user }: { user: User }) {
  const { step } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [d, setD] = useState<Draft>(() => fromUser(user))
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const index = Math.max(0, STEPS.findIndex((s) => s.slug === step))
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }))
  const last = index === STEPS.length - 1

  const finish = async (skipped: boolean) => {
    setSaving(true)
    try {
      await userRepo.update(user.id, skipped
        ? { onboardingCompleted: true }
        : {
            name: d.name.trim() || user.name, homeLocation: d.homeLocation.trim() || undefined, onboardingCompleted: true,
            preferences: {
              ...user.preferences, travelStyle: d.travelStyle, budgetRange: d.budgetRange, companions: d.companions, interests: d.interests,
              typicalDurationDays: d.typicalDurationDays, accommodation: d.accommodation,
              preferredDestinations: d.destinations.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8),
            },
          })
      await qc.invalidateQueries()
      toast({ title: skipped ? 'You can set preferences any time in Settings' : 'You’re all set' })
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save your preferences.')
      setSaving(false)
    }
  }

  const next = () => {
    if (index === 0 && !d.name.trim()) return setError('Tell us what to call you.')
    setError(undefined)
    last ? void finish(false) : navigate(`/onboarding/${STEPS[index + 1]!.slug}`)
  }

  return (
    <div className="mx-auto grid min-h-dvh max-w-xl place-items-center p-4">
      <section aria-labelledby="ob-h" className="w-full space-y-6 rounded-xl border border-border bg-surface p-6 shadow-md sm:p-8">
        <Stepper steps={STEPS.map((s) => s.label)} current={index} />
        <div>
          <h1 id="ob-h" className="text-2xl font-bold">{['Welcome to Wayfarer', 'How do you like to travel?', 'What do you love?', 'Your usual trip'][index]}</h1>
          <p className="mt-1 text-fg-muted">{['A few quick questions so we can suggest the right places. All optional.', 'This shapes budgets and suggestions.', 'Pick as many as you like.', 'Helps us size itineraries to fit you.'][index]}</p>
        </div>

        {index === 0 && (
          <div className="space-y-4">
            <Input label="What should we call you?" value={d.name} onChange={(e) => set('name', e.target.value)} autoComplete="given-name" error={error} />
            <Input label="Where do you live?" hint="City or region — used to suggest nearby trips." value={d.homeLocation} onChange={(e) => set('homeLocation', e.target.value)} autoComplete="address-level2" />
          </div>
        )}

        {index === 1 && (
          <div className="space-y-5">
            <div role="group" aria-label="Travel style" className="flex flex-wrap gap-2">
              {STYLES.map((s) => <Chip key={s} selected={d.travelStyle === s} onClick={() => set('travelStyle', d.travelStyle === s ? undefined : s)}>{s}</Chip>)}
            </div>
            <div role="radiogroup" aria-label="Budget" className="grid gap-2 sm:grid-cols-2">
              {BUDGETS.map((b) => <OptionCard key={b.value} selected={d.budgetRange === b.value} onSelect={() => set('budgetRange', b.value)} title={b.label} description={b.hint} />)}
            </div>
            <div role="group" aria-label="Who you usually travel with" className="flex flex-wrap gap-2">
              {COMPANIONS.map((c) => <Chip key={c.value} selected={d.companions === c.value} onClick={() => set('companions', d.companions === c.value ? undefined : c.value)}>{c.label}</Chip>)}
            </div>
          </div>
        )}

        {index === 2 && (
          <div role="group" aria-label="Interests" className="flex flex-wrap gap-2">
            {interestSchema.options.map((i) => (
              <Chip key={i} selected={d.interests.includes(i)} onClick={() => set('interests', d.interests.includes(i) ? d.interests.filter((x) => x !== i) : [...d.interests, i])}>{INTEREST_LABELS[i]}</Chip>
            ))}
          </div>
        )}

        {index === 3 && (
          <div className="space-y-5">
            <div role="group" aria-label="Typical trip length" className="flex flex-wrap gap-2">
              {DURATIONS.map((n) => <Chip key={n} selected={d.typicalDurationDays === n} onClick={() => set('typicalDurationDays', d.typicalDurationDays === n ? undefined : n)}>{n === 10 ? '10+ days' : `${n} days`}</Chip>)}
            </div>
            <div role="group" aria-label="Preferred stay" className="flex flex-wrap gap-2">
              {accommodationTypeSchema.options.map((a) => <Chip key={a} selected={d.accommodation === a} onClick={() => set('accommodation', d.accommodation === a ? undefined : a)}>{STAY_LABEL[a]}</Chip>)}
            </div>
            <Input label="Places you’d love to visit" hint="Separate with commas, e.g. Japan, Bali, Goa." value={d.destinations} onChange={(e) => set('destinations', e.target.value)} />
          </div>
        )}

        {index !== 0 && error && <p role="alert" className="text-error">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" disabled={saving} onClick={() => void finish(true)}>Skip for now</Button>
          <div className="flex gap-2">
            {index > 0 && <Button variant="secondary" onClick={() => navigate(`/onboarding/${STEPS[index - 1]!.slug}`)}>Back</Button>}
            <Button disabled={saving} onClick={next}>{last ? (saving ? 'Saving…' : 'Finish') : 'Continue'}</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

/** `/onboarding/:step` — short, skippable, centred card (spec §4). Also reachable from Settings to update preferences. */
export function Onboarding() {
  const { step } = useParams()
  const session = useSession()
  if (!session) return <Navigate to="/signin" replace />
  if (!step) return <Navigate to={`/onboarding/${STEPS[0].slug}`} replace />
  return <Form user={session.user} />
}
