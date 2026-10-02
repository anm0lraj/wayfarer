import { useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { useDestinations } from '@/data/queries/catalog'
import { applyAIAction, itineraryRepo, tripRepo } from '@/data/repositories'
import { dateInTimezone, tripLengthDays } from '@/lib/dates'
import { useServices } from '@/services'
import { clock } from '@/services/clock/clock'
import type { Destination, Trip } from '@/types'
import { useTripDraft } from './draftStore'
import { generateDays } from '@/features/ai/generate'
import { tripTitle } from './helpers'
import { DEFAULT_DRAFT, makeDraftSchema, STEPS, type TripDraft } from './schema'
import { BudgetStep, DatesStep, DestinationStep, InterestsStep, StyleStep, TravellersStep } from './steps'

const StepBody = [DestinationStep, DatesStep, TravellersStep, BudgetStep, InterestsStep, StyleStep]

export function CreateTrip() {
  const { step } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { ai } = useServices()
  const [params] = useSearchParams()
  const destinations = useDestinations()
  const { draft, setDraft, clear } = useTripDraft()
  const [creating, setCreating] = useState(false)

  const today = dateInTimezone(clock.now(), 'UTC')
  const schema = useMemo(() => makeDraftSchema(today), [today])
  const methods = useForm<TripDraft>({ resolver: zodResolver(schema), defaultValues: { ...DEFAULT_DRAFT, ...draft }, mode: 'onTouched' })

  // Persist every change so a refresh or closed tab keeps the user's answers.
  useEffect(() => {
    const sub = methods.watch((v) => setDraft({ ...DEFAULT_DRAFT, ...(v as Partial<TripDraft>) }))
    return () => sub.unsubscribe()
  }, [methods, setDraft])

  // "Plan a Trip" from a destination page pre-fills it and skips ahead to the dates.
  const prefilled = useRef(false)
  const prefillId = params.get('destination')
  useEffect(() => {
    if (prefilled.current || !prefillId) return
    prefilled.current = true
    methods.setValue('destinationIds', [prefillId], { shouldDirty: true })
    navigate('/trips/new/dates', { replace: true })
  }, [prefillId, methods, navigate])

  const index = STEPS.findIndex((s) => s.slug === step)
  if (index < 0) return <Navigate to={`/trips/new/${STEPS[0].slug}${params.toString() ? `?${params}` : ''}`} replace />
  const last = index === STEPS.length - 1
  const Body = StepBody[index]!

  const goTo = (i: number) => navigate(`/trips/new/${STEPS[i]!.slug}`)
  const close = () => navigate('/trips')

  const next = async () => {
    if (await methods.trigger([...STEPS[index]!.fields])) goTo(index + 1)
  }

  const create = methods.handleSubmit(async (v) => {
    setCreating(true)
    try {
      const chosen = v.destinationIds.map((id) => destinations.data?.find((d) => d.id === id)).filter((d): d is Destination => !!d)
      if (chosen.length === 0) throw new Error('Destinations are still loading — try again in a moment.')
      const length = tripLengthDays(v.start, v.end)
      const trip = await tripRepo.create({
        title: tripTitle(chosen.map((d) => d.name), length), destinationIds: chosen.map((d) => d.id), startDate: v.start, endDate: v.end,
        timezone: chosen[0]!.timezone, travellers: { group: v.group, count: v.count },
        budget: { tier: v.tier, total: v.customBudget.trim() ? { amount: Number(v.customBudget), currency: 'INR' } : undefined },
        interests: v.interests, planningStyle: v.style, coverImage: chosen[0]!.heroImage,
      })
      const outcome = v.style === 'manual' ? 'manual' : await draftItinerary(trip, chosen, v)
      clear()
      methods.reset(DEFAULT_DRAFT)
      await qc.invalidateQueries()
      toast(
        outcome === 'drafted' ? { title: 'Trip created', description: 'We drafted your itinerary — review it in the Itinerary tab.' }
        : outcome === 'unavailable' ? { title: 'Trip created', description: 'The AI assistant isn’t available right now, so your days are empty. You can plan manually.' }
        : outcome === 'no-suggestions' ? { title: 'Trip created', description: `We don’t have place suggestions for ${chosen.map((d) => d.name).join(', ')} yet. Add your own stops.` }
        : { title: 'Trip created' },
      )
      navigate(`/trips/${trip.id}`, { replace: true, state: { justCreated: true } })
    } catch (e) {
      toast({ title: 'Couldn’t create the trip', description: e instanceof Error ? e.message : undefined })
    } finally {
      setCreating(false)
    }
  })

  async function draftItinerary(trip: Trip, chosen: Destination[], v: TripDraft): Promise<'drafted' | 'unavailable' | 'no-suggestions'> {
    try {
      const { days, dayDestinations } = await generateDays(ai, chosen, { totalDays: tripLengthDays(v.start, v.end), interests: v.interests, budgetTotal: Number(v.customBudget) || undefined })
      if (days.length === 0) return 'no-suggestions'
      await applyAIAction(trip.id, { type: 'CREATE_ITINERARY', days })
      if (chosen.length > 1) {
        const created = await itineraryRepo.listDays(trip.id)
        for (const [i, day] of created.entries()) if (dayDestinations[i]) await itineraryRepo.updateDay(day.id, { destinationId: dayDestinations[i] })
      }
      return 'drafted'
    } catch {
      return 'unavailable'
    }
  }

  return (
    <FormProvider {...methods}>
      <ResponsiveSheet open onOpenChange={(o) => !o && close()} title="Plan a trip" wide="dialog" phone="full">
        <div className="flex min-h-full flex-col">
          <Stepper steps={STEPS.map((s) => s.label)} current={index} className="mb-6" />
          <form noValidate onSubmit={(e) => { e.preventDefault(); void (last ? create() : next()) }} className="flex flex-1 flex-col">
            <div className="flex-1" key={step}><Body /></div>
            <div className="sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-border bg-surface px-5 py-3">
              <Button type="button" variant="secondary" className="flex-1 sm:flex-none" disabled={creating} onClick={() => (index === 0 ? close() : goTo(index - 1))}>{index === 0 ? 'Cancel' : 'Back'}</Button>
              <Button type="submit" className="flex-1" disabled={creating}>{creating ? 'Creating your trip…' : last ? 'Create trip' : 'Next'}</Button>
            </div>
          </form>
        </div>
      </ResponsiveSheet>
    </FormProvider>
  )
}
