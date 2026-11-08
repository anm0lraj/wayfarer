import { PublicTripCard } from './PublicTripCard'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'
import { demoPublicTrip } from '@/features/design-system/fixtures'
import { img } from '@/lib/photos'

export default defineDoc({
  id: 'public-trip-card',
  title: 'PublicTripCard',
  group: 'domain',
  source: 'src/components/domain/PublicTripCard.tsx',
  summary: 'Another traveller’s published itinerary in the Explore feed and on Home: cover, length, title, creator, budget range and saves. Links to /t/:slug.',
  parts: [
    part('PublicTripCard', PublicTripCard, {
      props: {
        trip: { type: 'PublicTrip', required: true, description: 'The published page.' },
        priority: { type: 'boolean', required: false, default: 'false', description: 'Load the cover eagerly.' },
        headingLevel: { type: '2 | 3', required: false, default: '3', description: '2 when the cards sit right under the page’s h1 (the feed).' },
      },
    }),
  ],
  examples: [
    {
      id: 'public-variants',
      title: 'Variants',
      render: () => (
        <>
          <Cell label="default"><div className="w-72"><PublicTripCard trip={demoPublicTrip} /></div></Cell>
          <Cell label="no budget, h2"><div className="w-72"><PublicTripCard headingLevel={2} trip={{ ...demoPublicTrip, slug: 'ds-goa', title: '3-Day Goa Budget Trip', ownerName: 'Rahul', durationDays: 3, coverImage: img('pub-goa'), saveCount: 87, budgetRange: [{ amount: 0, currency: 'INR' }, { amount: 0, currency: 'INR' }] }} /></div></Cell>
          <Cell label="hover" force="hover"><div className="w-72"><PublicTripCard trip={{ ...demoPublicTrip, slug: 'ds-ubud', title: 'Slow Days in Ubud', coverImage: img('pub-ubud-slow') }} /></div></Cell>
        </>
      ),
    },
  ],
  a11y: {
    aria: ['One link; title is an h2/h3', 'Save count reads “1,280 saves” (sr-only word)', 'The length is a Badge (was a hand-made pill; unified in this pass)'],
    announces: 'Days, title, creator, budget and saves.',
    pointer: 'Lift on hover.',
  },
  guidance: { do: ['Use headingLevel 2 in the feed so headings don’t skip a level.'], dont: ['Don’t show likes and saves both on the card.'] },
})
