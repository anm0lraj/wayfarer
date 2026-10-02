import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment
const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore()

const trip = (extra: Record<string, unknown> = {}) => ({ id: 't1', ownerId: 'owner', title: 'Bali', members: { owner: 'owner' }, ...extra })

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-wayfarer', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } })
})
afterAll(async () => { await env.cleanup() })
beforeEach(async () => {
  await env.clearFirestore()
  // A trip owned by "owner", with an editor and a viewer, and one activity in it.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await db.doc('trips/t1').set(trip({ members: { owner: 'owner', ed: 'editor', vw: 'viewer' } }))
    await db.doc('trips/t1/items/i1').set({ id: 'i1', tripId: 't1', title: 'Temple' })
    await db.doc('publicTrips/p1').set({ id: 'p1', ownerId: 'owner', title: 'Public' })
  })
})

describe('trips', () => {
  it('members can read their trip; strangers and signed-out visitors cannot', async () => {
    for (const u of ['owner', 'ed', 'vw']) await assertSucceeds(as(u).doc('trips/t1').get())
    await assertFails(as('stranger').doc('trips/t1').get())
    await assertFails(as(null).doc('trips/t1').get())
  })

  it('anyone signed in can create a trip they own, but not one owned by someone else or with extra members', async () => {
    await assertSucceeds(as('amy').doc('trips/t2').set(trip({ id: 't2', ownerId: 'amy', members: { amy: 'owner' } })))
    await assertFails(as('amy').doc('trips/t3').set(trip({ id: 't3', ownerId: 'someone', members: { someone: 'owner' } })))
    await assertFails(as('amy').doc('trips/t4').set(trip({ id: 't4', ownerId: 'amy', members: { amy: 'owner', bob: 'editor' } })))
    await assertFails(as('amy').doc('trips/t5').set(trip({ id: 't5', ownerId: 'amy', members: { amy: 'editor' } })))
  })

  it('the owner can edit and share; an editor can edit but not change who has access or who owns it', async () => {
    await assertSucceeds(as('owner').doc('trips/t1').update({ title: 'Bali!' }))
    await assertSucceeds(as('owner').doc('trips/t1').update({ 'members.new': 'viewer' }))
    await assertSucceeds(as('ed').doc('trips/t1').update({ title: 'Bali edit' }))
    await assertFails(as('ed').doc('trips/t1').update({ 'members.ed': 'owner' }))
    await assertFails(as('ed').doc('trips/t1').update({ ownerId: 'ed' }))
    await assertFails(as('vw').doc('trips/t1').update({ title: 'nope' }))
    await assertFails(as('stranger').doc('trips/t1').update({ title: 'nope' }))
  })

  it('the owner cannot be removed from their own trip, or hand it over by editing the owner field', async () => {
    await assertFails(as('owner').doc('trips/t1').update({ ownerId: 'ed' }))
    await assertFails(as('owner').doc('trips/t1').update({ 'members.owner': 'viewer' }))
  })

  it('only the owner can delete the trip', async () => {
    await assertFails(as('ed').doc('trips/t1').delete())
    await assertFails(as('vw').doc('trips/t1').delete())
    await assertSucceeds(as('owner').doc('trips/t1').delete())
  })
})

describe('inside a trip', () => {
  it('members read; editors and owners write; viewers and strangers do not', async () => {
    for (const u of ['owner', 'ed', 'vw']) await assertSucceeds(as(u).doc('trips/t1/items/i1').get())
    await assertFails(as('stranger').doc('trips/t1/items/i1').get())

    const item = { id: 'i2', tripId: 't1', title: 'Beach' }
    await assertSucceeds(as('ed').doc('trips/t1/items/i2').set(item))
    await assertSucceeds(as('owner').doc('trips/t1/items/i3').set({ ...item, id: 'i3' }))
    await assertFails(as('vw').doc('trips/t1/items/i4').set({ ...item, id: 'i4' }))
    await assertFails(as('stranger').doc('trips/t1/items/i5').set({ ...item, id: 'i5' }))
    await assertFails(as('vw').doc('trips/t1/items/i1').delete())
    await assertSucceeds(as('ed').doc('trips/t1/items/i1').delete())
  })

  it('a document must name the trip it is stored under', async () => {
    await assertFails(as('ed').doc('trips/t1/items/x').set({ id: 'x', tripId: 'other-trip', title: 'Sneaky' }))
    await assertFails(as('ed').doc('trips/t1/items/y').set({ id: 'y', title: 'No trip id' }))
  })

  it('only the owner manages collaborators', async () => {
    const c = { id: 'c1', tripId: 't1', userId: 'zed', role: 'viewer', status: 'accepted' }
    await assertSucceeds(as('owner').doc('trips/t1/collaborators/c1').set(c))
    await assertFails(as('ed').doc('trips/t1/collaborators/c2').set({ ...c, id: 'c2' }))
  })

  it('unknown collections inside a trip stay closed', async () => {
    await assertFails(as('owner').doc('trips/t1/secrets/s1').set({ tripId: 't1' }))
  })
})

describe('personal data', () => {
  it('is readable and writable only by the person it belongs to', async () => {
    await assertSucceeds(as('amy').doc('users/amy').set({ name: 'Amy' }))
    await assertSucceeds(as('amy').doc('users/amy/notifications/n1').set({ id: 'n1' }))
    await assertFails(as('bob').doc('users/amy').get())
    await assertFails(as('bob').doc('users/amy/notifications/n1').get())
    await assertFails(as(null).doc('users/amy').get())
  })
})

describe('published trips', () => {
  it('anyone can read them, even signed out', async () => {
    await assertSucceeds(as(null).doc('publicTrips/p1').get())
  })

  it('only the publisher can create, change or remove one', async () => {
    await assertSucceeds(as('amy').doc('publicTrips/p2').set({ id: 'p2', ownerId: 'amy', title: 'Mine' }))
    await assertFails(as('amy').doc('publicTrips/p3').set({ id: 'p3', ownerId: 'bob', title: 'Not mine' }))
    await assertFails(as(null).doc('publicTrips/p4').set({ id: 'p4', ownerId: 'x' }))
    await assertFails(as('amy').doc('publicTrips/p1').update({ title: 'Hijacked' }))
    await assertSucceeds(as('owner').doc('publicTrips/p1').update({ title: 'Edited' }))
    await assertFails(as('amy').doc('publicTrips/p1').delete())
    await assertSucceeds(as('owner').doc('publicTrips/p1').delete())
  })
})

describe('everything else', () => {
  it('is closed', async () => {
    await assertFails(as('owner').doc('admin/config').get())
    await assertFails(as('owner').doc('places/p-dps').set({ name: 'x' }))
  })
})
