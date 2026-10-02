import { api, apiStream } from '@/lib/api'
import { AIUnavailableError, type AIService, type AIStreamEvent, type DayDiff, type ItineraryPreview } from './types'

/**
 * Client for the AI backend proxy at `/api/ai/*`. In development that proxy is the in-page mock
 * (src/mocks/handlers/ai.ts); in production the same endpoints are served by a serverless function
 * that holds the provider API key. The browser never talks to an LLM provider directly.
 */
export const aiService: AIService = {
  async *streamChat({ messages, context, conversationId, signal }): AsyncGenerator<AIStreamEvent> {
    let res: Response
    try {
      res = await apiStream('/api/ai/chat', { conversationId, messages, context }, signal)
    } catch (e) {
      if (signal?.aborted) return
      throw new AIUnavailableError()
    }
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
    } catch (e) {
      if (!signal?.aborted) throw new AIUnavailableError()
    } finally {
      reader.releaseLock()
    }
  },

  async generateItinerary(req, signal) {
    try {
      return await api<ItineraryPreview>('/api/ai/itinerary', { method: 'POST', json: req, signal })
    } catch {
      throw new AIUnavailableError()
    }
  },

  async regenerateDay(req, signal) {
    try {
      return await api<DayDiff>('/api/ai/regenerate-day', { method: 'POST', json: req, signal })
    } catch {
      throw new AIUnavailableError()
    }
  },
}
