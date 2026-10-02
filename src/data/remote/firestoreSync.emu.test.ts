import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore, type Firestore } from 'firebase/firestore'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setActorId } from '../actor'
import { db } from '../db'
import { del, put } from '../repositories/shared'

// The Firestore the code under test talks to; each test chooses whose it is, so the real security rules apply.
const current = vi.hoisted(() => ({ db: undefined as unknown }))
vi.mock('@/services/firebase/firestore', () => ({ getDb: () => current.db }))

import { fetchRemoteProfile, pullFromFirestore, sendBatchToFirestore } from './firestoreSync'

interface Person { uid: string; db: Firestore }
const people: Record<'owner' | 'editor' | 'viewer' | 'stranger', Person> = {} as never

async function signUp(name: keyof typeof people): Promise<Person> {
  const app: FirebaseApp = initializeApp({ apiKey: 'fake', projectId: 'demo-wayfarer', authDomain: 'x' }, name)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const cred = await createUserWithEmailAndPassword(auth, `${name}@example.com`, 'password-123')
  const fs = initializeFirestore(app, { ignoreUndefinedProperties: true })
  connectFirestoreEmulator(fs, '127.0.0.1', 8080)
  return { uid: cred.user.uid, db: fs }
}

/** Act as this person on a fresh device: their Firestore session, their actor id, an empty local database. */
async function onDevice(who: keyof typeof people) {
  current.db = people[who].db
  setActorId(people[who].uid)
  await Promise.all(db.tables.map((t) => t.clear()))
}

/** Send everything queued, as the current person. */
async function flush() {
  const results = await sendBatchToFirestore(await db.syncQueue.orderBy('id').toArray())
  await db.syncQueue.clear()
  return results
}

const remote = async (path: string, as: keyof typeof people = 'owner') => {
  const snap = await getDoc(doc(people[as].db, path))
  return snap.exists() ? snap.data() : undefined
}

/** Whether a document exists, bypassing the rules (the emulator treats the "owner" bearer token as an admin), for checking what is left after a delete. */
const existsAsAdmin = async (path: string) =>
  (await fetch(`http://127.0.0.1:8080/v1/projects/demo-wayfarer/databases/(default)/documents/${path}`, { headers: { Authorization: 'Bearer owner' } })).status === 200

const T0 = '2026-10-01T10:00:00.000Z'
const trip = (ownerId: string) => ({ id: 't1', ownerId, title: 'Bali', state: 'planning', createdAt: T0, updatedAt: T0 })
const item = (title: string, updatedAt = T0) => ({ id: 'i1', tripId: 't1', dayId: 'd1', title, position: 0, createdAt: T0, updatedAt })

beforeAll(async () => {
  for (const name of ['owner', 'editor', 'viewer', 'stranger'] as const) people[name] = await signUp(name)
})

beforeEach(async () => {
  // Wipe the emulator's data between tests (the rules-unit-testing helper isn't needed; the REST endpoint does it).
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-wayfarer/databases/(default)/documents', { method: 'DELETE' })
})

/** The owner creates the trip with one activity and shares it. */
async function ownerCreatesSharedTrip() {
  await onDevice('owner')
  await put('trips', db.trips, trip(people.owner.uid) as never)
  await put('items', db.items, item('Temple') as never)
  await put('collaborators', db.collaborators, { id: 'c-ed', tripId: 't1', userId: people.editor.uid, role: 'editor', status: 'accepted', invitedBy: people.owner.uid, invitedAt: T0 } as never)
  await put('collaborators', db.collaborators, { id: 'c-vw', tripId: 't1', userId: people.viewer.uid, role: 'viewer', status: 'accepted', invitedBy: people.owner.uid, invitedAt: T0 } as never)
  await flush()
}

