import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { aiRepo } from '@/data/repositories'
import { useServices } from '@/services'
import { AIQuotaError, AIUnavailableError, type TripContext } from '@/services/ai/types'
import { aiActionSchema, type AIAction, type AIMessage } from '@/types'

export type ChatError = 'unavailable' | 'quota' | 'failed' | null

const titleFrom = (text: string) => (text.length > 48 ? `${text.slice(0, 45).trimEnd()}…` : text)
const messagesKey = (id: string | undefined) => ['ai', 'messages', id] as const

/**
 * One conversation with the assistant: persisted messages, a streaming draft, stop and retry.
 * The conversation is created on the first message. Actions the model proposes are validated here and
 * stored on the message; nothing is applied to the trip until the user confirms a card.
 */
export function useChat({ conversationId, tripId, context }: { conversationId?: string; tripId?: string; context?: TripContext }) {
  const { ai } = useServices()
  const qc = useQueryClient()
  const [id, setId] = useState(conversationId)
  const [draft, setDraft] = useState<{ text: string; actions: AIAction[] } | null>(null)
  const [error, setError] = useState<ChatError>(null)
  const abort = useRef<AbortController | null>(null)
  const contextRef = useRef(context)
  contextRef.current = context

  // Following the URL to a *different* conversation resets the chat. The URL merely catching up with a
  // conversation we just created (same id) must not wipe state such as an error banner.
  const idRef = useRef(id)
  idRef.current = id
  useEffect(() => {
    if (conversationId && conversationId !== idRef.current) { setId(conversationId); setError(null) }
  }, [conversationId])
  useEffect(() => () => abort.current?.abort(), [])

  const messages = useQuery({ queryKey: messagesKey(id), enabled: !!id, queryFn: () => aiRepo.listMessages(id!) })

  const run = useCallback(async (convId: string, history: Pick<AIMessage, 'role' | 'content'>[]) => {
    abort.current?.abort()
    const ctrl = (abort.current = new AbortController())
    let text = ''
    const actions: AIAction[] = []
    setError(null)
    setDraft({ text: '', actions: [] })
    try {
      for await (const ev of ai.streamChat({ conversationId: convId, messages: history, context: contextRef.current, signal: ctrl.signal })) {
        if (ev.type === 'token') { text += ev.text; setDraft({ text, actions: [...actions] }) }
        else if (ev.type === 'action') {
          const parsed = aiActionSchema.safeParse(ev.action) // model output is untrusted
          if (parsed.success) actions.push(parsed.data)
          else console.warn('Dropped an invalid AI action', parsed.error.issues)
        } else if (ev.type === 'error') throw new Error(ev.message)
        else if (ev.type === 'done') break
      }
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof AIQuotaError ? 'quota' : e instanceof AIUnavailableError ? 'unavailable' : 'failed')
    } finally {
      if (text.trim() || actions.length) {
        // Keep what arrived, including a partial reply after Stop. A failure with nothing received saves nothing.
        await aiRepo.addMessage({ conversationId: convId, role: 'assistant', content: text.trim(), actions: actions.length ? actions : undefined })
      }
      setDraft(null)
      await qc.invalidateQueries({ queryKey: messagesKey(convId) })
      await qc.invalidateQueries({ queryKey: ['ai', 'conversations'] })
    }
  }, [ai, qc])

  const send = useCallback(async (raw: string): Promise<string | undefined> => {
    const text = raw.trim()
    if (!text || draft) return undefined
    let convId = id
    if (!convId) {
      convId = (await aiRepo.createConversation(titleFrom(text), tripId)).id
      setId(convId)
    }
    await aiRepo.addMessage({ conversationId: convId, role: 'user', content: text })
    await qc.invalidateQueries({ queryKey: messagesKey(convId) })
    const history = (await aiRepo.listMessages(convId)).map((m) => ({ role: m.role, content: m.content }))
    await run(convId, history)
    return convId
  }, [draft, id, qc, run, tripId])

  /** Re-asks the last question after a failure. */
  const retry = useCallback(async () => {
    if (!id || draft) return
    const history = (await aiRepo.listMessages(id)).map((m) => ({ role: m.role, content: m.content }))
    if (history.at(-1)?.role === 'user') await run(id, history)
  }, [draft, id, run])

  const stop = useCallback(() => abort.current?.abort(), [])

  return { conversationId: id, messages: messages.data ?? [], loading: !!id && messages.isPending, draft, busy: draft !== null, error, send, retry, stop }
}
