import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Pause, Play, X } from 'lucide-react'
import { useMediaUrl } from '@/data/queries/media'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import type { ItineraryItem, Memory, Story } from '@/types'

const SLIDE_MS = 6000

interface Props {
  story: Pick<Story, 'title' | 'slides'>
  memories: Memory[]
  items: ItineraryItem[]
  onClose: () => void
}

function Backdrop({ memory }: { memory?: Memory }) {
  const url = useMediaUrl(memory?.mediaKey)
  if (!memory) return <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
  if (memory.kind === 'photo') return url ? <img src={url} alt={memory.caption ?? ''} className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0 bg-slate-800" />
  if (memory.kind === 'video') return url ? <video src={url} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" aria-label={memory.caption ?? 'Video'} /> : <div className="absolute inset-0 bg-slate-800" />
  if (memory.kind === 'voice') return <div className="absolute inset-0 grid place-items-center bg-slate-800 p-6">{url && <audio src={url} controls aria-label={memory.caption ?? 'Voice note'} className="w-full" />}</div>
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-amber-700 to-rose-900 p-8">
      <p className="text-center text-2xl font-semibold leading-snug text-white">{memory.kind === 'text' ? memory.text : memory.text || memory.caption}</p>
    </div>
  )
}

/**
 * Story player. Phone: full screen, tap the right/left side to move. Desktop: a centred 9:16 stage with
 * arrow keys. Auto-advances every 6 s, pausable, and does not auto-advance with reduced motion.
 */
export function StoryViewer({ story, memories, items, onClose }: Props) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const slides = story.slides
  const slide = slides[index]
  const memory = useMemo(() => memories.find((m) => m.id === slide?.memoryId), [memories, slide?.memoryId])
  const item = items.find((i) => i.id === slide?.itemId)
  const hasPlayer = memory?.kind === 'video' || memory?.kind === 'voice'
  const auto = !paused && !reduced && !hasPlayer

  const next = useCallback(() => (index + 1 >= slides.length ? onClose() : setIndex(index + 1)), [index, slides.length, onClose])
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    if (!auto) return
    const id = setTimeout(next, SLIDE_MS)
    return () => clearTimeout(id)
  }, [auto, index, next])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  if (!slide) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={`Story: ${story.title}`} className="fixed inset-0 z-[60] grid place-items-center bg-black/90 sm:p-4">
      <div className="relative h-full w-full overflow-hidden bg-slate-900 text-white sm:h-[min(100%,52rem)] sm:w-auto sm:aspect-[9/16] sm:rounded-xl">
        <Backdrop memory={memory} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute inset-x-0 top-0 z-10 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1" role="progressbar" aria-label="Story progress" aria-valuemin={1} aria-valuemax={slides.length} aria-valuenow={index + 1} aria-valuetext={`Slide ${index + 1} of ${slides.length}`}>
            {slides.map((s, i) => (
              <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  key={i === index ? `${index}-${auto}` : i}
                  className={cn('block h-full bg-white', i < index || (i === index && !auto) ? 'w-full' : i === index ? 'motion-safe:animate-[story-progress_6s_linear_forwards]' : 'w-0')}
                />
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-semibold drop-shadow">{story.title}</p>
            <div className="flex items-center">
              <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play' : 'Pause'} className="grid min-h-touch min-w-touch place-items-center">
                {paused ? <Play aria-hidden className="size-5" /> : <Pause aria-hidden className="size-5" />}
              </button>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Close story" className="grid min-h-touch min-w-touch place-items-center"><X aria-hidden className="size-6" /></button>
            </div>
          </div>
        </div>

        {/* Tap zones: left third goes back, the rest goes forward. Keyboard users have the arrow keys; desktop also has visible arrow buttons. */}
        <button type="button" tabIndex={-1} aria-hidden onClick={prev} className="absolute inset-y-24 left-0 w-1/3" />
        <button type="button" tabIndex={-1} aria-hidden onClick={next} className="absolute inset-y-24 right-0 w-2/3" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 space-y-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {slide.sticker && <p aria-hidden className="text-6xl drop-shadow">{slide.sticker}</p>}
          {slide.text && <p className="text-2xl font-bold leading-snug drop-shadow">{slide.text}</p>}
          {memory?.caption && memory.kind !== 'text' && <p className="text-sm opacity-90">{memory.caption}</p>}
          <div className="flex flex-wrap gap-2">
            {slide.location && <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-sm"><MapPin aria-hidden className="size-4" />{slide.location}</span>}
            {item && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-slate-900">{item.startTime} · {item.title}</span>}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 hidden items-center justify-between px-2 sm:flex">
          <button type="button" onClick={prev} disabled={index === 0} aria-label="Previous slide" className="pointer-events-auto grid size-11 place-items-center rounded-full bg-black/40 disabled:opacity-30"><ChevronLeft aria-hidden className="size-6" /></button>
          <button type="button" onClick={next} aria-label={index + 1 === slides.length ? 'Finish story' : 'Next slide'} className="pointer-events-auto grid size-11 place-items-center rounded-full bg-black/40"><ChevronRight aria-hidden className="size-6" /></button>
        </div>
      </div>
    </div>
  )
}
