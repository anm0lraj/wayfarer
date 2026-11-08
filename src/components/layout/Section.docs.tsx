import { CardRow, Section } from './Section'
import { DestinationCard } from '@/components/domain/DestinationCard'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'
import { demoDestination } from '@/features/design-system/fixtures'
import { img } from '@/lib/photos'

const places = [
  demoDestination,
  { ...demoDestination, id: 'goa', name: 'Goa', region: undefined, country: 'India', heroImage: img('goa') },
  { ...demoDestination, id: 'japan', name: 'Japan', region: undefined, country: 'Japan', heroImage: img('japan') },
  { ...demoDestination, id: 'paris', name: 'Paris', region: 'Île-de-France', country: 'France', heroImage: img('paris') },
]

const section = defineDoc({
  id: 'section',
  title: 'Section and CardRow',
  group: 'containers',
  source: 'src/components/layout/Section.tsx',
  summary: 'Section: a titled block (h2) with an optional “See all” link. CardRow: a snap-scrolling row on phones that becomes a 2 / 3 / 4-column grid on tablet and desktop, so cards never need to know where they sit.',
  parts: [
    part('Section', Section, {
      props: {
        title: { type: 'string', required: true, description: 'The h2; also names the region.' },
        description: { type: 'string', required: false, description: 'A short friendly line.' },
        to: { type: 'string', required: false, description: 'Adds a link to the full list.' },
        linkLabel: { type: 'string', required: false, default: "'See all'", description: 'The link’s text.' },
        children: { type: 'ReactNode', required: true, description: 'Content.' },
        className: { type: 'string', required: false, description: 'Extra classes.' },
      },
    }),
    part('CardRow', CardRow, {
      props: {
        children: { type: 'ReactNode', required: true, description: '<li> items, one card each.' },
        className: { type: 'string', required: false, description: 'Extra classes on the <ul>.' },
      },
    }),
  ],
  examples: [
    {
      id: 'section-row',
      title: 'Explore section',
      description: 'Switch to Phone to see the scrolling row, Desktop for the grid.',
      render: () => (
        <Cell label="section + card row" wide>
          <Section title="Explore" description="Places travellers can’t stop talking about" to="/explore">
            <CardRow>{places.map((d) => <li key={d.id}><DestinationCard destination={d} /></li>)}</CardRow>
          </Section>
        </Cell>
      ),
    },
  ],
  a11y: {
    aria: ['<section aria-labelledby> its h2 (was aria-label repeating the title; now points at the heading)', 'CardRow is a <ul>, so the count is announced'],
    keyboard: [['Tab', 'Through the cards; the row scrolls to keep focus visible']],
    pointer: 'Swipe the row on phones (snap); the “See all” link is a 44 px pill.',
  },
  guidance: { do: ['Use for the blocks of Home, Settings and the trip overview.'], dont: ['Don’t nest sections more than one level.'] },
})

export default section
