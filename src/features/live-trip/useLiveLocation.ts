import { useCallback, useEffect, useRef, useState } from 'react'
import { useServices } from '@/services'
import type { LocationPermission } from '@/services/geolocation/geolocation'
import type { GeoPoint } from '@/types'

const OPT_IN_KEY = 'wayfarer-live-location'

const readOptIn = () => {
  try { return localStorage.getItem(OPT_IN_KEY) === '1' } catch { return false }
}
const writeOptIn = (on: boolean) => {
  try { on ? localStorage.setItem(OPT_IN_KEY, '1') : localStorage.removeItem(OPT_IN_KEY) } catch { /* private mode */ }
}

export type LocationState =
  | { kind: 'off' } // the traveller hasn't turned it on (or turned it off)
  | { kind: 'locating' }
  | { kind: 'on'; point: GeoPoint }
  | { kind: 'denied' }
  | { kind: 'unsupported' }
  | { kind: 'error'; message: string }

/**
 * Opt-in location for Live Trip. Nothing is requested until `enable()` is called from a button the
 * traveller pressed after reading why. It updates only while this screen is open (the web has no
 * background location), and `point` is always a real fix — never a guess.
 */
export function useLiveLocation() {
  const { geolocation } = useServices()
  const [state, setState] = useState<LocationState>(() => (geolocation.isSupported() ? { kind: 'off' } : { kind: 'unsupported' }))
  const stop = useRef<(() => void) | null>(null)

  const begin = useCallback(async () => {
    if (!geolocation.isSupported()) return setState({ kind: 'unsupported' })
    setState({ kind: 'locating' })
    try {
      const point = await geolocation.getPosition() // browser prompt appears here, after our explanation
      setState({ kind: 'on', point })
      writeOptIn(true)
      stop.current?.()
      stop.current = geolocation.watch(
        (p) => setState({ kind: 'on', point: p }),
        (e) => setState(e.code === 1 ? { kind: 'denied' } : { kind: 'error', message: 'Your location is temporarily unavailable.' }),
      )
    } catch (e) {
      const code = (e as Partial<GeolocationPositionError>).code
      if (code === 1) setState({ kind: 'denied' })
      else setState({ kind: 'error', message: code === 3 ? 'Finding your location took too long.' : 'We couldn’t find your location.' })
    }
  }, [geolocation])

  const disable = useCallback(() => {
    stop.current?.()
    stop.current = null
    writeOptIn(false)
    setState({ kind: 'off' })
  }, [])

  // Resume quietly if they opted in before AND the browser already granted it — no new prompt.
  useEffect(() => {
    let cancelled = false
    if (readOptIn()) {
      void geolocation.permission().then((p: LocationPermission) => {
        if (cancelled) return
        if (p === 'granted') void begin()
        else if (p === 'denied') setState({ kind: 'denied' })
      })
    }
    return () => {
      cancelled = true
      stop.current?.()
    }
  }, [geolocation, begin])

  return { state, enable: begin, disable }
}
