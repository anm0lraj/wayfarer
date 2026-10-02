import { useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import { ErrorState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMemories, useSaveStory, useStory } from '@/data/queries/memories'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { cn } from '@/lib/cn'
import type { Memory, Story } from '@/types'
import { MemoryThumb } from './components/MemoryThumb'
import { StoryViewer } from './components/StoryViewer'

type Slide = Story['slides'][number]
type Visibility = Story['visibility']

const STICKERS = ['🌅', '🍜', '🏖️', '⛩️', '📸', '❤️', '✨', '🌴']
const VISIBILITY: Array<{ value: Visibility; label: string; hint: string }> = [
  { value: 'private', label: 'Private', hint: 'Only you can see it.' },
  { value: 'friends', label: 'Friends only', hint: 'People you invite to this trip.' },
  { value: 'public', label: 'Public', hint: 'Shown on your public trip page once you publish the trip.' },
]
const field = 'min-h-touch w-full rounded-md border border-border-strong bg-surface px-3 text-base'

function SlideRow({ slide, index, count, memory, items, onChange, onMove, onRemove }: {
  slide: Slide; index: number; count: number; memory?: Memory; items: Array<{ id: string; title: string; startTime: string }>
  onChange: (patch: Partial<Slide>) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void
}) {
  const n = index + 1
  return (
    <li className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        {memory ? <MemoryThumb memory={memory} className="size-14 shrink-0 rounded-md" /> : <span className="grid size-14 shrink-0 place-items-center rounded-md bg-surface-2 text-sm text-fg-muted">Text</span>}
        <p className="min-w-0 flex-1 font-medium">Slide {n}{memory?.caption ? ` · ${memory.caption}` : ''}</p>
        <Button size="icon" variant="ghost" aria-label={`Move slide ${n} up`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label={`Move slide ${n} down`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label={`Remove slide ${n}`} onClick={onRemove}><Trash2 aria-hidden className="size-4" /></Button>
      </div>
      <Input label={`Text on slide ${n}`} value={slide.text ?? ''} onChange={(e) => onChange({ text: e.target.value || undefined })} maxLength={120} />
      <div role="group" aria-label={`Sticker for slide ${n}`} className="flex flex-wrap gap-2">
        {STICKERS.map((s) => <Chip key={s} selected={slide.sticker === s} aria-label={`Sticker ${s} for slide ${n}`} onClick={() => onChange({ sticker: slide.sticker === s ? undefined : s })}>{s}</Chip>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Location label" value={slide.location ?? ''} onChange={(e) => onChange({ location: e.target.value || undefined })} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`hl-${slide.id}`} className="text-sm font-medium">Itinerary highlight</label>
          <select id={`hl-${slide.id}`} value={slide.itemId ?? ''} onChange={(e) => onChange({ itemId: e.target.value || undefined })} className={field}>
            <option value="">None</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.startTime} {i.title}</option>)}
          </select>
        </div>
      </div>
    </li>
  )
}

function StoryForm({ trip, initial }: { trip: TripWithState; initial?: Story }) {
  const navigate = useNavigate()
  const memoryQuery = useMemories(trip.id)
  const memories = useMemo(() => memoryQuery.data ?? [], [memoryQuery.data])
  const plan = useTripPlan(trip.id).data
  const save = useSaveStory(trip.id)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [dayId, setDayId] = useState(initial?.dayId ?? '')
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'private')
  const [slides, setSlides] = useState<Slide[]>(initial?.slides ?? [])
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string>()

  const days = plan?.days ?? []
  const items = plan?.items ?? []
  const shown = useMemo(() => memories.filter((m) => !dayId || m.dayId === dayId), [memories, dayId])
  const itemChoices = items.filter((i) => !dayId || i.dayId === dayId)
  const used = new Set(slides.map((s) => s.memoryId).filter(Boolean))

  const toggle = (m: Memory) => setSlides((cur) => (cur.some((s) => s.memoryId === m.id) ? cur.filter((s) => s.memoryId !== m.id) : [...cur, { id: nanoid(8), memoryId: m.id, itemId: m.itemId }]))
  const patch = (id: string, p: Partial<Slide>) => setSlides((cur) => cur.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const move = (i: number, dir: -1 | 1) => setSlides((cur) => { const next = [...cur]; const [s] = next.splice(i, 1); next.splice(i + dir, 0, s!); return next })

  const draft = { title: title.trim() || 'Untitled story', slides }
  const submit = async () => {
    if (!title.trim()) return setError('Give your story a title.')
    if (slides.length === 0) return setError('Add at least one slide.')
    setError(undefined)
    try {
      const saved = await save.mutateAsync({ id: initial?.id, tripId: trip.id, title: title.trim(), dayId: dayId || undefined, visibility, slides })
      navigate(`/trips/${trip.id}/stories/${saved.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save the story.')
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div className="space-y-5">
        <h2 className="text-xl font-semibold">{initial ? 'Edit story' : 'Create a story'}</h2>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Day 2 — Bali" maxLength={60} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="story-day" className="text-sm font-medium">Show memories from</label>
          <select id="story-day" value={dayId} onChange={(e) => setDayId(e.target.value)} className={field}>
            <option value="">The whole trip</option>
            {days.map((d) => <option key={d.id} value={d.id}>Day {d.dayNumber}</option>)}
          </select>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Who can see it</legend>
          {VISIBILITY.map((v) => (
            <label key={v.value} className="flex min-h-touch items-start gap-3 rounded-md border border-border p-3">
              <input type="radio" name="visibility" checked={visibility === v.value} onChange={() => setVisibility(v.value)} className="mt-1 size-5 accent-primary" />
              <span><span className="block font-medium">{v.label}</span><span className="block text-sm text-fg-muted">{v.hint}</span></span>
            </label>
          ))}
        </fieldset>
        <section aria-labelledby="pick-h" className="space-y-2">
          <h3 id="pick-h" className="font-semibold">Pick memories</h3>
          {shown.length === 0 ? <p className="text-fg-muted">No memories here yet. <Link className="font-medium text-primary underline" to={`/trips/${trip.id}/memories/new`}>Add one</Link>.</p> : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {shown.map((m) => (
                <li key={m.id}>
                  <button type="button" aria-pressed={used.has(m.id)} aria-label={`${m.caption ?? (m.text ? m.text.slice(0, 40) : m.kind)} ${used.has(m.id) ? '(in story)' : ''}`.trim()} onClick={() => toggle(m)} className={cn('relative block w-full overflow-hidden rounded-md ring-offset-2', used.has(m.id) && 'ring-4 ring-primary')}>
                    <MemoryThumb memory={m} className="w-full" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Slides ({slides.length})</h3>
          <Button variant="secondary" size="sm" onClick={() => setSlides((c) => [...c, { id: nanoid(8) }])}><Plus aria-hidden className="size-4" /> Text slide</Button>
        </div>
        {slides.length === 0 ? <p className="rounded-md bg-surface-2 p-4 text-fg-muted">Choose memories on the left to build your story. Each one becomes a slide.</p> : (
          <ol className="space-y-3">
            {slides.map((s, i) => (
              <SlideRow key={s.id} slide={s} index={i} count={slides.length} memory={memories.find((m) => m.id === s.memoryId)} items={itemChoices} onChange={(p) => patch(s.id, p)} onMove={(d) => move(i, d)} onRemove={() => setSlides((c) => c.filter((x) => x.id !== s.id))} />
            ))}
          </ol>
        )}
        {error && <p role="alert" className="text-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void submit()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save story'}</Button>
          <Button variant="secondary" disabled={slides.length === 0} onClick={() => setPreview(true)}><Eye aria-hidden className="size-4" /> Preview</Button>
          <Button asChild variant="ghost"><Link to={`/trips/${trip.id}/memories`}>Cancel</Link></Button>
        </div>
      </div>
      {preview && <StoryViewer story={draft} memories={memories} items={items} onClose={() => setPreview(false)} />}
    </div>
  )
}

/** `/trips/:id/stories/new` and `/trips/:id/stories/:storyId/edit`. */
export function StoryCreator() {
  const trip = useOutletContext<TripWithState>()
  const { storyId } = useParams()
  const existing = useStory(storyId)
  if (storyId && existing.isPending) return <Skeleton className="h-96 w-full" />
  if (storyId && !existing.data) return <ErrorState title="Story not found" description="It may have been deleted." />
  return <StoryForm key={storyId ?? 'new'} trip={trip} initial={existing.data ?? undefined} />
}
