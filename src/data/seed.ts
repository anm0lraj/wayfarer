import type { TravelDB } from './db'
import { db as defaultDb } from './db'

/** Bump when fixtures change so existing IndexedDB data reseeds. */
export const SEED_VERSION = 10

async function write(db: TravelDB) {
  // The fixtures are large and only needed on first run (or after a reset), so they load on demand.
  const { buildSeed } = await import('./seedData')
  const s = buildSeed()
  await db.transaction('rw', db.tables, async () => {
    await Promise.all([
      db.users.bulkPut(s.users), db.destinations.bulkPut(s.destinations), db.places.bulkPut(s.places), db.hotels.bulkPut(s.hotels),
      db.flights.bulkPut(s.flights), db.trips.bulkPut(s.trips), db.days.bulkPut(s.days), db.items.bulkPut(s.items),
      db.checklist.bulkPut(s.checklist), db.bookings.bulkPut(s.bookings), db.memories.bulkPut(s.memories), db.stories.bulkPut(s.stories),
      db.publicTrips.bulkPut(s.publicTrips), db.notifications.bulkPut(s.notifications), db.collaborators.bulkPut(s.collaborators),
      db.aiConversations.bulkPut(s.aiConversations),
    ])
    await db.meta.put({ key: 'seedVersion', value: SEED_VERSION })
  })
}

/** Seeds the database on first run (or when the seed version changes). Returns true when it wrote data. */
export async function seedIfNeeded(db: TravelDB = defaultDb): Promise<boolean> {
  const current = await db.meta.get('seedVersion')
  if (current?.value === SEED_VERSION) return false
  await write(db)
  return true
}

/** Settings → "Reset demo data": wipes everything (including user-created data and queued writes) and re-seeds. */
export async function resetDemoData(db: TravelDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await write(db)
}
