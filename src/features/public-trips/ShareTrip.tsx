import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ExternalLink, Globe, Link2, Lock, Share2 } from 'lucide-react'
import { ErrorState } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePublishTrip } from '@/data/queries/publicTrips'
import type { TripWithState } from '@/data/queries/trips'
import { publicTripRepo } from '@/data/repositories'
import { useSession } from '@/app/providers/session'
import { shareLink } from '@/lib/share'
import type { PublicTrip, Visibility } from '@/types'

const OPTIONS: Array<{ value: Visibility; label: string; hint: string; icon: typeof Lock }> = [
  { value: 'private', label: 'Private', hint: 'Only you and people you invite to the trip.', icon: Lock },
  { value: 'link', label: 'Anyone with the link', hint: 'Not listed in Explore. Anyone you send the link to can view it.', icon: Link2 },
  { value: 'public', label: 'Public', hint: 'Listed in Explore so other travellers can find, save and copy it.', icon: Globe },
]
const field = 'w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base'

function ShareForm({ trip, published }: { trip: TripWithState; published?: PublicTrip }) {
  const { publish, unpublish } = usePublishTrip(trip.id)
  const [visibility, setVisibility] = useState<Visibility>(trip.visibility)
  const [description, setDescription] = useState(published?.description ?? '')
  const [tips, setTips] = useState((published?.tips ?? []).join('\n'))
  const [photos, setPhotos] = useState(true)
  const [error, setError] = useState<string>()
  const link = published ? `${window.location.origin}/t/${published.slug}` : undefined

  const submit = async () => {
    setError(undefined)
    if (visibility === 'private') {
      if (!published) return setError('Pick “Anyone with the link” or “Public” to publish.')
      if (!window.confirm('Make this trip private? Its public link will stop working.')) return
      await unpublish.mutateAsync()
      return toast({ title: 'Trip is private again', description: 'The public link no longer works.' })
    }
    if (description.trim().length < 10) return setError('Add a short description (at least 10 characters) so people know what this trip is.')
    try {
      await publish.mutateAsync({
        visibility, description: description.trim(), includeMemories: photos,
        tips: tips.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 8),
      })
      toast({ title: published ? 'Public page updated' : 'Trip published' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t publish this trip.')
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-6">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-lg font-semibold">Who can see this trip</legend>
          {OPTIONS.map((o) => (
            <label key={o.value} className="flex min-h-touch items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="visibility" checked={visibility === o.value} onChange={() => setVisibility(o.value)} className="mt-1 size-5 accent-primary" />
              <o.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-muted" />
              <span><span className="block font-medium">{o.label}</span><span className="block text-sm text-fg-muted">{o.hint}</span></span>
            </label>
          ))}
        </fieldset>

        {visibility !== 'private' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="share-desc" className="text-sm font-medium">Description</label>
              <textarea id="share-desc" rows={3} maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} className={field} placeholder="Five days of sunsets, temples and street food in Bali…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="share-tips" className="text-sm font-medium">Tips for other travellers (one per line, optional)</label>
              <textarea id="share-tips" rows={3} value={tips} onChange={(e) => setTips(e.target.value)} className={field} />
            </div>
            <label className="flex min-h-touch items-center gap-3">
              <input type="checkbox" checked={photos} onChange={(e) => setPhotos(e.target.checked)} className="size-5 accent-primary" />
              Include my uploaded photos
            </label>
          </div>
        )}

        {error && <p role="alert" className="text-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void submit()} disabled={publish.isPending || unpublish.isPending}>
            {visibility === 'private' ? (published ? 'Make private' : 'Publish') : published ? 'Update public page' : 'Publish trip'}
          </Button>
          <Button asChild variant="ghost"><Link to={`/trips/${trip.id}`}>Back to trip</Link></Button>
        </div>

        {published && link && (
          <section aria-labelledby="live-h" className="space-y-3 rounded-lg border border-success/40 bg-success/5 p-4">
            <h2 id="live-h" className="flex items-center gap-2 font-semibold"><Check aria-hidden className="size-5 text-success" /> Your trip is live</h2>
            <p className="break-all rounded-md bg-surface px-3 py-2 font-mono text-sm">{link}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void shareLink({ title: published.title, text: published.description, url: link })}><Share2 aria-hidden className="size-4" /> Share link</Button>
              <Button asChild variant="secondary"><Link to={`/t/${published.slug}`}><ExternalLink aria-hidden className="size-4" /> View public page</Link></Button>
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-4 rounded-lg border border-border bg-surface p-4" aria-label="What gets shared">
        <div>
          <h2 className="font-semibold">What people will see</h2>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-fg-muted">
            <li>Cover, title, dates as a length, budget range</li><li>Your day-by-day plan and map</li><li>Places, tips and (optionally) photos</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold">Never shared</h2>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-fg-muted">
            <li>Private notes and bookings</li><li>Confirmation numbers</li><li>Where exactly your photos were taken</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

/** `/trips/:id/share` — choose who can see the trip and publish a sanitised copy (spec §24). */
export function ShareTrip() {
  const trip = useOutletContext<TripWithState>()
  const session = useSession()
  const published = useQuery({
    queryKey: ['public-trip-of', trip.publicTripId ?? null],
    queryFn: async () => (trip.publicTripId ? (await publicTripRepo.get(trip.publicTripId)) ?? null : null),
  })
  const isOwner = session?.user.id === trip.ownerId

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Share trip</h2>
        <p className="text-fg-muted">Publish a clean copy of your itinerary. Your original stays private and editable.</p>
      </div>
      {!isOwner ? (
        <ErrorState title="Only the trip owner can publish" description="Ask the owner if you’d like this trip shared." />
      ) : published.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : published.isError ? (
        <ErrorState title="Couldn’t load sharing settings" onRetry={() => void published.refetch()} />
      ) : (
        <ShareForm key={published.data?.id ?? 'new'} trip={trip} published={published.data ?? undefined} />
      )}
    </div>
  )
}
