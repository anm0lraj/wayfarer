import { TripCard } from './TripCard'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'
import { demoGoaTrip, demoTrip } from '@/features/design-system/fixtures'

export default defineDoc({
  id: 'trip-card',
  title: 'TripCard',
  group: 'domain',
  source: 'src/components/domain/TripCard.tsx',
  summary: 'The standard trip summary on Home, Trips and Profile: cover, state badge, title, countdown, dates, travellers and, while planning, a progress bar. One link to the trip.',
  parts: [
    part('TripCard', TripCard, {
      props: {
        trip: { type: 'Trip', required: true, description: 'The trip record.' },
        state: { type: 'TripState', required: true, description: 'The effective state from useTrips() (effectiveState), never trip.state: upcoming / active / completed are derived.' },
        countdown: { type: 'string', required: false, description: 'e.g. “18 days to go”.' },
        progress: { type: 'number', required: false, description: 'Planning completeness 0–100; shown for draft, planning, ready and upcoming trips.' },
        className: { type: 'string', required: false, description: 'Extra classes on the link.' },
        priority: { type: 'boolean', required: false, default: 'false', description: 'Load the cover eagerly (first card on screen).' },
      },
    }),
  ],
  examples: [
    {
      id: 'trip-states',
      title: 'Trip states',
      render: () => (
        <>
          <Cell label="planning + progress"><div className="w-72"><TripCard trip={demoTrip} state="planning" countdown="11 days to go" progress={72} /></div></Cell>
          <Cell label="upcoming"><div className="w-72"><TripCard trip={demoGoaTrip} state="upcoming" countdown="12 days to go" progress={100} /></div></Cell>
          <Cell label="active · live"><div className="w-72"><TripCard trip={demoTrip} state="active" /></div></Cell>
          <Cell label="completed"><div className="w-72"><TripCard trip={demoGoaTrip} state="completed" /></div></Cell>
          <Cell label="draft"><div className="w-72"><TripCard trip={{ ...demoTrip, title: 'Untitled trip' }} state="draft" progress={10} /></div></Cell>
          <Cell label="hover" force="hover"><div className="w-72"><TripCard trip={demoTrip} state="ready" progress={90} /></div></Cell>
          <Cell label="focus-visible" force="focus"><div className="w-72"><TripCard trip={demoTrip} state="archived" /></div></Cell>
        </>
      ),
    },
  ],
  a11y: {
    keyboard: [['Tab', 'The whole card is one link'], ['Enter', 'Opens the trip']],
    aria: ['One <a>; the h3 title names it', 'Progress bar has its own label; the travellers count reads “2 travellers”', 'Cover alt="" (decorative: the title says it)'],
    announces: 'Title, state, countdown, dates and planning progress, in reading order.',
    pointer: 'Lift on hover (fine pointer); photo zooms gently.',
    motion: 'Lift and zoom are off with reduced motion; the live dot does not pulse.',
  },
  guidance: {
    do: ['Pass effectiveState.', 'Use priority for the first row only.'],
    dont: ['Don’t put buttons inside the card (one link only); actions belong on the trip page.'],
  },
})
