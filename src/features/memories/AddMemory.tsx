import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { Camera, FileText, ImagePlus, LocateFixed, MapPin, Mic, Square, Video } from 'lucide-react'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { useMemoryRefresh } from '@/data/queries/memories'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { memoryRepo } from '@/data/repositories'
import { processMemoryUploads } from '@/data/uploadQueue'
import { readExif } from '@/lib/media/exif'
import { compressToFit } from '@/lib/media/image'
import { useOnline } from '@/lib/hooks/useOnline'
import { useServices } from '@/services'
import { clock } from '@/services/clock/clock'
import type { GeoPoint, Memory } from '@/types'
import { attachToPlan, capturedIso } from './attach'
import { useVoiceRecorder } from './useVoiceRecorder'

type Kind = Memory['kind']
const KINDS: Array<{ kind: Kind; label: string; icon: typeof Camera }> = [
  { kind: 'photo', label: 'Photo', icon: Camera }, { kind: 'video', label: 'Video', icon: Video }, { kind: 'text', label: 'Note', icon: FileText },
  { kind: 'voice', label: 'Voice note', icon: Mic }, { kind: 'location', label: 'Place', icon: MapPin },
]
const field = 'min-h-touch w-full rounded-md border border-border-strong bg-surface px-3 text-base'

/** EXIF is a bonus: if the file can't be read for any reason we carry on without it. */
async function readBuffer(f: Blob): Promise<ArrayBuffer> {
  try { return await f.arrayBuffer() } catch { return new ArrayBuffer(0) }
}

function LocationPicker({ point, required, onChange }: { point?: GeoPoint; required: boolean; onChange: (p?: GeoPoint) => void }) {
  const { geolocation } = useServices()
  const [state, setState] = useState<'idle' | 'locating' | 'denied' | 'error'>('idle')
  const find = async () => {
    setState('locating')
    try { onChange(await geolocation.getPosition()); setState('idle') } catch (e) { setState((e as { code?: number }).code === 1 ? 'denied' : 'error') }
  }
  if (!geolocation.isSupported()) return required ? <p className="text-fg-muted">This browser can’t share your location, so a place can’t be added.</p> : null
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="font-medium">{required ? 'Where are you?' : 'Add where you are (optional)'}</p>
      {point ? (
        <p className="flex flex-wrap items-center gap-3 text-fg-muted">
          <span>{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</span>
          <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>Remove</Button>
        </p>
      ) : (
        <>
          <p className="text-sm text-fg-muted">We’ll ask your browser for your location once, right now. It isn’t tracked, and it’s hidden on public pages unless you choose otherwise.</p>
          <Button variant="secondary" onClick={() => void find()} disabled={state === 'locating'}><LocateFixed aria-hidden className="size-4" /> {state === 'locating' ? 'Finding you…' : 'Use my current location'}</Button>
        </>
      )}
      {state === 'denied' && <p role="alert" className="text-sm text-error">Location is blocked for this site. Allow it in your browser’s site settings, or skip it.</p>}
      {state === 'error' && <p role="alert" className="text-sm text-error">We couldn’t find your location. Try again, or skip it.</p>}
    </div>
  )
}

function VoiceSection({ onBlob, maxSeconds }: { onBlob: (b: Blob | undefined) => void; maxSeconds: number }) {
  const { state, start, stop, reset } = useVoiceRecorder(maxSeconds)
  useEffect(() => { onBlob(state.kind === 'recorded' ? state.blob : undefined) }, [state, onBlob])
  switch (state.kind) {
    case 'unsupported': return <p className="text-fg-muted">This browser can’t record audio. You can add a note instead.</p>
    case 'denied': return <p role="alert" className="text-error">Microphone access is blocked for this site. Allow it in your browser’s site settings to record, or add a note instead.</p>
    case 'error': return <div className="space-y-2"><p role="alert" className="text-error">{state.message}</p><Button variant="secondary" onClick={() => void start()}>Try again</Button></div>
    case 'recording': return <div className="space-y-3"><p role="status" className="flex items-center gap-2 font-medium"><span aria-hidden className="size-3 rounded-full bg-error motion-safe:animate-pulse" /> Recording…</p><Button variant="danger" onClick={stop}><Square aria-hidden className="size-4" /> Stop</Button></div>
    case 'recorded': return <div className="space-y-3"><audio src={state.url} controls aria-label="Your recording" className="w-full" /><Button variant="secondary" onClick={reset}>Record again</Button></div>
    default: return <div className="space-y-2"><p className="text-sm text-fg-muted">Your browser will ask to use the microphone. It’s only on while you record. Voice notes can be up to {maxSeconds >= 120 ? `${Math.round(maxSeconds / 60)} minutes` : `${maxSeconds} seconds`}.</p><Button variant="secondary" onClick={() => void start()}><Mic aria-hidden className="size-4" /> Start recording</Button></div>
  }
}

