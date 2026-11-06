import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '@/services'
import type { GeolocationService } from '@/services/geolocation/geolocation'
import type { GeoPoint } from '@/types'
import { useLiveLocation } from './useLiveLocation'

const UBUD: GeoPoint = { lat: -8.5069, lng: 115.2625 }

/** A geolocation whose first fix only arrives when the test answers the (pretend) browser prompt. */
function fakeGeolocation() {
  let answer: { resolve: (p: GeoPoint) => void; reject: (e: unknown) => void } | undefined
  const stopWatch = vi.fn()
  const geolocation: GeolocationService = {
    isSupported: () => true,
    permission: vi.fn(async () => 'prompt' as const),
    getPosition: vi.fn(() => new Promise<GeoPoint>((resolve, reject) => { answer = { resolve, reject } })),
    watch: vi.fn(() => stopWatch),
  }
  return {
    geolocation, stopWatch,
    allow: (p: GeoPoint = UBUD) => act(async () => { answer!.resolve(p) }),
    deny: () => act(async () => { answer!.reject({ code: 1 }) }),
  }
}

function setup() {
  const fake = fakeGeolocation()
  const wrapper = ({ children }: { children: ReactNode }) => <ServicesProvider services={{ geolocation: fake.geolocation }}>{children}</ServicesProvider>
  const hook = renderHook(() => useLiveLocation(), { wrapper })
  return { ...fake, ...hook }
}

const optedIn = () => localStorage.getItem('wayfarer-live-location') === '1'

beforeEach(() => localStorage.clear())

describe('useLiveLocation', () => {
  it('turns on and starts watching once the traveller allows it', async () => {
    const { result, geolocation, allow } = setup()
    expect(result.current.state).toEqual({ kind: 'off' })
    expect(geolocation.getPosition).not.toHaveBeenCalled() // nothing asked until the button is pressed
    act(() => { void result.current.enable() })
    expect(result.current.state).toEqual({ kind: 'locating' })
    await allow()
    expect(result.current.state).toEqual({ kind: 'on', point: UBUD })
    expect(geolocation.watch).toHaveBeenCalledTimes(1)
    expect(optedIn()).toBe(true)
  })

  it('ignores a fix that arrives after the traveller pressed Off while the prompt was open', async () => {
    const { result, geolocation, allow } = setup()
    act(() => { void result.current.enable() })
    act(() => result.current.disable())
    await allow()
    expect(result.current.state).toEqual({ kind: 'off' })
    expect(geolocation.watch).not.toHaveBeenCalled()
    expect(optedIn()).toBe(false)
  })

  it('ignores a late refusal after Off too', async () => {
    const { result, deny } = setup()
    act(() => { void result.current.enable() })
    act(() => result.current.disable())
    await deny()
    expect(result.current.state).toEqual({ kind: 'off' })
  })

  it('starts no watch and remembers nothing when the screen closed before the fix arrived', async () => {
    const { result, geolocation, allow, unmount } = setup()
    act(() => { void result.current.enable() })
    unmount()
    await allow()
    expect(geolocation.watch).not.toHaveBeenCalled()
    expect(optedIn()).toBe(false)
  })

  it('stops the watch on Off and on unmount', async () => {
    const { result, allow, stopWatch, unmount } = setup()
    act(() => { void result.current.enable() })
    await allow()
    act(() => result.current.disable())
    expect(stopWatch).toHaveBeenCalledTimes(1)
    act(() => { void result.current.enable() })
    await allow()
    unmount()
    expect(stopWatch).toHaveBeenCalledTimes(2)
  })
})
