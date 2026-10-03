import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore, setDoc, type Firestore } from 'firebase/firestore'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setActorId } from '../actor'
import { db } from '../db'

const current = vi.hoisted(() => ({ db: undefined as unknown }))
vi.mock('@/services/firebase/firestore', () => ({ getDb: () => current.db }))

import { pullFromFirestore } from './firestoreSync'
import { acceptInvite, declineInvite, inviteId, listMyInvites, listSentInvites, sendInvite, withdrawInvite } from './invites'

interface Person { uid: string; email: string; db: Firestore }
const people = {} as Record<'owner' | 'amy' | 'zed', Person>

const AUTH = 'http://127.0.0.1:9099'

/** A Google-like account: the email on the token is verified. (Emulator accounts start unverified.) */
async function signUp(name: keyof typeof people): Promise<Person> {
  const email = `inv.${name}@example.com`
  const app = initializeApp({ apiKey: 'fake', projectId: 'demo-wayfarer', authDomain: 'x' }, `inv-${name}`)
  const auth = getAuth(app)
  connectAuthEmulator(auth, AUTH, { disableWarnings: true })
  const cred = await createUserWithEmailAndPassword(auth, email, 'password-123')
  // The emulator lets an admin (the "owner" bearer token) mark the address verified.
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/demo-wayfarer/accounts:update`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId: cred.user.uid, emailVerified: true }),
  })
  if (!res.ok) throw new Error(`could not verify the test email: ${res.status}`)
  await cred.user.getIdToken(true) // pick up the verified flag
  const fs = initializeFirestore(app, { ignoreUndefinedProperties: true })
  connectFirestoreEmulator(fs, '127.0.0.1', 8080)
  return { uid: cred.user.uid, email, db: fs }
}

async function onDevice(who: keyof typeof people) {
  current.db = people[who].db
  setActorId(people[who].uid)
  await Promise.all(db.tables.map((t) => t.clear()))
}

const T0 = '2026-10-01T10:00:00.000Z'

beforeAll(async () => {
  for (const name of ['owner', 'amy', 'zed'] as const) people[name] = await signUp(name)
})

beforeEach(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-wayfarer/databases/(default)/documents', { method: 'DELETE' })
  // The owner's trip, with one activity.
  await onDevice('owner')
  await setDoc(doc(people.owner.db, 'trips/t1'), { id: 't1', ownerId: people.owner.uid, title: 'Bali', state: 'planning', createdAt: T0, updatedAt: T0, members: { [people.owner.uid]: 'owner' } })
  await setDoc(doc(people.owner.db, 'trips/t1/items/i1'), { id: 'i1', tripId: 't1', title: 'Temple', createdAt: T0, updatedAt: T0 })
})

const invite = () => sendInvite({ tripId: 't1', tripTitle: 'Bali', email: 'Inv.Amy@Example.com ', role: 'editor' }, { uid: people.owner.uid, name: 'Owner' })

describe('inviting someone to a trip', () => {
  it('the owner sends an invitation by email; it is stored in a normal form and listed for the owner', async () => {
    const sent = await invite()
    expect(sent).toMatchObject({ id: inviteId('t1', 'inv.amy@example.com'), email: 'inv.amy@example.com', status: 'pending', role: 'editor' })
    expect(await listSentInvites('t1', people.owner.uid)).toHaveLength(1)
  })

  it('the invited person sees it; someone with a different email does not', async () => {
    await invite()
    current.db = people.amy.db
    expect(await listMyInvites('inv.amy@example.com')).toMatchObject([{ tripTitle: 'Bali', inviterName: 'Owner', role: 'editor' }])
    current.db = people.zed.db
    await expect(listMyInvites('inv.amy@example.com')).rejects.toThrow() // not zed's to read
    expect(await listMyInvites('inv.zed@example.com')).toHaveLength(0)
  })

  it('accepting makes them a member with the offered role, who can then read and receive the trip', async () => {
    const sent = await invite()
    await onDevice('amy')
    const joined = await acceptInvite(sent, { uid: people.amy.uid, name: 'Amy', email: 'inv.amy@example.com' })

    expect(joined).toMatchObject({ userId: people.amy.uid, role: 'editor', status: 'accepted', name: 'Amy' })
    expect((await getDoc(doc(people.amy.db, 'trips/t1'))).data()?.members).toMatchObject({ [people.owner.uid]: 'owner', [people.amy.uid]: 'editor' })
    expect((await getDoc(doc(people.owner.db, `trips/t1/collaborators/collab_${people.amy.uid}`))).data()).toMatchObject({ role: 'editor' })
    expect(await listMyInvites('inv.amy@example.com')).toHaveLength(0) // used up

    // Their device downloads the trip and its contents.
    expect(await pullFromFirestore(people.amy.uid)).toBeGreaterThan(0)
    expect(await db.trips.get('t1')).toMatchObject({ title: 'Bali' })
    expect(await db.items.get('i1')).toMatchObject({ title: 'Temple' })
    expect(await db.collaborators.get(`collab_${people.amy.uid}`)).toMatchObject({ role: 'editor' })
  })

  it('the person who was not invited cannot join by accepting someone else’s invitation', async () => {
    const sent = await invite()
    await onDevice('zed')
    await expect(acceptInvite(sent, { uid: people.zed.uid, name: 'Zed', email: 'inv.zed@example.com' })).rejects.toThrow()
    expect((await getDoc(doc(people.owner.db, 'trips/t1'))).data()?.members).not.toHaveProperty(people.zed.uid)
  })

  it('a withdrawn or declined invitation cannot be accepted', async () => {
    const sent = await invite()
    current.db = people.owner.db
    await withdrawInvite(sent.id)
    await onDevice('amy')
    await expect(acceptInvite(sent, { uid: people.amy.uid, name: 'Amy', email: 'inv.amy@example.com' })).rejects.toThrow()

    current.db = people.owner.db
    const again = await invite()
    await onDevice('amy')
    await declineInvite(again.id)
    await expect(acceptInvite(again, { uid: people.amy.uid, name: 'Amy', email: 'inv.amy@example.com' })).rejects.toThrow()
  })

  it('an editor who joined can change the trip; removing them takes the access away again', async () => {
    const sent = await invite()
    await onDevice('amy')
    await acceptInvite(sent, { uid: people.amy.uid, name: 'Amy', email: 'inv.amy@example.com' })
    await setDoc(doc(people.amy.db, 'trips/t1/items/i2'), { id: 'i2', tripId: 't1', title: 'Beach', createdAt: T0, updatedAt: T0 })
    expect((await getDoc(doc(people.owner.db, 'trips/t1/items/i2'))).exists()).toBe(true)
  })
})
