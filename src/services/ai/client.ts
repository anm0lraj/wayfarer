import { api, apiStream, ApiError } from '@/lib/api'
import { AIQuotaError, AIUnavailableError, type AIService, type AIStreamEvent, type CatalogueEntry, type DayDiff, type ItineraryPreview } from './types'

export interface AiClientOptions {
  /** The signed-in person's Firebase ID token, so the server knows who is asking (the real backend only). */
  getToken?: () => Promise<string | null>
  /** Places the assistant may recommend for a destination. The real model has no catalogue of its own, so it is sent along. */
  catalogue?: (destinationId: string) => Promise<CatalogueEntry[]>
}

/**
 * Client for the AI backend proxy at `/api/ai/*`. With the demo backend that proxy is the in-page mock
 * (src/mocks/handlers/ai.ts); with the real one it is the serverless functions in `api/ai/`, which hold the provider key
 * and answer in the same shapes. The browser never talks to an LLM provider directly.
 */
export function createAiClient(options: AiClientOptions = {}): AIService {
  const headers = async (): Promise<Record<string, string>> => {
    const token = await options.getToken?.()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  const places = async (destinationId: string | undefined) => (destinationId && options.catalogue ? options.catalogue(destinationId) : undefined)

  /** Turns the server's refusals into the errors the screens know how to explain. */
  const fail = (e: unknown): never => {
    if (e instanceof AIUnavailableError) throw e
    if (e instanceof ApiError && e.status === 429) throw new AIQuotaError()
    throw new AIUnavailableError()
  }

  return {
    async *streamChat({ messages, context, conversationId, signal }): AsyncGenerator<AIStreamEvent> {
      let res: Response
      try {
        res = await apiStream('/api/ai/chat', { conversationId, messages, context, catalogue: await places(context?.destination?.id) }, signal, await headers())
      } catch {
        if (signal?.aborted) return
        throw new AIUnavailableError()
      }
      if (res.status === 429) throw new AIQuotaError()
      if (!res.ok || !res.body) throw new AIUnavailableError()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let nl: number
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim()
            buffer = buffer.slice(nl + 1)
            if (line) yield JSON.parse(line) as AIStreamEvent
          }
        }
      } catch {
        if (!signal?.aborted) throw new AIUnavailableError()
      } finally {
        reader.releaseLock()
      }
    },

    async generateItinerary(req, signal) {
      try {
        return await api<ItineraryPreview>('/api/ai/itinerary', { method: 'POST', json: { ...req, catalogue: await places(req.destinationId) }, headers: await headers(), signal, timeoutMs: 60_000 })
      } catch (e) {
        return fail(e)
      }
    },

    async regenerateDay(req, signal) {
      try {
        return await api<DayDiff>('/api/ai/regenerate-day', { method: 'POST', json: { ...req, catalogue: await places(req.destinationId) }, headers: await headers(), signal, timeoutMs: 60_000 })
      } catch (e) {
        return fail(e)
      }
    },
  }
}
