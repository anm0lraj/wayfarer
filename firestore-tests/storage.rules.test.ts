import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment
const storage = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage()

const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
const jpeg = { contentType: 'image/jpeg' }

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-wayfarer',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  })
})
afterAll(async () => { await env.cleanup() })
beforeEach(async () => {
  await env.clearFirestore()
  await env.clearStorage()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc('trips/t1').set({ id: 't1', ownerId: 'owner', members: { owner: 'owner', ed: 'editor', vw: 'viewer' } })
    await ctx.storage().ref('trips/t1/memories/existing.jpg').put(photo, jpeg)
  })
})

describe('trip media', () => {
  it('members can read; strangers and signed-out visitors cannot', async () => {
    for (const u of ['owner', 'ed', 'vw']) await assertSucceeds(storage(u).ref('trips/t1/memories/existing.jpg').getMetadata())
    await assertFails(storage('stranger').ref('trips/t1/memories/existing.jpg').getMetadata())
    await assertFails(storage(null).ref('trips/t1/memories/existing.jpg').getMetadata())
  })

  it('owners and editors can add files; viewers and strangers cannot', async () => {
    await assertSucceeds(storage('owner').ref('trips/t1/memories/a.jpg').put(photo, jpeg))
    await assertSucceeds(storage('ed').ref('trips/t1/memories/b.jpg').put(photo, jpeg))
    await assertFails(storage('vw').ref('trips/t1/memories/c.jpg').put(photo, jpeg))
    await assertFails(storage('stranger').ref('trips/t1/memories/d.jpg').put(photo, jpeg))
    await assertFails(storage(null).ref('trips/t1/memories/e.jpg').put(photo, jpeg))
  })

  it('only images, video and audio, and not too large', async () => {
    await assertSucceeds(storage('ed').ref('trips/t1/memories/v.mp4').put(photo, { contentType: 'video/mp4' }))
    await assertSucceeds(storage('ed').ref('trips/t1/memories/n.webm').put(photo, { contentType: 'audio/webm' }))
    await assertFails(storage('ed').ref('trips/t1/memories/x.html').put(photo, { contentType: 'text/html' }))
    await assertFails(storage('ed').ref('trips/t1/memories/y.js').put(photo, { contentType: 'application/javascript' }))
    await assertFails(storage('ed').ref('trips/t1/memories/big.jpg').put(new Uint8Array(31 * 1024 * 1024), jpeg))
  })

  it('files for a trip that does not exist cannot be stored', async () => {
    await assertFails(storage('ed').ref('trips/nope/memories/a.jpg').put(photo, jpeg))
  })

  it('editors can delete; viewers cannot', async () => {
    await assertFails(storage('vw').ref('trips/t1/memories/existing.jpg').delete())
    await assertSucceeds(storage('ed').ref('trips/t1/memories/existing.jpg').delete())
  })

  it('losing access to the trip loses access to its media', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('trips/t1').update({ members: { owner: 'owner' } }) })
    await assertFails(storage('ed').ref('trips/t1/memories/existing.jpg').getMetadata())
  })
})

describe('everything else in storage', () => {
  it('is closed', async () => {
    await assertFails(storage('owner').ref('public/anything.jpg').put(photo, jpeg))
    await assertFails(storage('owner').ref('users/owner/avatar.jpg').put(photo, jpeg))
  })
})
