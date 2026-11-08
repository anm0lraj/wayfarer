import { DestinationCard } from './DestinationCard'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'
import { demoDestination } from '@/features/design-system/fixtures'
import { img } from '@/lib/photos'

export default defineDoc({
  id: 'destination-card',
  title: 'DestinationCard',
  group: 'domain',
  source: 'src/components/domain/DestinationCard.tsx',
  summary: 'A large-image destination tile for Explore and Home: the place, its region and a rough daily budget. The whole card links to the destination page.',
  parts: [
    part('DestinationCard', DestinationCard, {
      props: {
        destination: { type: 'Destination', required: true, description: 'The catalogue record.' },
        ratio: { type: "'16/9' | '4/3' | '3/4'", required: false, default: "'4/3'", description: 'Image ratio (3/4 for tall carousels).' },
        priority: { type: 'boolean', required: false, default: 'false', description: 'Load the photo eagerly.' },
      },
    }),
  ],
  examples: [
    {
      id: 'destination-ratios',
      title: 'Ratios and states',
      render: () => (
        <>
          <Cell label="4/3"><div className="w-64"><DestinationCard destination={demoDestination} /></div></Cell>
          <Cell label="3/4"><div className="w-48"><DestinationCard destination={{ ...demoDestination, id: 'japan', name: 'Japan', region: undefined, country: 'Japan', heroImage: img('japan') }} ratio="3/4" /></div></Cell>
          <Cell label="hover" force="hover"><div className="w-64"><DestinationCard destination={{ ...demoDestination, id: 'goa', name: 'Goa', region: undefined, country: 'India', heroImage: img('goa') }} /></div></Cell>
          <Cell label="focus-visible" force="focus"><div className="w-64"><DestinationCard destination={{ ...demoDestination, id: 'jaipur', name: 'Jaipur', region: 'Rajasthan', country: 'India', heroImage: img('jaipur') }} /></div></Cell>
        </>
      ),
    },
  ],
  a11y: {
    aria: ['One link; the name, region and budget are its text', 'Photo alt="" (the name says it)'],
    announces: '“Bali, Lesser Sunda Islands, from ₹4,500/day, link”.',
    pointer: 'Lift + zoom on hover with a fine pointer.',
    motion: 'Off with reduced motion.',
  },
  guidance: { do: ['Show “from ₹…/day” as a plain price.'], dont: ['Don’t add extra badges like “Trending” on every card.'] },
})
