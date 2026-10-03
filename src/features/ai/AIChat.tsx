import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, CloudOff, Sparkles, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDestination } from '@/data/queries/catalog'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { announce } from '@/lib/a11y/announce'
import { formatDateRange } from '@/lib/dates'
import { useNow } from '@/lib/hooks/useNow'
import { useOnline } from '@/lib/hooks/useOnline'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { AIMessage } from '@/types'
import { ActionCards } from './components/ActionCards'
import { buildTripContext } from './context'
import { useChat } from './useChat'

const TRIP_PROMPTS = ['What should I do next?', 'Add a sunset viewpoint to Day 3', 'Suggest vegetarian restaurants near my last stop', 'Make Day 2 less hectic', 'I don’t want to wake up early on Day 2', 'Find the shortest route for Day 3']
const GENERAL_PROMPTS = ['Plan a 5-day trip to Bali under ₹60,000', 'What should I do in Japan for 4 days?', 'Suggest vegetarian restaurants in Bali']

interface AIChatProps {
  trip?: TripWithState
  conversationId?: string
  /** Called once a new conversation has its first reply, so the caller can put its id in the URL. */
  onConversation?: (id: string) => void
  className?: string
}

/** The conversation itself: trip context, streamed replies with action cards, and the composer. */
export function AIChat({ trip, conversationId, onConversation, className }: AIChatProps) {
  const online = useOnline()
  const now = useNow()
  const plan = useTripPlan(trip?.id)
  const destination = useDestination(trip?.destinationIds[0])
  const context = useMemo(() => (trip ? buildTripContext(trip, plan.data, destination.data ?? undefined, now) : undefined), [trip, plan.data, destination.data, now])
  const chat = useChat({ conversationId, tripId: trip?.id, context })
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [chat.messages.length, chat.draft?.text])

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const value = text.trim()
    if (!value || chat.busy || !online) return
    setText('')
    announce('Message sent. The assistant is replying.')
    const id = await chat.send(value)
    if (id && !conversationId) onConversation?.(id)
    announce('The assistant replied.')
    input.current?.focus()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit() }
  }

  const empty = chat.messages.length === 0 && !chat.draft && !chat.loading
  const prompts = trip ? TRIP_PROMPTS : GENERAL_PROMPTS

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {trip ? (
        <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-primary/10 px-3 py-2 text-sm">
          <Sparkles aria-hidden className="size-4 shrink-0 text-primary" />
          <Link to={`/trips/${trip.id}`} className="font-semibold hover:underline">{trip.title}</Link>
          <span className="text-fg-muted">
            {formatDateRange(trip.startDate, trip.endDate)} · {trip.travellers.count} travellers{trip.budget.total ? ` · ${formatMoney(trip.budget.total)}` : ''}{context?.currentDay ? ` · Day ${context.currentDay}` : ''}
          </span>
        </p>
      ) : (
        <p className="mb-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg-muted">General travel questions. Choose a trip for answers that use your dates, budget and plan.</p>
      )}

      <div role="log" aria-label="Conversation" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2 pr-1">
        {chat.loading && <div className="space-y-2"><Skeleton className="h-12 w-2/3" /><Skeleton className="ml-auto h-10 w-1/2" /></div>}
        {empty && (
          <div className="space-y-4 py-6 text-center">
            <div aria-hidden className="mx-auto grid size-12 place-items-center rounded-full bg-primary/15 text-primary"><Sparkles className="size-6" /></div>
            <div>
              <h2 className="text-xl font-semibold">How can I help{trip ? ` with ${trip.title}` : ''}?</h2>
              <p className="text-fg-muted">I can suggest places, tidy a busy day or draft an itinerary. You approve every change.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">{prompts.map((p) => <Chip key={p} onClick={() => void chat.send(p).then((id) => id && !conversationId && onConversation?.(id))} disabled={!online}>{p}</Chip>)}</div>
          </div>
        )}
        {chat.messages.map((m) => <Message key={m.id} message={m} trip={trip} />)}
        {chat.draft && (
          <div className="flex gap-2" aria-hidden>
            <Avatar />
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-surface px-3.5 py-2.5 shadow-sm">
              {chat.draft.text ? <p className="whitespace-pre-wrap">{chat.draft.text}<span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-fg motion-safe:animate-pulse" /></p> : <p className="text-fg-muted">Thinking…</p>}
            </div>
          </div>
        )}
        {chat.error && (
          <div role="alert" className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm">
            <p className="font-semibold">{chat.error === 'quota' ? 'You’ve used today’s assistant allowance.' : chat.error === 'unavailable' ? 'The assistant is unavailable right now.' : 'Something went wrong with that reply.'}</p>
            <p className="text-fg-muted">{chat.error === 'quota' ? 'It renews at midnight. The rest of your trip works as normal.' : 'The rest of your trip works as normal. You can try again in a moment.'}</p>
            {chat.error !== 'quota' && <Button size="sm" className="mt-2" onClick={() => void chat.retry()}>Try again</Button>}
          </div>
        )}
        <div ref={end} />
      </div>

      {!online && <p role="status" className="mb-2 flex items-center gap-2 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning"><CloudOff aria-hidden className="size-4" /> You’re offline. The assistant needs a connection; your trip is still available.</p>}
      <form onSubmit={(e) => void submit(e)} className="flex items-end gap-2 border-t border-border pt-3">
        <label htmlFor="ai-composer" className="sr-only">Message the assistant</label>
        <textarea
          ref={input} id="ai-composer" rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
          placeholder={trip ? 'Ask about your trip…' : 'Ask about a destination…'}
          className="max-h-32 min-h-touch flex-1 resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5"
        />
        {chat.busy ? (
          <Button type="button" variant="secondary" size="icon" aria-label="Stop generating" onClick={chat.stop}><Square aria-hidden className="size-4 fill-current" /></Button>
        ) : (
          <Button type="submit" size="icon" aria-label="Send message" disabled={!text.trim() || !online}><ArrowUp aria-hidden className="size-5" /></Button>
        )}
      </form>
    </div>
  )
}

function Avatar() {
  return <span aria-hidden className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Sparkles className="size-4" /></span>
}

function Message({ message, trip }: { message: AIMessage; trip?: TripWithState }) {
  if (message.role === 'user') {
    return <div className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-primary-fg">{message.content}</p></div>
  }
  return (
    <div className="flex gap-2">
      <Avatar />
      <div className="min-w-0 max-w-[92%]">
        {message.content && <p className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-border bg-surface px-3.5 py-2.5 shadow-sm">{message.content}</p>}
        <ActionCards message={message} trip={trip} />
      </div>
    </div>
  )
}
