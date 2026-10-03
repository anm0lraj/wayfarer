import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { Bytes, collection, getDocs, query, where } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment
const as = (uid: string | null, claims: Record<string, unknown> = {}) => (uid ? env.authenticatedContext(uid, claims) : env.unauthenticatedContext()).firestore()
/** A signed-in Google account: the email is on the token and verified. */
const google = (uid: string, email: string) => as(uid, { email, email_verified: true })

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
    await db.doc('invites/t1__amy@example.com').set({ tripId: 't1', tripTitle: 'Bali', email: 'amy@example.com', role: 'editor', status: 'pending', invitedBy: 'owner' })
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

describe('photos and voice notes', () => {
  const bytes = (n: number) => Bytes.fromUint8Array(new Uint8Array(n))
  const media = (over: Record<string, unknown> = {}) => ({ id: 'm1', tripId: 't1', mime: 'image/jpeg', size: 4, data: bytes(4), ...over })

  it('members read them; editors and owners add them; viewers and strangers cannot', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('trips/t1/media/m0').set(media({ id: 'm0' })) })
    for (const u of ['owner', 'ed', 'vw']) await assertSucceeds(as(u).doc('trips/t1/media/m0').get())
    await assertFails(as('stranger').doc('trips/t1/media/m0').get())
    await assertSucceeds(as('ed').doc('trips/t1/media/m1').set(media()))
    await assertSucceeds(as('owner').doc('trips/t1/media/m2').set(media({ id: 'm2', mime: 'audio/webm' })))
    await assertFails(as('vw').doc('trips/t1/media/m3').set(media({ id: 'm3' })))
    await assertFails(as('stranger').doc('trips/t1/media/m4').set(media({ id: 'm4' })))
  })

  it('only images and audio, and kept within the size Firestore can hold', async () => {
    await assertSucceeds(as('ed').doc('trips/t1/media/a').set(media({ id: 'a', data: bytes(900_000) })))
    await assertFails(as('ed').doc('trips/t1/media/b').set(media({ id: 'b', data: bytes(900_001) })))
    await assertFails(as('ed').doc('trips/t1/media/c').set(media({ id: 'c', mime: 'video/mp4' })))
    await assertFails(as('ed').doc('trips/t1/media/d').set(media({ id: 'd', mime: 'text/html' })))
  })

  it('belong to the trip they are stored under', async () => {
    await assertFails(as('ed').doc('trips/t1/media/x').set(media({ id: 'x', tripId: 'other' })))
  })

  it('editors can delete them; viewers cannot', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('trips/t1/media/m0').set(media({ id: 'm0' })) })
    await assertFails(as('vw').doc('trips/t1/media/m0').delete())
    await assertSucceeds(as('ed').doc('trips/t1/media/m0').delete())
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

describe('invitations', () => {
  const invite = (over: Record<string, unknown> = {}) => ({ tripId: 't1', tripTitle: 'Bali', email: 'bob@example.com', role: 'viewer', status: 'pending', invitedBy: 'owner', ...over })

  it('only the trip owner can invite, by email, as editor or viewer', async () => {
    await assertSucceeds(as('owner').doc('invites/t1__bob@example.com').set(invite()))
    await assertFails(as('ed').doc('invites/t1__bob@example.com').set(invite({ invitedBy: 'ed' })))
    await assertFails(as('stranger').doc('invites/t1__bob@example.com').set(invite({ invitedBy: 'stranger' })))
    await assertFails(as('owner').doc('invites/t1__bob@example.com').set(invite({ role: 'owner' })))
    await assertFails(as('owner').doc('invites/wrong-id').set(invite()))
    await assertFails(as('owner').doc('invites/t1__Bob@Example.com').set(invite({ email: 'Bob@Example.com' })))
    await assertFails(as('owner').doc('invites/t1__bob@example.com').set(invite({ status: 'accepted' })))
  })

  it('the invited person sees their invitations, and nobody else does', async () => {
    const mine = await assertSucceeds(getDocs(query(collection(google('amy-uid', 'amy@example.com') as never, 'invites'), where('email', '==', 'amy@example.com'))))
    await assertSucceeds(Promise.resolve(mine))
    await assertFails(getDocs(query(collection(google('zed', 'zed@example.com') as never, 'invites'), where('email', '==', 'amy@example.com'))))
    await assertFails(as('stranger').doc('invites/t1__amy@example.com').get())
    // The owner sees the invitations they sent.
    await assertSucceeds(getDocs(query(collection(as('owner') as never, 'invites'), where('tripId', '==', 't1'), where('invitedBy', '==', 'owner'))))
  })

  it('accepting adds you to the trip with exactly the offered role', async () => {
    await assertSucceeds(google('amy-uid', 'amy@example.com').doc('trips/t1').update({ 'members.amy-uid': 'editor' }))
  })

  it('accepting cannot be used to take more than was offered, or to change anything else', async () => {
    const amy = () => google('amy-uid', 'amy@example.com')
    await assertFails(amy().doc('trips/t1').update({ 'members.amy-uid': 'owner' }))
    await assertFails(amy().doc('trips/t1').update({ 'members.amy-uid': 'viewer' })) // offered editor, not viewer
    await assertFails(amy().doc('trips/t1').update({ 'members.amy-uid': 'editor', title: 'Mine now' }))
    await assertFails(amy().doc('trips/t1').update({ 'members.amy-uid': 'editor', 'members.friend': 'editor' }))
  })

  it('accepting needs a verified email that matches the invitation', async () => {
    await assertFails(as('amy-uid', { email: 'amy@example.com', email_verified: false }).doc('trips/t1').update({ 'members.amy-uid': 'editor' }))
    await assertFails(google('zed', 'zed@example.com').doc('trips/t1').update({ 'members.zed': 'editor' })) // no invitation for zed
    await assertFails(as('amy-uid').doc('trips/t1').update({ 'members.amy-uid': 'editor' })) // no email on the token
  })

  it('a declined or already used invitation cannot be accepted', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('invites/t1__amy@example.com').update({ status: 'declined' }) })
    await assertFails(google('amy-uid', 'amy@example.com').doc('trips/t1').update({ 'members.amy-uid': 'editor' }))
  })

  it('once in, a member can record themselves as a collaborator, at their own role only', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('trips/t1').update({ 'members.amy-uid': 'editor' }) })
    const amy = () => google('amy-uid', 'amy@example.com')
    const me = { id: 'c1', tripId: 't1', userId: 'amy-uid', role: 'editor', status: 'accepted' }
    await assertSucceeds(amy().doc('trips/t1/collaborators/c1').set(me))
    await assertFails(amy().doc('trips/t1/collaborators/c2').set({ ...me, id: 'c2', role: 'owner' }))
    await assertFails(amy().doc('trips/t1/collaborators/c3').set({ ...me, id: 'c3', userId: 'someone-else' }))
  })

  it('the invited person can answer the invitation but not rewrite it', async () => {
    const amy = () => google('amy-uid', 'amy@example.com')
    await assertFails(amy().doc('invites/t1__amy@example.com').update({ role: 'owner' }))
    await assertFails(amy().doc('invites/t1__amy@example.com').update({ status: 'pending-forever' }))
    await assertSucceeds(amy().doc('invites/t1__amy@example.com').update({ status: 'accepted' }))
  })

  it('the owner can withdraw an invitation', async () => {
    await assertSucceeds(as('owner').doc('invites/t1__amy@example.com').delete())
    await assertFails(as('stranger').doc('invites/t1__amy@example.com').delete())
  })
})
