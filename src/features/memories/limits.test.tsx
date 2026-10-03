import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { compressToFit } from '@/lib/media/image'
import { storageService } from '@/services/storage/mock'
import { FIRESTORE_MEDIA_LIMITS } from '@/services/storage/limits'
import { renderApp } from '@/test/renderApp'
import { settle } from '@/test/settle'

beforeAll(() => installMockApi())
beforeEach(async () => {
  await settle()
  localStorage.clear()
  await resetDemoData()
})

afterEach(() => { vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'mediaDevices') })

describe('what can be captured depends on where it will be stored', () => {
  it('offers video when files stay on the device', async () => {
    renderApp('/trips/trip-bali/memories/new')
    expect(await screen.findByRole('button', { name: /Video/ })).toBeInTheDocument()
  })

  it('hides video when the backend only stores photos and voice notes', async () => {
    renderApp('/trips/trip-bali/memories/new', { storage: { ...storageService, limits: FIRESTORE_MEDIA_LIMITS } })
    expect(await screen.findByRole('button', { name: /Photo/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Voice note/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Video/ })).toBeNull()
  })

  it('tells the traveller how long a voice note can be', async () => {
    // jsdom cannot record; pretend the browser can so the recording screen shows.
    vi.stubGlobal('MediaRecorder', class {})
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true })
    renderApp('/trips/trip-bali/memories/new', { storage: { ...storageService, limits: FIRESTORE_MEDIA_LIMITS } })
    await userEvent.click(await screen.findByRole('button', { name: /Voice note/ }))
    expect(await screen.findByText(/up to 90 seconds/)).toBeInTheDocument()
  })
})

describe('fitting a photo to a size budget', () => {
  it('keeps a photo that is already small enough', async () => {
    const small = new Blob([new Uint8Array(1000)], { type: 'image/jpeg' })
    expect(await compressToFit(small, 5000)).toBe(small)
  })

  it('refuses, with a clear message, a photo that cannot be made small enough', async () => {
    // jsdom cannot re-encode images, so an oversized file stays oversized at every size.
    const big = new Blob([new Uint8Array(6000)], { type: 'image/jpeg' })
    await expect(compressToFit(big, 5000)).rejects.toThrow('too large to store')
  })
})
