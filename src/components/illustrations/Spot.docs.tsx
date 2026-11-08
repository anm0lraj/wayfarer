import { Spot } from './Spot'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'spot',
  title: 'Spot illustration',
  group: 'media',
  source: 'src/components/illustrations/Spot.tsx',
  summary: 'Five small 3D-style inline SVGs in brand colours, lit from the top left with a soft contact shadow. Drawn in-house (nothing to credit), about 1 KB each, crisp at any size. For empty states and onboarding only.',
  parts: [
    part('Spot', Spot, {
      props: {
        art: { type: "'suitcase' | 'pin' | 'globe' | 'camera' | 'plane'", required: true, description: 'Which object.' },
        className: { type: 'string', required: false, default: "'size-28'", description: 'Size classes (merged).' },
      },
    }),
  ],
  examples: [
    {
      id: 'spot-all',
      title: 'All five',
      render: () => (
        <>
          <Cell label="suitcase · trips (default)"><Spot art="suitcase" /></Cell>
          <Cell label="pin · places, maps"><Spot art="pin" /></Cell>
          <Cell label="globe · discovery"><Spot art="globe" /></Cell>
          <Cell label="camera · memories"><Spot art="camera" /></Cell>
          <Cell label="plane · flights"><Spot art="plane" /></Cell>
        </>
      ),
    },
    {
      id: 'spot-sizes',
      title: 'Sizes',
      render: () => (
        <>
          <Cell label="size-16"><Spot art="globe" className="size-16" /></Cell>
          <Cell label="size-28 (default)"><Spot art="globe" /></Cell>
          <Cell label="size-32 (empty states on ≥640 px)"><Spot art="globe" className="size-32" /></Cell>
        </>
      ),
    },
  ],
  a11y: { aria: ['<svg aria-hidden focusable="false">: always decorative; the text beside it carries the meaning', 'Gradient ids are unique per instance (useId), so several on a page never clash'] },
  guidance: {
    do: ['Pair with a bold heading and one action (EmptyState).'],
    dont: ['Don’t use for errors or offline (plain icon there).', 'Don’t use as decoration elsewhere, or recolour outside brand blue/orange/turquoise/green.'],
  },
})
