import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { History, MessageSquarePlus } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTrip, useTrips } from '@/data/queries/trips'
import { aiRepo } from '@/data/repositories'
import { cn } from '@/lib/cn'
import type { AIConversation } from '@/types'
import { AIChat } from './AIChat'

/** `/ai`, `/ai/:conversationId`, `/trips/:tripId/ai[/:conversationId]` — the full-page assistant. */
export default function AIRoute() {
  const { tripId: routeTripId, conversationId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const [historyOpen, setHistoryOpen] = useState(false)
  // Opening another conversation (or "New chat") resets the chat; the URL catching up after creating one does not.
  const createdId = useRef<string | undefined>(conversationId)
  const [chatKey, setChatKey] = useState(0)
  useEffect(() => {
    if (conversationId !== createdId.current) setChatKey((k) => k + 1)
    createdId.current = conversationId
  }, [conversationId])
  const trips = useTrips()
  const conversations = useQuery({ queryKey: ['ai', 'conversations', routeTripId ?? 'all'], queryFn: () => aiRepo.listConversations(routeTripId) })

  const conversation = conversations.data?.find((c) => c.id === conversationId)
  const tripParam = search.get('trip')
  // A trip-scoped URL wins; then the explicit ?trip=; then the conversation's own trip; then the trip you're most likely on.
  const defaultTripId = useMemo(() => {
    const list = trips.data ?? []
    return (list.find((t) => t.effectiveState === 'active') ?? list.filter((t) => ['upcoming', 'ready', 'planning', 'draft'].includes(t.effectiveState)).sort((a, b) => a.startDate.localeCompare(b.startDate))[0])?.id
  }, [trips.data])
  const tripId = routeTripId ?? (tripParam === 'none' ? undefined : (tripParam ?? conversation?.tripId ?? (conversationId ? undefined : defaultTripId)))
  const routeTrip = useTrip(routeTripId)
  const trip = routeTripId ? routeTrip.data ?? undefined : trips.data?.find((t) => t.id === tripId)

  const base = routeTripId ? `/trips/${routeTripId}/ai` : '/ai'
  const hrefFor = (c: AIConversation) => `${base}/${c.id}`

  const pickTrip = (id: string) => {
    const p = new URLSearchParams(search)
    p.set('trip', id)
    navigate(`/ai?${p}`) // switching trip starts a fresh conversation
  }

  if (routeTripId && routeTrip.isError) return <ErrorState as="h1" title="Couldn’t open this trip’s assistant" onRetry={() => void routeTrip.refetch()} />
  if (routeTripId && routeTrip.isPending) return <Skeleton className="h-96" />

  const history = (
    <nav aria-label="Conversations">
      <Button asChild variant="secondary" className="mb-3 w-full" onClick={() => setHistoryOpen(false)}><Link to={routeTripId ? base : `/ai${tripId ? `?trip=${tripId}` : ''}`}><MessageSquarePlus aria-hidden className="size-4" /> New chat</Link></Button>
      {conversations.isPending && <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>}
      {conversations.data && conversations.data.length === 0 && <p className="px-1 text-sm text-fg-muted">Your conversations will be listed here.</p>}
      <ul className="space-y-1">
        {conversations.data?.map((c) => (
          <li key={c.id}>
            <Link to={hrefFor(c)} onClick={() => setHistoryOpen(false)} aria-current={c.id === conversationId ? 'page' : undefined} className={cn('block rounded-md px-3 py-2 text-sm', c.id === conversationId ? 'bg-primary/15 font-semibold text-primary' : 'hover:bg-surface-2')}>
              <span className="line-clamp-2">{c.title}</span>
              <span className="text-xs font-normal text-fg-muted">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
      <aside className="hidden lg:block">{history}</aside>
      <section aria-label="AI Assistant" className="mx-auto flex h-[calc(100dvh-9.5rem)] w-full max-w-3xl min-w-0 flex-col sm:h-[calc(100dvh-7.5rem)] lg:mx-0">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <div className="flex items-center gap-2">
            {!routeTripId && (
              <div className="flex items-center gap-2">
                <label htmlFor="ai-trip" className="sr-only">Trip for context</label>
                <select id="ai-trip" value={tripId ?? 'none'} onChange={(e) => pickTrip(e.target.value)} className="min-h-touch max-w-48 rounded-md border border-border-strong bg-surface px-2 text-sm">
                  <option value="none">General questions</option>
                  {trips.data?.filter((t) => t.effectiveState !== 'archived').map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
            )}
            <Button variant="secondary" className="lg:hidden" onClick={() => setHistoryOpen(true)}><History aria-hidden className="size-4" /> History</Button>
          </div>
        </header>
        <AIChat
          key={`${tripId ?? 'none'}:${chatKey}`}
          trip={trip} conversationId={conversationId}
          onConversation={(id) => {
            createdId.current = id // the URL is catching up with a chat that already exists: don't reset it
            navigate(`${base}/${id}${!routeTripId && tripId ? `?trip=${tripId}` : ''}`, { replace: true })
          }}
          className="flex-1"
        />
      </section>
      <ResponsiveSheet open={historyOpen} onOpenChange={setHistoryOpen} title="Conversations" wide="panel">{history}</ResponsiveSheet>
      {conversations.isError && <EmptyState title="Couldn’t load your conversations" />}
    </div>
  )
}
