import { db } from '../db'
import { del, newId, nowIso, put, requireActor } from './shared'
import { itineraryRepo } from './itineraryRepo'
import { aiActionSchema, aiMessageSchema } from '@/types'
import type { AIAction, AIConversation, AIMessage } from '@/types'

export const aiRepo = {
  async listConversations(tripId?: string): Promise<AIConversation[]> {
    const mine = await db.aiConversations.where('userId').equals(requireActor()).toArray()
    return mine.filter((c) => (tripId ? c.tripId === tripId : true)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async createConversation(title: string, tripId?: string): Promise<AIConversation> {
    const c: AIConversation = { id: newId('conv'), userId: requireActor(), tripId, title, createdAt: nowIso() }
    await put('aiConversations', db.aiConversations, c)
    return c
  },

  async rename(id: string, title: string): Promise<void> {
    const c = await db.aiConversations.get(id)
    if (c) await put('aiConversations', db.aiConversations, { ...c, title })
  },

  async removeConversation(id: string): Promise<void> {
    // Queued like every other write, or the chat comes back from the server on the next download.
    for (const m of await db.aiMessages.where('conversationId').equals(id).toArray()) await del('aiMessages', db.aiMessages, m.id)
    await del('aiConversations', db.aiConversations, id)
  },

  listMessages: async (conversationId: string): Promise<AIMessage[]> =>
    (await db.aiMessages.where('conversationId').equals(conversationId).toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),

  async addMessage(input: Pick<AIMessage, 'conversationId' | 'role' | 'content'> & Partial<Pick<AIMessage, 'actions'>>): Promise<AIMessage> {
    const m = aiMessageSchema.parse({ ...input, id: newId('msg'), createdAt: nowIso() })
    await put('aiMessages', db.aiMessages, m)
    return m
  },

  async setActionState(messageId: string, actionIndex: number, state: 'pending' | 'applied' | 'dismissed' | 'undone'): Promise<void> {
    const m = await db.aiMessages.get(messageId)
    if (m) await put('aiMessages', db.aiMessages, { ...m, actionStates: { ...m.actionStates, [String(actionIndex)]: state } })
  },
}

export interface AppliedAction {
  /** Reverses the change (powers the Undo toast). */
  undo: () => Promise<void>
  summary: string
}

/**
 * Applies a model-proposed action. The input is untrusted: it is Zod-validated, then executed through
 * the same repositories (and permission checks) as a user edit — the model never writes data directly.
 */
export async function applyAIAction(tripId: string, raw: unknown): Promise<AppliedAction> {
  const action: AIAction = aiActionSchema.parse(raw)
  const days = await itineraryRepo.listDays(tripId)
  const dayByNumber = (n: number) => {
    const d = days.find((x) => x.dayNumber === n)
    if (!d) throw new Error(`Day ${n} is not part of this trip`)
    return d
  }
  switch (action.type) {
    case 'ADD_ACTIVITY': {
      const item = await itineraryRepo.addItem(tripId, dayByNumber(action.dayNumber).id, { ...action.item, source: 'ai' })
      return { summary: `Added “${item.title}” to Day ${action.dayNumber}`, undo: async () => void (await itineraryRepo.removeItem(item.id)) }
    }
    case 'REMOVE_ACTIVITY': {
      const removed = await itineraryRepo.removeItem(action.itemId)
      return { summary: `Removed “${removed.title}”`, undo: () => itineraryRepo.restoreItem(removed) }
    }
    case 'MOVE_ACTIVITY': {
      const before = (await db.items.get(action.itemId))!
      await itineraryRepo.moveItem(action.itemId, dayByNumber(action.toDayNumber).id, action.position)
      return { summary: `Moved “${before.title}” to Day ${action.toDayNumber}`, undo: () => itineraryRepo.moveItem(before.id, before.dayId, before.position) }
    }
    case 'REORDER_ITINERARY':
    case 'OPTIMIZE_ROUTE': {
      const day = dayByNumber(action.dayNumber)
      const prev = (await db.items.where('dayId').equals(day.id).toArray()).sort((a, b) => a.position - b.position).map((i) => i.id)
      await itineraryRepo.reorder(day.id, action.itemIds)
      return {
        summary: action.type === 'OPTIMIZE_ROUTE' ? `Optimised the route for Day ${action.dayNumber}` : `Reordered Day ${action.dayNumber}`,
        undo: () => itineraryRepo.reorder(day.id, prev),
      }
    }
    case 'CREATE_ITINERARY': {
      const added: string[] = []
      for (const [i, d] of action.days.entries()) {
        const day = days[i]
        if (!day) break
        if (d.title) await itineraryRepo.updateDay(day.id, { title: d.title })
        for (const it of d.items) added.push((await itineraryRepo.addItem(tripId, day.id, { ...it, source: 'ai' })).id)
      }
      return { summary: `Created a ${action.days.length}-day itinerary`, undo: async () => { for (const id of added) await itineraryRepo.removeItem(id) } }
    }
    case 'SUGGEST_PLACES':
    case 'FIND_RESTAURANTS':
      // Read-only suggestions: rendered as cards by the AI feature; nothing to write.
      return { summary: 'Suggestions ready', undo: async () => {} }
  }
}
