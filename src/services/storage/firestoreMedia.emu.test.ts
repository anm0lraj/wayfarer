import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore, setDoc, updateDoc, type Firestore } from 'firebase/firestore'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'

const current = vi.hoisted(() => ({ db: undefined as unknown }))
vi.mock('@/services/firebase/firestore', () => ({ getDb: () => current.db }))

import { firestoreMediaService } from './firestoreMedia'

interface Person { uid: string; fs: Firestore }
const people = {} as Record<'owner' | 'editor' | 'viewer' | 'stranger', Person>

async function signUp(name: keyof typeof people): Promise<Person> {
  const app = initializeApp({ apiKey: 'fake', projectId: 'demo-wayfarer', authDomain: 'x' }, `fm-${name}`)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const cred = await createUserWithEmailAndPassword(auth, `fm.${name}@example.com`, 'password-123')
  const fs = initializeFirestore(app, { ignoreUndefinedProperties: true })
  connectFirestoreEmulator(fs, '127.0.0.1', 8080)
  return { uid: cred.user.uid, fs }
}

const as = (who: keyof typeof people) => { current.db = people[who].fs }
const jpeg = (n = 7) => new Blob([new Uint8Array(n).fill(7)], { type: 'image/jpeg' })

beforeAll(async () => {
  for (const name of ['owner', 'editor', 'viewer', 'stranger'] as const) people[name] = await signUp(name)
})

beforeEach(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-wayfarer/databases/(default)/documents', { method: 'DELETE' })
  await db.blobs.clear()
  const { owner, editor, viewer } = people
  await setDoc(doc(owner.fs, 'trips/t1'), { id: 't1', ownerId: owner.uid, title: 'Bali', members: { [owner.uid]: 'owner' } })
  await updateDoc(doc(owner.fs, 'trips/t1'), { [`members.${editor.uid}`]: 'editor', [`members.${viewer.uid}`]: 'viewer' })
})

async function ownerUploads(blob = jpeg()): Promise<string> {
  as('owner')
  const { key } = await firestoreMediaService.upload(blob, { path: 'trips/t1/memories' })
  await firestoreMediaService.publish(key)
  return key
}

describe('Firestore media adapter', () => {
  it('saves a capture on the device first, and shows it at once', async () => {
    as('owner')
    const stored = await firestoreMediaService.upload(jpeg(), { path: 'trips/t1/memories' })
    expect(stored.key).toMatch(/^trips\/t1\/memories\/[0-9a-f-]{36}$/)
    expect(stored.url.startsWith('blob:')).toBe(true)
    expect((await db.blobs.get(stored.key))?.blob.size).toBe(7)
    expect((await getDoc(doc(people.owner.fs, `trips/t1/media/${stored.key.split('/').pop()}`))).exists()).toBe(false) // not sent yet
  })

  it('publishing stores the bytes under the trip, with their type', async () => {
    const key = await ownerUploads()
    const snap = await getDoc(doc(people.owner.fs, `trips/t1/media/${key.split('/').pop()}`))
    expect(snap.data()).toMatchObject({ tripId: 't1', mime: 'image/jpeg', size: 7 })
    expect(snap.data()?.data.toUint8Array()).toEqual(new Uint8Array(7).fill(7))
  })

  it('refuses what cannot be stored, before anything is sent', async () => {
    as('owner')
    await expect(firestoreMediaService.upload(jpeg(900_001), { path: 'trips/t1/memories' })).rejects.toThrow('too large')
    const { key } = await firestoreMediaService.upload(new Blob(['x'], { type: 'video/mp4' }), { path: 'trips/t1/memories' })
    await expect(firestoreMediaService.publish(key)).rejects.toThrow('Only photos and voice notes')
    await expect(firestoreMediaService.publish('trips/t1/memories/gone')).rejects.toThrow('no longer on this device')
  })

  it('an editor can add media; a viewer’s attempt fails so the upload queue can show it', async () => {
    as('editor')
    const mine = await firestoreMediaService.upload(jpeg(), { path: 'trips/t1/memories' })
    await expect(firestoreMediaService.publish(mine.key)).resolves.toBeUndefined()
    as('viewer')
    const theirs = await firestoreMediaService.upload(jpeg(), { path: 'trips/t1/memories' })
    await expect(firestoreMediaService.publish(theirs.key)).rejects.toThrow()
  })

  it('another member sees the photo on a new device; a stranger gets nothing', async () => {
    const key = await ownerUploads()
    await db.blobs.clear()
    vi.resetModules() // a different device: no local copy, empty link cache
    const { firestoreMediaService: otherDevice } = await import('./firestoreMedia')

    as('editor')
    const url = await otherDevice.getUrl(key)
    expect(url?.startsWith('blob:')).toBe(true)
    expect((await db.blobs.get(key))?.blob.type).toBe('image/jpeg') // kept for next time

    await db.blobs.clear()
    vi.resetModules()
    const { firestoreMediaService: strangersDevice } = await import('./firestoreMedia')
    as('stranger')
    expect(await strangersDevice.getUrl(key)).toBeUndefined()
  })

  it('removing deletes the local copy and the stored file', async () => {
    const key = await ownerUploads()
    as('owner')
    await firestoreMediaService.remove(key)
    expect(await db.blobs.get(key)).toBeUndefined()
    expect((await getDoc(doc(people.owner.fs, `trips/t1/media/${key.split('/').pop()}`))).exists()).toBe(false)
  })

  it('seed keys never touch Firestore', async () => {
    as('owner')
    expect(await firestoreMediaService.getUrl('seed:bali')).toMatch(/^data:image\/svg/)
    await expect(firestoreMediaService.publish('seed:bali')).resolves.toBeUndefined()
  })
})
