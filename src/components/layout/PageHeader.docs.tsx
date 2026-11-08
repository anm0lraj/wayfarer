import { Plus } from 'lucide-react'
import { PageHeader } from './PageHeader'
import { Button } from '@/components/ui/Button'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'page-header',
  title: 'PageHeader',
  group: 'containers',
  source: 'src/components/layout/PageHeader.tsx',
  summary: 'The top of a page: its one h1, an optional friendly description and page-level actions on the right (they wrap underneath on phones).',
  parts: [
    part('PageHeader', PageHeader, {
      props: {
        title: { type: 'string', required: true, description: 'The page’s h1 (text-3xl → 4xl, extra bold).' },
        description: { type: 'string', required: false, description: 'One friendly line under the title.' },
        actions: { type: 'ReactNode', required: false, description: 'Page-level buttons.' },
        className: { type: 'string', required: false, description: 'Extra classes.' },
      },
    }),
  ],
  examples: [
    {
      id: 'header-variants',
      title: 'Variants',
      stack: true,
      render: () => (
        <>
          <Cell label="title + description" wide><PageHeader title="Your trips" description="Your next adventure starts here." /></Cell>
          <Cell label="with actions" wide><PageHeader title="Bookings" description="Everything you’ve saved for Bali." actions={<Button><Plus aria-hidden className="size-5" />Add booking</Button>} /></Cell>
        </>
      ),
    },
  ],
  a11y: { aria: ['<header> with the page’s only h1 (in the library, the examples add extra h1s on purpose)'], focus: 'RouteEffects moves focus to #main after navigation, then the h1 is the first thing read.' },
  guidance: { do: ['One PageHeader per page.', 'Bold headings, friendly descriptions.'], dont: ['Don’t put more than two actions here.'] },
})
