import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, doc, initializeFirestore, setDoc } from 'firebase/firestore'
import { connectStorageEmulator, getStorage, ref, getMetadata, type FirebaseStorage } from 'firebase/storage'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'

const current = vi.hoisted(() => ({ bucket: undefined as unknown }))
vi.mock('@/services/firebase/storage', () => ({ getBucket: () => current.bucket }))

import { firebaseStorageService } from './firebase'

interface Person { uid: string; bucket: FirebaseStorage; firestore: ReturnType<typeof initializeFirestore> }
const people = {} as Record<'owner' | 'editor' | 'viewer' | 'stranger', Person>

async function signUp(name: keyof typeof people): Promise<Person> {
  const app = initializeApp({ apiKey: 'fake', projectId: 'demo-wayfarer', authDomain: 'x', storageBucket: 'demo-wayfarer.appspot.com' }, `st-${name}`)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const cred = await createUserWithEmailAndPassword(auth, `st.${name}@example.com`, 'password-123')
  const firestore = initializeFirestore(app, { ignoreUndefinedProperties: true })
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
  const bucket = getStorage(app)
  connectStorageEmulator(bucket, '127.0.0.1', 9199)
  return { uid: cred.user.uid, bucket, firestore }
}

const as = (who: keyof typeof people) => { current.bucket = people[who].bucket }
const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type: 'image/jpeg' })

beforeAll(async () => {
  for (const name of ['owner', 'editor', 'viewer', 'stranger'] as const) people[name] = await signUp(name)
})

beforeEach(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-wayfarer/databases/(default)/documents', { method: 'DELETE' })
  await fetch('http://127.0.0.1:9199/v0/b/demo-wayfarer.appspot.com/o', { method: 'GET' }).catch(() => undefined)
  await db.blobs.clear()
  const { owner, editor, viewer } = people
  await setDoc(doc(owner.firestore, 'trips/t1'), { id: 't1', ownerId: owner.uid, title: 'Bali', members: { [owner.uid]: 'owner' } })
  // Share the trip as the invitation flow would: owner adds members.
  const { updateDoc } = await import('firebase/firestore')
  await updateDoc(doc(owner.firestore, 'trips/t1'), { [`members.${editor.uid}`]: 'editor', [`members.${viewer.uid}`]: 'viewer' })
})

/** Captured on the owner's device, then sent. */
async function ownerUploads(): Promise<string> {
  as('owner')
  const { key } = await firebaseStorageService.upload(jpeg(), { path: 'trips/t1/memories' })
  await firebaseStorageService.publish(key)
  return key
}

describe('Firebase Storage adapter', () => {
  it('saves a capture on the device first, under the trip’s path, and shows it at once', async () => {
    as('owner')
    const stored = await firebaseStorageService.upload(jpeg(), { path: 'trips/t1/memories' })
    expect(stored.key).toMatch(/^trips\/t1\/memories\/[0-9a-f-]{36}$/)
    expect(stored.url.startsWith('blob:')).toBe(true)
    expect((await db.blobs.get(stored.key))?.blob.size).toBe(7)
    // Nothing has been sent yet.
    await expect(getMetadata(ref(people.owner.bucket, stored.key))).rejects.toThrow()
  })

  it('publishing sends the file to the bucket with its type', async () => {
    const key = await ownerUploads()
    const meta = await getMetadata(ref(people.owner.bucket, key))
    expect(meta.contentType).toBe('image/jpeg')
    expect(meta.size).toBe(7)
  })

  it('refuses to publish a file that is no longer on the device', async () => {
    as('owner')
    await expect(firebaseStorageService.publish('trips/t1/memories/gone')).rejects.toThrow('no longer on this device')
  })

  it('an editor writes media too; a viewer cannot, and the failure is reported so the queue can retry', async () => {
    as('editor')
    const mine = await firebaseStorageService.upload(jpeg(), { path: 'trips/t1/memories' })
    await expect(firebaseStorageService.publish(mine.key)).resolves.toBeUndefined()

    as('viewer')
    const theirs = await firebaseStorageService.upload(jpeg(), { path: 'trips/t1/memories' })
    await expect(firebaseStorageService.publish(theirs.key)).rejects.toThrow()
  })

  it('another member sees the photo through a download link; a stranger gets nothing', async () => {
    const key = await ownerUploads()
    await db.blobs.clear() // a different device: no local copy, and a fresh adapter with an empty link cache
    vi.resetModules()
    const { firebaseStorageService: otherDevice } = await import('./firebase')

    as('editor')
    const url = await otherDevice.getUrl(key)
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:9199\//)
    expect((await fetch(url!)).status).toBe(200)

    vi.resetModules()
    const { firebaseStorageService: strangersDevice } = await import('./firebase')
    as('stranger')
    expect(await strangersDevice.getUrl(key)).toBeUndefined()
  })

  it('removing deletes the local copy and the stored file', async () => {
    const key = await ownerUploads()
    as('owner')
    await firebaseStorageService.remove(key)
    expect(await db.blobs.get(key)).toBeUndefined()
    await expect(getMetadata(ref(people.owner.bucket, key))).rejects.toThrow()
  })

  it('seed keys never touch the bucket', async () => {
    as('owner')
    expect(await firebaseStorageService.getUrl('seed:bali')).toMatch(/^data:image\/svg/)
    await expect(firebaseStorageService.publish('seed:bali')).resolves.toBeUndefined()
  })
})
