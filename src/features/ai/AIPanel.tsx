import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { TripWithState } from '@/data/queries/trips'
import { aiRepo } from '@/data/repositories'
import { AIChat } from './AIChat'
import { PANEL_MAX, PANEL_MIN, useAIPanel } from './panelStore'

/** Desktop only: the assistant docked beside the itinerary/map so suggestions can be applied while looking at the plan. */
export function AIPanel({ trip }: { trip: TripWithState }) {
  const { width, setWidth, setOpen } = useAIPanel()
  const latest = useQuery({ queryKey: ['ai', 'conversations', trip.id], queryFn: async () => (await aiRepo.listConversations(trip.id))[0]?.id ?? null })
  const [picked, setPicked] = useState<string | null | undefined>(undefined)
  // Only an explicit "New conversation" remounts the chat; creating a conversation mid-chat must not.
  const [chatKey, setChatKey] = useState(0)
  const conversationId = picked === undefined ? (latest.data ?? undefined) : (picked ?? undefined)

  const startDrag = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const move = (ev: globalThis.PointerEvent) => setWidth(startW + (startX - ev.clientX)) // dragging left widens the panel
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setWidth(width + 24) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setWidth(width - 24) }
  }

  return (
    <>
      <div
        role="separator" aria-orientation="vertical" aria-label="Resize assistant panel" aria-valuemin={PANEL_MIN} aria-valuemax={PANEL_MAX} aria-valuenow={width}
        tabIndex={0} onPointerDown={startDrag} onKeyDown={onKey}
        className="hidden w-1.5 shrink-0 cursor-col-resize self-stretch rounded-full bg-border transition-colors hover:bg-primary/50 focus-visible:bg-primary lg:block"
      />
      <aside aria-label="AI assistant" style={{ width }} className="sticky top-[4.5rem] hidden h-[calc(100dvh-5.5rem)] shrink-0 flex-col rounded-lg border border-border bg-surface p-3 shadow-sm lg:flex">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Assistant</h2>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label="New conversation" onClick={() => { setPicked(null); setChatKey((k) => k + 1) }}><Plus aria-hidden className="size-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Close assistant" onClick={() => setOpen(false)}><X aria-hidden className="size-4" /></Button>
          </div>
        </div>
        <AIChat key={chatKey} trip={trip} conversationId={conversationId} onConversation={(id) => setPicked(id)} className="flex-1" />
      </aside>
    </>
  )
}
