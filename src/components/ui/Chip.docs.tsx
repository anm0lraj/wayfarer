import { useState, type ButtonHTMLAttributes, type HTMLAttributes } from 'react'
import { CheckCircle2, Radio, Utensils } from 'lucide-react'
import { Badge, Chip } from './Chip'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

function InterestChips() {
  const [picked, setPicked] = useState<string[]>(['Food', 'Beaches'])
  const toggle = (name: string) => setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]))
  return (
    <div role="group" aria-label="Interests" className="flex flex-wrap gap-2">
      {['Food', 'Beaches', 'Photography', 'Nightlife'].map((name) => (
        <Chip key={name} selected={picked.includes(name)} onClick={() => toggle(name)}>{name}</Chip>
      ))}
    </div>
  )
}

const badge = defineDoc({
  id: 'badge',
  title: 'Badge',
  group: 'feedback',
  source: 'src/components/ui/Chip.tsx',
  summary: 'A static label for a status or a fact: trip state, “Saved to trip — not booked”, a category. Every tone is outlined (a 12 % tint, a 1 px edge at 50 % and text in the tone); `accent` is the live “happening now” badge.',
  parts: [
    part<typeof Badge, HTMLAttributes<HTMLSpanElement>>('Badge', Badge, {
      inherits: 'All <span> attributes (className, title, aria-*…).',
      props: {
        tone: { type: "'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'accent' | null", required: false, default: "'neutral'", description: 'Meaning, not decoration: info = primary, success, warning, error, live = accent, neutral for plain facts.' },
      },
    }),
  ],
  examples: [
    {
      id: 'badge-tones',
      title: 'Tones',
      description: 'Every tone passes WCAG AA on cards, grey panels and the page in both themes (contrast.test.ts).',
      render: () => (
        <>
          <Cell label="neutral"><Badge>Draft</Badge></Cell>
          <Cell label="primary · info"><Badge tone="primary">Planning</Badge></Cell>
          <Cell label="success"><Badge tone="success">Ready</Badge></Cell>
          <Cell label="warning"><Badge tone="warning">Saved to trip — not booked</Badge></Cell>
          <Cell label="error"><Badge tone="error">Upload failed</Badge></Cell>
          <Cell label="accent · live"><Badge tone="accent"><span aria-hidden className="size-2 rounded-full bg-accent motion-safe:animate-pulse" />Live now</Badge></Cell>
        </>
      ),
    },
    {
      id: 'badge-icons',
      title: 'With an icon',
      render: () => (
        <>
          <Cell label="icon + text"><Badge tone="success"><CheckCircle2 aria-hidden className="size-4" />Done</Badge></Cell>
          <Cell label="category"><Badge tone="primary"><Utensils aria-hidden className="size-4" />Food</Badge></Cell>
          <Cell label="live trip"><Badge tone="accent"><Radio aria-hidden className="size-4" />Live trip · Day 2</Badge></Cell>
        </>
      ),
    },
    {
      id: 'badge-on-photo',
      title: 'Over a photo',
      description: 'On a picture, give non-live badges an opaque surface (bg-surface/95) and a small shadow; the live badge is already opaque.',
      render: () => (
        <>
          <Cell label="on surface/95"><div className="rounded-md bg-[rgb(40_90_120)] p-3"><Badge tone="primary" className="bg-surface/95 shadow-sm">Planning</Badge></div></Cell>
          <Cell label="live"><div className="rounded-md bg-[rgb(40_90_120)] p-3"><Badge tone="accent" className="shadow-sm">Live now</Badge></div></Cell>
        </>
      ),
    },
  ],
  a11y: {
    aria: ['Plain <span> text, no role: it is read in place with the content around it', 'Icons inside are aria-hidden; the text carries the meaning'],
    announces: 'Its text. Status changes that matter (e.g. an activity marked completed) are announced separately through the live region (announce()).',
    pointer: 'Not interactive. Never put an onClick on a Badge; use a Chip or Button.',
    motion: 'The live dot pulses only with motion allowed (motion-safe:animate-pulse).',
  },
  guidance: {
    do: ['Use the exact booking wording: “Saved to trip — not booked”.', 'Use `accent` only for things happening now: Live now, In progress, Live trip · Day n.', 'Keep the text to one or two words where you can.'],
    dont: ['Don’t use solid orange or solid colour badges.', 'Don’t rely on colour alone: the word must carry the status.', 'Don’t use `warning` for “live” (it reads as a problem).'],
  },
})

const chip = defineDoc({
  id: 'chip',
  title: 'Chip',
  group: 'selection',
  source: 'src/components/ui/Chip.tsx',
  summary: 'A pill toggle for filters and interests. Selected is solid Electric Blue; several can be on at once. For one-of-many choices with descriptions use OptionCard.',
  parts: [
    part<typeof Chip, ButtonHTMLAttributes<HTMLButtonElement>>('Chip', Chip, {
      inherits: 'All <button> attributes (onClick, disabled, aria-*…). `type` defaults to "button".',
      props: {
        selected: { type: 'boolean', required: false, default: 'false', description: 'On/off. Rendered as aria-pressed.' },
      },
    }),
  ],
  examples: [
    {
      id: 'chip-states',
      title: 'States',
      render: () => (
        <>
          <Cell label="default"><Chip>Beaches</Chip></Cell>
          <Cell label="hover" force="hover"><Chip>Beaches</Chip></Cell>
          <Cell label="focus-visible" force="focus"><Chip>Beaches</Chip></Cell>
          <Cell label="selected"><Chip selected>Food</Chip></Cell>
          <Cell label="selected + focus" force="focus"><Chip selected>Food</Chip></Cell>
          <Cell label="disabled"><Chip disabled>Nightlife</Chip></Cell>
        </>
      ),
    },
    {
      id: 'chip-group',
      title: 'A filter group',
      description: 'Wrap related chips in a labelled group. Try it: each chip toggles.',
      render: () => <InterestChips />,
    },
  ],
  a11y: {
    keyboard: [['Tab', 'Moves between chips'], ['Enter / Space', 'Toggles the chip']],
    aria: ['<button aria-pressed="true|false">', 'Group chips in role="group" with an aria-label (e.g. “Interests”)'],
    announces: '“Food, toggle button, pressed”.',
    focus: 'Global 3 px focus outline.',
    pointer: '44 px tall pill; hover tints the edge and text blue (pointer devices only).',
  },
  guidance: {
    do: ['Use for multi-select filters and interests.', 'Reflect search filters in the URL (see hotel filters).'],
    dont: ['Don’t use a Chip for a one-shot action (use a Button), or for one-of-many choices (use OptionCard / radios).', 'Don’t use a Chip as a static label (use a Badge).'],
  },
})

export default [badge, chip]
