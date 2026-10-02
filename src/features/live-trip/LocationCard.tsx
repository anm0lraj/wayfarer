import { LocateFixed, LocateOff, MapPinOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { estimateTravelMinutes, haversineKm } from '@/lib/geo'
import type { GeoPoint } from '@/types'
import { humanMinutes } from './liveStatus'
import type { LocationState } from './useLiveLocation'

interface Props {
  state: LocationState
  onEnable: () => void
  onDisable: () => void
  /** Where they're heading, for a distance readout once there is a real fix. */
  target?: { name: string; point: GeoPoint }
}

const shell = 'space-y-3 p-4'

/**
 * Location is optional and explained before the browser prompt. The distance shown comes only from a
 * real position fix; with no fix there is no location UI pretending otherwise.
 */
export function LocationCard({ state, onEnable, onDisable, target }: Props) {
  switch (state.kind) {
    case 'unsupported':
      return (
        <Card className={shell}>
          <h2 className="flex items-center gap-2 font-semibold"><MapPinOff aria-hidden className="size-5" /> Location isn’t available</h2>
          <p className="text-fg-muted">This browser can’t share your location. Everything else here works without it.</p>
        </Card>
      )
    case 'denied':
      return (
        <Card className={shell}>
          <h2 className="flex items-center gap-2 font-semibold"><LocateOff aria-hidden className="size-5" /> Location is blocked</h2>
          <p className="text-fg-muted">You’ve blocked location for this site, so we’re not using it. To change that, allow location in your browser’s site settings, then try again. You don’t need it for anything else here.</p>
          <Button variant="secondary" size="sm" onClick={onEnable}>Try again</Button>
        </Card>
      )
    case 'locating':
      return (
        <Card className={shell} role="status">
          <h2 className="flex items-center gap-2 font-semibold"><LocateFixed aria-hidden className="size-5 motion-safe:animate-pulse" /> Finding you…</h2>
        </Card>
      )
    case 'error':
      return (
        <Card className={shell}>
          <h2 className="font-semibold">Couldn’t get your location</h2>
          <p className="text-fg-muted">{state.message}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onEnable}>Try again</Button>
            <Button variant="ghost" size="sm" onClick={onDisable}>Turn off</Button>
          </div>
        </Card>
      )
    case 'on': {
      const km = target ? haversineKm(state.point, target.point) : undefined
      return (
        <Card className={shell}>
          <h2 className="flex items-center gap-2 font-semibold"><LocateFixed aria-hidden className="size-5 text-success" /> Location is on</h2>
          {target && km !== undefined && (
            <p className="text-fg-muted">
              {km < 0.15 ? `You’re at ${target.name}.` : `${target.name} is ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away, about ${humanMinutes(estimateTravelMinutes(km))} by road.`}
            </p>
          )}
          <p className="text-sm text-fg-muted">Updates while this screen is open. It isn’t stored or shared.</p>
          <Button variant="ghost" size="sm" onClick={onDisable}>Turn off</Button>
        </Card>
      )
    }
    default:
      return (
        <Card className={shell}>
          <h2 className="flex items-center gap-2 font-semibold"><LocateFixed aria-hidden className="size-5" /> Use your location? <span className="text-sm font-normal text-fg-muted">(optional)</span></h2>
          <p className="text-fg-muted">We can show how far you are from your next stop and notice when you arrive. It only updates while this screen is open, stays on your device, and you can turn it off any time.</p>
          <Button variant="secondary" onClick={onEnable}>Use my location</Button>
        </Card>
      )
  }
}