describe('sending local changes', () => {
  it('stores a trip under its owner, its contents beneath it, and records who may see it', async () => {
    await ownerCreatesSharedTrip()
    expect(await remote('trips/t1')).toMatchObject({
      title: 'Bali', ownerId: people.owner.uid,
      members: { [people.owner.uid]: 'owner', [people.editor.uid]: 'editor', [people.viewer.uid]: 'viewer' },
    })
    expect(await remote('trips/t1/items/i1')).toMatchObject({ title: 'Temple', tripId: 't1' })
  })

  it('an editor’s change is accepted; a viewer’s is refused and does not block anything behind it', async () => {
    await ownerCreatesSharedTrip()

    await onDevice('editor')
    await put('items', db.items, item('Temple at dawn', '2026-10-02T08:00:00.000Z') as never)
    await flush()
    expect((await remote('trips/t1/items/i1'))?.title).toBe('Temple at dawn')

    await onDevice('viewer')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await put('items', db.items, item('Vandalised', '2026-10-03T08:00:00.000Z') as never)
    await put('items', db.items, { ...item('Second', '2026-10-03T08:00:00.000Z'), id: 'i2' } as never)
    await db.syncQueue.toCollection().modify({ refusals: 20 }) // refused so often that it is clearly permanent
    const results = await flush()
    expect(results).toHaveLength(2) // both acknowledged: the refused one was dropped, not retried forever
    expect((await remote('trips/t1/items/i1'))?.title).toBe('Temple at dawn')
    expect(await remote('trips/t1/items/i2')).toBeUndefined()
  })

  it('keeps work that is refused when nothing at all can be written (rules not deployed, wrong project)', async () => {
    await ownerCreatesSharedTrip()
    await onDevice('stranger') // may not write into this trip
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await put('items', db.items, item('Mine', '2026-10-04T00:00:00.000Z') as never)
    await db.syncQueue.toCollection().modify({ refusals: 3 })
    await expect(sendBatchToFirestore(await db.syncQueue.toArray())).rejects.toThrow()
    expect(await db.syncQueue.count()).toBe(1) // still queued
  })

  it('reports a conflict, with the server’s copy, when someone else edited the same thing more recently', async () => {
    await ownerCreatesSharedTrip()
    await onDevice('editor')
    await put('items', db.items, item('Newer on the server', '2026-10-05T00:00:00.000Z') as never)
    await flush()

    await onDevice('owner') // an older offline edit arrives late
    await put('items', db.items, item('Stale offline edit', '2026-10-02T00:00:00.000Z') as never)
    const [r] = await flush()
    expect(r).toMatchObject({ status: 'conflict', current: { title: 'Newer on the server' } })
    expect((await remote('trips/t1/items/i1'))?.title).toBe('Newer on the server')
  })

  it('deleting a trip removes everything in it', async () => {
    await ownerCreatesSharedTrip()
    await db.items.clear()
    await del('trips', db.trips, 't1')
    await flush()
    expect(await existsAsAdmin('trips/t1')).toBe(false)
    expect(await existsAsAdmin('trips/t1/items/i1')).toBe(false)
    expect(await existsAsAdmin('trips/t1/collaborators/c-ed')).toBe(false)
  })

  it('removing a collaborator takes their access away', async () => {
    await ownerCreatesSharedTrip()
    await del('collaborators', db.collaborators, 'c-vw')
    await flush()
    expect((await remote('trips/t1'))?.members).not.toHaveProperty(people.viewer.uid)
    await expect(getDoc(doc(people.viewer.db, 'trips/t1'))).rejects.toThrow()
  })
})

describe('pulling remote changes', () => {
  it('a collaborator’s new device receives the trip and everything in it', async () => {
    await ownerCreatesSharedTrip()
    await onDevice('editor')
    expect(await pullFromFirestore(people.editor.uid)).toBeGreaterThan(0)
    expect(await db.trips.get('t1')).toMatchObject({ title: 'Bali' })
    expect((await db.trips.get('t1')) as object).not.toHaveProperty('members')
    expect(await db.items.get('i1')).toMatchObject({ title: 'Temple' })
  })

  it('does not hand a stranger anyone else’s trip', async () => {
    await ownerCreatesSharedTrip()
    await onDevice('stranger')
    expect(await pullFromFirestore(people.stranger.uid)).toBe(0)
    expect(await db.trips.count()).toBe(0)
  })

  it('never overwrites a local edit that has not been sent yet', async () => {
    await ownerCreatesSharedTrip()
    await onDevice('editor')
    await pullFromFirestore(people.editor.uid)
    await put('items', db.items, item('My unsent edit', '2026-10-09T00:00:00.000Z') as never)
    await pullFromFirestore(people.editor.uid)
    expect((await db.items.get('i1'))?.title).toBe('My unsent edit')
  })

  it('removes a trip locally once it has been deleted remotely, but keeps one with unsent changes', async () => {
    await ownerCreatesSharedTrip()
    await onDevice('editor')
    await pullFromFirestore(people.editor.uid)

    await onDevice('owner')
    await put('trips', db.trips, trip(people.owner.uid) as never)
    await db.syncQueue.clear()
    await del('trips', db.trips, 't1')
    await flush()

    // The editor's device still holds the trip. With an unsent change it stays; without one it goes.
    current.db = people.editor.db
    setActorId(people.editor.uid)
    await db.trips.put(trip(people.owner.uid) as never)
    await db.collaborators.put({ id: 'c-ed', tripId: 't1', userId: people.editor.uid, role: 'editor', status: 'accepted', invitedBy: people.owner.uid, invitedAt: T0 } as never)
    await put('trips', db.trips, { ...trip(people.owner.uid), title: 'Unsent' } as never)
    await pullFromFirestore(people.editor.uid)
    expect(await db.trips.get('t1')).toBeDefined()
    await db.syncQueue.clear()
    await pullFromFirestore(people.editor.uid)
    expect(await db.trips.get('t1')).toBeUndefined()
  })

  it('keeps personal data private to its owner', async () => {
    await onDevice('owner')
    await put('notifications', db.notifications, { id: 'n1', userId: people.owner.uid, title: 'Hello', createdAt: T0 } as never)
    await put('users', db.users, { id: people.owner.uid, name: 'Owner', updatedAt: T0 } as never)
    await flush()
    expect(await remote(`users/${people.owner.uid}/notifications/n1`)).toMatchObject({ title: 'Hello' })
    expect(await fetchRemoteProfile(people.owner.uid)).toMatchObject({ name: 'Owner' })
    await expect(getDoc(doc(people.stranger.db, `users/${people.owner.uid}/notifications/n1`))).rejects.toThrow()

    await onDevice('owner')
    await pullFromFirestore(people.owner.uid)
    expect((await db.notifications.get('n1'))?.title).toBe('Hello')
  })
})
