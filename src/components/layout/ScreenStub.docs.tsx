import { ScreenStub } from './ScreenStub'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'screen-stub',
  title: 'ScreenStub',
  group: 'containers',
  source: 'src/components/layout/ScreenStub.tsx',
  summary: 'A routed placeholder for a screen that lands in a later phase: a real page with a heading, an honest empty state and the route it received. No screen uses it today; keep it for new routes so nothing is ever blank.',
  parts: [
    part('ScreenStub', ScreenStub, {
      props: {
        title: { type: 'string', required: true, description: 'The future screen’s name (its h1).' },
        phase: { type: 'number', required: true, description: 'The phase it is planned for.' },
        spec: { type: 'string', required: true, description: 'Where it is specified, e.g. “spec §22”.' },
        description: { type: 'string', required: false, description: 'Overrides the default sentence.' },
      },
    }),
  ],
  examples: [{ id: 'stub-basic', title: 'Placeholder', render: () => <Cell label="stub" wide><ScreenStub title="Trip journal" phase={9} spec="spec §23" /></Cell> }],
  a11y: { aria: ['PageHeader h1 + EmptyState h2'] },
  guidance: { do: ['Replace it before the phase ships.'], dont: ['Don’t ship a stub in production navigation.'] },
})
