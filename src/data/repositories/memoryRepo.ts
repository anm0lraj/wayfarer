import { db } from '../db'
import { del, newId, nowIso, put, requireActor, requireTripAccess } from './shared'
import { memorySchema, storySchema } from '@/types'
import type { Memory, Story } from '@/types'

export type NewMemoryInput = Pick<Memory, 'tripId' | 'kind'> &
  Partial<Pick<Memory, 'caption' | 'text' | 'mediaKey' | 'capturedAt' | 'point' | 'dayId' | 'itemId' | 'uploadState'>>

export const memoryRepo = {
  async list(tripId: string): Promise<Memory[]> {
    await requireTripAccess(tripId, 'view')
    return (await db.memories.where('tripId').equals(tripId).toArray()).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
  },

  async add(input: NewMemoryInput): Promise<Memory> {
    await requireTripAccess(input.tripId, 'edit')
    const now = nowIso()
    const memory = memorySchema.parse({
      capturedAt: now, uploadState: 'done', stripLocationOnPublic: true, ...input,
      id: newId('mem'), authorId: requireActor(), createdAt: now, updatedAt: now,
    })
    await put('memories', db.memories, memory)
    return memory
  },

  async update(id: string, patch: Partial<Pick<Memory, 'caption' | 'uploadState' | 'mediaKey' | 'stripLocationOnPublic'>>): Promise<void> {
    const m = await db.memories.get(id)
    if (!m) return
    await requireTripAccess(m.tripId, 'edit')
    await put('memories', db.memories, { ...m, ...patch, updatedAt: nowIso() })
  },

  async remove(id: string): Promise<void> {
    const m = await db.memories.get(id)
    if (!m) return
    await requireTripAccess(m.tripId, 'edit')
    await del('memories', db.memories, id)
  },
}

export const storyRepo = {
  async list(tripId: string): Promise<Story[]> {
    await requireTripAccess(tripId, 'view')
    return db.stories.where('tripId').equals(tripId).toArray()
  },

  async save(input: Omit<Story, 'id' | 'authorId' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Story> {
    await requireTripAccess(input.tripId, 'edit')
    const existing = input.id ? await db.stories.get(input.id) : undefined
    const now = nowIso()
    const story = storySchema.parse({ ...input, id: input.id ?? newId('story'), authorId: requireActor(), createdAt: existing?.createdAt ?? now, updatedAt: now })
    await put('stories', db.stories, story)
    return story
  },

  async remove(id: string): Promise<void> {
    const s = await db.stories.get(id)
    if (!s) return
    await requireTripAccess(s.tripId, 'edit')
    await del('stories', db.stories, id)
  },
}
