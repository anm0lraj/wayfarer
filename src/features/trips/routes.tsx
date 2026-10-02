import { ScreenStub } from '@/components/layout/ScreenStub'

export { TripsList } from './TripsListRoute'
export { CreateTrip } from './create/CreateTripRoute'
export { TripOverview } from './overview/TripOverviewRoute'

export { TripChecklist } from './ChecklistRoute'
export function ShareTrip() {
  return <ScreenStub title="Share trip" phase={7} spec="spec §24" />
}
