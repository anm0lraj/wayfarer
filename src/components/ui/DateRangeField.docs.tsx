import { useState } from 'react'
import { DateRangeField } from './DateRangeField'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

function TripDates() {
  const [range, setRange] = useState({ start: '2026-10-12', end: '2026-10-17' })
  return <DateRangeField start={range.start} end={range.end} min="2026-10-01" onChange={setRange} />
}

export default defineDoc({
  id: 'date-range-field',
  title: 'DateRangeField',
  group: 'inputs',
  source: 'src/components/ui/DateRangeField.tsx',
  summary: 'Start and end dates on native date inputs (the best picker on phones, accessible everywhere). It keeps the end on or after the start, shows the length in days and nights, and offers 3 / 5 / 7-day shortcuts.',
  parts: [
    part('DateRangeField', DateRangeField, {
      props: {
        start: { type: 'string', required: true, description: 'Start date, ISO yyyy-mm-dd ("" when not set).' },
        end: { type: 'string', required: true, description: 'End date, ISO yyyy-mm-dd ("" when not set).' },
        onChange: { type: '(range: { start: string; end: string }) => void', required: true, description: 'Called with both dates whenever either changes. Moving the start past the end pulls the end along.' },
        min: { type: 'string', required: false, description: 'Earliest date allowed (usually today in the trip’s timezone).' },
        errors: { type: '{ start?: string; end?: string }', required: false, description: 'Per-field error text, shown under each input.' },
      },
    }),
  ],
  examples: [
    { id: 'dates-live', title: 'Interactive', description: 'Change the start: the end follows when it would fall before it.', render: () => <TripDates /> },
    {
      id: 'dates-states',
      title: 'States',
      stack: true,
      render: () => (
        <>
          <Cell label="empty (shortcuts disabled until a start is chosen)" wide><DateRangeField start="" end="" onChange={() => {}} /></Cell>
          <Cell label="error" wide><DateRangeField start="2026-10-12" end="" errors={{ end: 'Choose when you’re back.' }} onChange={() => {}} /></Cell>
        </>
      ),
    },
  ],
  a11y: {
    keyboard: [['Tab', 'Start date → end date → the three shortcuts'], ['Arrow keys / typing', 'Native date editing']],
    aria: ['Two labelled Inputs (“Start date”, “End date”)', 'The length line is aria-live="polite", so “6 days · 5 nights” is read after a change'],
    announces: 'The new length after either date changes.',
    pointer: 'Shortcut buttons are 44 px pills.',
  },
  guidance: {
    do: ['Pass `min` so past dates can’t be picked.', 'Show the result in the trip’s timezone (trip dates are wall-clock dates).'],
    dont: ['Don’t replace the native inputs with a custom calendar without full keyboard support.'],
  },
})
