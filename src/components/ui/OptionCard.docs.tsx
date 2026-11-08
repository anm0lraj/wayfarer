import { useState } from 'react'
import { Bot, Hand, Sparkles } from 'lucide-react'
import { OptionCard } from './OptionCard'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

function PlanningStyle() {
  const [style, setStyle] = useState('hybrid')
  return (
    <div role="radiogroup" aria-label="Planning style" className="grid max-w-md gap-2">
      <OptionCard selected={style === 'hybrid'} onSelect={() => setStyle('hybrid')} icon={<Sparkles className="size-5" />} title="AI + manual" description="We draft a plan, you refine every detail." />
      <OptionCard selected={style === 'ai'} onSelect={() => setStyle('ai')} icon={<Bot className="size-5" />} title="Let AI plan it" description="A complete itinerary from your answers." />
      <OptionCard selected={style === 'manual'} onSelect={() => setStyle('manual')} icon={<Hand className="size-5" />} title="Build it manually" description="Start with empty days." />
    </div>
  )
}

export default defineDoc({
  id: 'option-card',
  title: 'OptionCard',
  group: 'selection',
  source: 'src/components/ui/OptionCard.tsx',
  summary: 'One choice of several, with a title and a short description: budget tier, planning style. Behaves as a radio; render the set inside a labelled role="radiogroup".',
  parts: [
    part('OptionCard', OptionCard, {
      props: {
        selected: { type: 'boolean', required: true, description: 'Whether this option is the chosen one (aria-checked).' },
        onSelect: { type: '() => void', required: true, description: 'Choose this option (click, Space, Enter, or arrow keys from a neighbour).' },
        title: { type: 'string', required: true, description: 'The option’s name.' },
        description: { type: 'string', required: false, description: 'One line explaining it.' },
        icon: { type: 'ReactNode', required: false, description: 'Leading blue icon (decorative).' },
      },
    }),
  ],
  examples: [
    { id: 'option-group', title: 'Planning style', description: 'Try the arrow keys inside the group.', render: () => <PlanningStyle /> },
    {
      id: 'option-states',
      title: 'States',
      stack: true,
      render: () => (
        <div role="radiogroup" aria-label="Budget (states)" className="grid max-w-md gap-3">
          <Cell label="default" wide><OptionCard selected={false} onSelect={() => {}} title="Comfort" description="Mid-range hotels, some taxis." /></Cell>
          <Cell label="hover" force="hover" wide><OptionCard selected={false} onSelect={() => {}} title="Premium" description="Boutique stays, private transfers." /></Cell>
          <Cell label="focus-visible" force="focus" wide><OptionCard selected={false} onSelect={() => {}} title="Economy" description="Homestays and buses." /></Cell>
          <Cell label="selected" wide><OptionCard selected onSelect={() => {}} title="Luxury" description="Resorts and drivers." /></Cell>
        </div>
      ),
    },
  ],
  a11y: {
    keyboard: [['Tab', 'Moves between options'], ['↑ ↓ ← →', 'Moves to the previous / next option and chooses it (added in this pass)'], ['Space / Enter', 'Chooses the focused option']],
    aria: ['<button role="radio" aria-checked>', 'Parent: role="radiogroup" with aria-label', 'Check mark and icon are aria-hidden'],
    announces: '“Comfort, Mid-range hotels…, radio button, not checked, 2 of 4”.',
    pointer: 'The whole card is the target (≥ 44 px).',
  },
  guidance: {
    do: ['Keep to 2–5 options with one-line descriptions.', 'Preselect a sensible default where one exists.'],
    dont: ['Don’t use for multi-select (use Chips).', 'Don’t render outside a radiogroup.'],
  },
})
