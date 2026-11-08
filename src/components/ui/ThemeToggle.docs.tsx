import { ThemeToggle } from './ThemeToggle'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'theme-toggle',
  title: 'ThemeToggle',
  group: 'actions',
  source: 'src/components/ui/ThemeToggle.tsx',
  summary: 'The header’s theme button. It cycles System → Light → Dark; System (the default) follows the device, live. Settings offers the same choice as three explicit options. This is the real toggle: it changes the library’s theme too.',
  parts: [
    part('ThemeToggle', ThemeToggle, {
      props: { className: { type: 'string', required: false, description: 'Extra classes, merged with the round 44 px icon button (merging fixed in this pass; it used to replace them).' } },
    }),
  ],
  examples: [
    {
      id: 'theme-states',
      title: 'States',
      render: () => (
        <>
          <Cell label="default"><ThemeToggle /></Cell>
          <Cell label="hover" force="hover"><ThemeToggle /></Cell>
          <Cell label="focus-visible" force="focus"><ThemeToggle /></Cell>
        </>
      ),
    },
  ],
  a11y: {
    keyboard: [['Enter / Space', 'Switches to the next theme']],
    aria: ['<button> with aria-label “Theme: System. Switch to Light”', 'title tooltip with the same words', 'Icon aria-hidden'],
    announces: 'The new theme (“Theme: Dark”) through the shared live region.',
    pointer: '44 × 44 px round target.',
  },
  guidance: {
    do: ['Keep System as the default.'],
    dont: ['Don’t add another theme switch to a screen; link to Settings → Appearance.'],
  },
})
