import { Stepper } from './Stepper'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

const STEPS = ['Destination', 'Dates', 'Travellers', 'Budget', 'Interests', 'Style']

export default defineDoc({
  id: 'stepper',
  title: 'Stepper',
  group: 'navigation',
  source: 'src/components/ui/Stepper.tsx',
  summary: 'Where the traveller is in a multi-step flow (Create Trip). Done steps get a check, the current one a ring.',
  parts: [
    part('Stepper', Stepper, {
      props: {
        steps: { type: 'string[]', required: true, description: 'Step names, in order (also the announced name).' },
        current: { type: 'number', required: true, description: 'Zero-based index of the current step.' },
        className: { type: 'string', required: false, description: 'Extra classes on the wrapper.' },
      },
    }),
  ],
  examples: [
    {
      id: 'stepper-progress',
      title: 'Progress',
      stack: true,
      render: () => (
        <>
          <Cell label="first step" wide><Stepper steps={STEPS} current={0} className="max-w-lg" /></Cell>
          <Cell label="step 3 of 6" wide><Stepper steps={STEPS} current={2} className="max-w-lg" /></Cell>
          <Cell label="last step" wide><Stepper steps={STEPS} current={5} className="max-w-lg" /></Cell>
        </>
      ),
    },
  ],
  a11y: {
    aria: ['role="group" aria-label="Progress" (was a <nav> landmark with no links; fixed in this pass)', 'The visual list is aria-hidden', 'A visually hidden aria-live="polite" line'],
    announces: '“Step 3 of 6: Travellers” whenever the step changes.',
    focus: 'Not focusable; Back / Continue buttons move between steps.',
  },
  guidance: {
    do: ['Keep steps short and skippable where possible.', 'Put the step in the URL (/trips/new/:step) so back works.'],
    dont: ['Don’t make the circles clickable without a keyboard path.'],
  },
})
