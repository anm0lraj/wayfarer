import type { HTMLAttributes } from 'react'
import { Card } from './Card'
import { Button } from './Button'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'card',
  title: 'Card',
  group: 'containers',
  source: 'src/components/ui/Card.tsx',
  summary: 'A plain white surface with a 16 px radius, a quiet border and the small shadow. Use it sparingly: spacing and headings group content better than boxes.',
  parts: [
    part<typeof Card, HTMLAttributes<HTMLDivElement>>('Card', Card, {
      inherits: 'All <div> attributes. Add padding with className (p-4 / p-5).',
      props: {},
    }),
  ],
  examples: [
    {
      id: 'card-basic',
      title: 'Surfaces',
      render: () => (
        <>
          <Cell label="card"><Card className="w-64 p-5"><h3 className="font-bold">Packing list</h3><p className="text-sm text-fg-muted">12 of 18 packed</p></Card></Cell>
          <Cell label="card + action"><Card className="w-64 space-y-3 p-5"><h3 className="font-bold">No hotel yet</h3><p className="text-sm text-fg-muted">Find a stay near Seminyak.</p><Button variant="secondary" size="sm">Find hotels</Button></Card></Cell>
          <Cell label="inset panel (surface-2, no shadow)"><div className="w-64 rounded-lg bg-surface-2 p-5"><h3 className="font-bold">Inset</h3><p className="text-sm text-fg-muted">Use inside a card instead of a card in a card.</p></div></Cell>
          <Cell label="interactive (lift)"><a href="#card-basic" className="lift block w-64 rounded-lg border border-border bg-surface p-5 shadow-sm"><span className="font-bold">Open trip</span></a></Cell>
        </>
      ),
    },
  ],
  a11y: {
    aria: ['A plain <div>; give it a heading inside so the content is navigable', 'When the whole card is clickable, make the card itself the <a>/<Link> (one link, not a div with onClick)'],
    pointer: 'Clickable cards use the `lift` class: a deeper shadow on hover and a 3 px rise with a fine pointer.',
    motion: 'The rise is off with reduced motion; the shadow change stays.',
  },
  guidance: {
    do: ['Use for a self-contained summary (a booking, a checklist).', 'Use an inset `surface-2` panel inside a card.'],
    dont: ['Don’t nest a card in a card.', 'Don’t wrap every section in a card; prefer whitespace and headings.'],
  },
})