/** `/trips/:id/memories/new` — capture a photo, video, note, voice note or place (spec §21). */
export function AddMemory() {
  const trip = useOutletContext<TripWithState>()
  const plan = useTripPlan(trip.id)
  const { storage } = useServices()
  const navigate = useNavigate()
  const refresh = useMemoryRefresh()
  const online = useOnline()
  const [params] = useSearchParams()

  const [kind, setKind] = useState<Kind>('photo')
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<string>()
  const [voice, setVoice] = useState<Blob>()
  const [caption, setCaption] = useState('')
  const [text, setText] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [point, setPoint] = useState<GeoPoint>()
  const [taken, setTaken] = useState<string>()
  const [itemChoice, setItemChoice] = useState(params.get('item') ?? 'auto')
  const [keepPrivate, setKeepPrivate] = useState(true)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const nowRef = useRef(clock.now().toISOString())

  const capturedAt = taken ?? nowRef.current
  const auto = useMemo(() => (plan.data ? attachToPlan(capturedAt, trip.timezone, plan.data.days, plan.data.items) : {}), [plan.data, capturedAt, trip.timezone])
  const chosen = itemChoice === 'auto' ? auto.itemId : itemChoice === 'none' ? undefined : itemChoice
  const chosenItem = plan.data?.items.find((i) => i.id === chosen)
  const dayId = chosenItem?.dayId ?? auto.dayId
  const dayItems = plan.data?.items.filter((i) => i.dayId === (auto.dayId ?? chosenItem?.dayId)) ?? []
  const autoTitle = plan.data?.items.find((i) => i.id === auto.itemId)?.title

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const switchKind = (k: Kind) => { setKind(k); setFile(undefined); setPreview(undefined); setError(undefined); setTaken(undefined); if (k !== 'location') setPoint(undefined) }

  const onFile = async (f: File | undefined) => {
    setError(undefined)
    if (!f) return
    if (kind === 'video' && f.size > storage.limits.maxBytes) return setError(`That video is over ${Math.round(storage.limits.maxBytes / 1024 / 1024)} MB. Try a shorter clip.`)
    if (kind === 'photo' && !f.type.startsWith('image/')) return setError('Please choose an image.')
    setFile(f)
    setPreview(kind === 'photo' ? URL.createObjectURL(f) : undefined)
    if (kind === 'photo') {
      const exif = readExif(await readBuffer(f))
      setTaken(exif.takenAt ? capturedIso(exif.takenAt, trip.timezone) : undefined)
      if (exif.point) setPoint(exif.point)
    }
  }

  const save = async () => {
    setError(undefined)
    if ((kind === 'photo' || kind === 'video') && !file) return setError(kind === 'photo' ? 'Choose or take a photo first.' : 'Choose or record a video first.')
    if (kind === 'voice' && !voice) return setError('Record a voice note first.')
    if (kind === 'text' && !text.trim()) return setError('Write something first.')
    if (kind === 'location' && !point) return setError('Add your location first.')
    setSaving(true)
    try {
      let mediaKey: string | undefined
      const blob = kind === 'photo' ? file && (await compressToFit(file, storage.limits.maxBytes)) : kind === 'video' ? file : kind === 'voice' ? voice : undefined
      if (blob && blob.size > storage.limits.maxBytes) throw new Error(kind === 'voice' ? 'That recording is too long to save. Record a shorter one.' : 'That file is too large to save.')
      if (blob) mediaKey = (await storage.upload(blob, { path: `trips/${trip.id}/memories` })).key
      await memoryRepo.add({
        tripId: trip.id, kind, caption: caption.trim() || undefined, text: kind === 'text' ? text.trim() : kind === 'location' ? placeName.trim() || undefined : undefined,
        mediaKey, capturedAt, point, dayId, itemId: chosen, uploadState: mediaKey ? 'queued' : 'done', stripLocationOnPublic: keepPrivate,
      })
      await refresh(trip.id)
      if (mediaKey) void processMemoryUploads(storage).then(() => refresh(trip.id)) // no-op while offline
      toast({ title: 'Memory saved', description: mediaKey ? (online ? 'Uploading in the background.' : 'Saved on this device — it will upload when you’re back online.') : undefined })
      navigate(`/trips/${trip.id}/memories`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save that memory.')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Add a memory</h2>
        <p className="text-fg-muted">It’s filed under the right day and activity automatically.</p>
      </div>

      <div role="group" aria-label="Type of memory" className="flex flex-wrap gap-2">
        {KINDS.filter((k) => k.kind !== 'video' || storage.limits.video).map((k) => <Chip key={k.kind} selected={kind === k.kind} onClick={() => switchKind(k.kind)}><k.icon aria-hidden className="size-4" /> {k.label}</Chip>)}
      </div>

      {(kind === 'photo' || kind === 'video') && (
        <div className="space-y-3">
          {preview && <img src={preview} alt="Preview of your photo" className="aspect-[4/3] w-full rounded-lg object-cover" />}
          {file && kind === 'video' && <p className="rounded-md bg-surface-2 px-3 py-2">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <label className="cursor-pointer">
                {kind === 'photo' ? <Camera aria-hidden className="size-4" /> : <Video aria-hidden className="size-4" />} {kind === 'photo' ? 'Take a photo' : 'Record a video'}
                <input type="file" className="sr-only" accept={kind === 'photo' ? 'image/*' : 'video/*'} capture="environment" onChange={(e) => void onFile(e.target.files?.[0])} />
              </label>
            </Button>
            <Button asChild variant="secondary">
              <label className="cursor-pointer">
                <ImagePlus aria-hidden className="size-4" /> Choose {kind === 'photo' ? 'a photo' : 'a video'}
                <input type="file" className="sr-only" accept={kind === 'photo' ? 'image/*' : 'video/*'} onChange={(e) => void onFile(e.target.files?.[0])} />
              </label>
            </Button>
          </div>
          {taken && <p className="text-sm text-fg-muted">Using the time the photo was taken.</p>}
        </div>
      )}

      {kind === 'text' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mem-text" className="text-sm font-medium">Your note</label>
          <textarea id="mem-text" value={text} onChange={(e) => setText(e.target.value)} rows={5} className={`${field} py-2`} placeholder="What do you want to remember?" />
        </div>
      )}
      {kind === 'voice' && <VoiceSection onBlob={setVoice} maxSeconds={storage.limits.voiceSeconds} />}
      {kind === 'location' && <Input label="Name of the place (optional)" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />}

      {(kind === 'location' || kind === 'photo' || kind === 'video' || kind === 'text') && <LocationPicker point={point} required={kind === 'location'} onChange={setPoint} />}
      {point && (
        <label className="flex min-h-touch items-center gap-3">
          <input type="checkbox" checked={keepPrivate} onChange={(e) => setKeepPrivate(e.target.checked)} className="size-5 accent-primary" />
          Hide this location if I share the trip publicly
        </label>
      )}

      {kind !== 'text' && <Input label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Sunset at Seminyak Beach" />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="mem-item" className="text-sm font-medium">Activity</label>
        <select id="mem-item" value={itemChoice} onChange={(e) => setItemChoice(e.target.value)} className={field}>
          <option value="auto">{autoTitle ? `Automatic — ${autoTitle}` : 'Automatic'}</option>
          <option value="none">None</option>
          {dayItems.map((i) => <option key={i.id} value={i.id}>{i.startTime} {i.title}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="text-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save memory'}</Button>
        <Button asChild variant="ghost"><Link to={`/trips/${trip.id}/memories`}>Cancel</Link></Button>
      </div>
    </div>
  )
}
