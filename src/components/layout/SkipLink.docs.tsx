import { SkipLink } from './SkipLink'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'skip-link',
  title: 'SkipLink',
  group: 'navigation',
  source: 'src/components/layout/SkipLink.tsx',
  summary: 'The first focusable thing on every layout: “Skip to content” jumps past the header and navigation to #main (WCAG 2.4.1). Hidden until focused.',
  parts: [part('SkipLink', SkipLink, { props: {} })],
  examples: [
    {
      id: 'skip-focused',
      title: 'Focused',
      description: 'Shown pinned (it normally appears only when tabbed to). It is fixed to the top-left of the stage here.',
      render: () => <Cell label="focus-visible" force="focus"><div className="h-14 w-48"><SkipLink /></div></Cell>,
    },
  ],
  a11y: { keyboard: [['Tab (first)', 'Shows the link'], ['Enter', 'Moves focus to #main']], aria: ['A plain link to #main (tabIndex -1 on main)'] },
  guidance: { do: ['Mount once per layout (AppShell, PublicLayout).'], dont: ['Don’t hide it with display:none (it must be focusable).'] },
})
