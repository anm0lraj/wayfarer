import { ProgressBar } from './ProgressBar'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'progress-bar',
  title: 'ProgressBar',
  group: 'feedback',
  source: 'src/components/ui/ProgressBar.tsx',
  summary: 'Determinate progress, such as planning completeness on a trip card. Values are clamped to 0–100 and rounded.',
  parts: [
    part('ProgressBar', ProgressBar, {
      props: {
        value: { type: 'number', required: true, description: 'Percent, 0–100 (clamped).' },
        label: { type: 'string', required: true, description: 'Accessible name, e.g. “Planning 72% complete”.' },
        className: { type: 'string', required: false, description: 'Extra classes on the track.' },
      },
    }),
  ],
  examples: [
    {
      id: 'progress-values',
      title: 'Values',
      stack: true,
      render: () => (
        <>
          <Cell label="0%" wide><ProgressBar value={0} label="Planning 0% complete" className="max-w-sm" /></Cell>
          <Cell label="72%" wide><ProgressBar value={72} label="Planning 72% complete" className="max-w-sm" /></Cell>
          <Cell label="100%" wide><ProgressBar value={100} label="Planning 100% complete" className="max-w-sm" /></Cell>
          <Cell label="with visible text" wide>
            <div className="max-w-sm space-y-1"><ProgressBar value={72} label="Planning 72% complete" /><p className="text-xs text-fg-muted">Planning 72% complete</p></div>
          </Cell>
        </>
      ),
    },
  ],
  a11y: {
    aria: ['role="progressbar" with aria-valuemin 0, aria-valuemax 100, aria-valuenow and aria-label'],
    announces: 'The label and the percentage.',
    motion: 'The fill animates its width (500 ms); instant with reduced motion.',
  },
  guidance: {
    do: ['Show the number as text too when it matters.'],
    dont: ['Don’t use for unknown durations (use a Skeleton or “Saving…”).'],
  },
})
