import { WhenVisible } from './WhenVisible'
import { Skeleton } from '@/components/ui/Skeleton'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'when-visible',
  title: 'WhenVisible',
  group: 'containers',
  source: 'src/components/layout/WhenVisible.tsx',
  summary: 'Renders heavy content (the map: a quarter of a megabyte of script) only once it is near the screen; the fallback holds its space so nothing jumps. Renders at once where IntersectionObserver is missing.',
  parts: [
    part('WhenVisible', WhenVisible, {
      props: {
        children: { type: 'ReactNode', required: true, description: 'The heavy content.' },
        fallback: { type: 'ReactNode', required: false, description: 'Placeholder of the same size (a Skeleton).' },
        margin: { type: 'string', required: false, default: "'300px'", description: 'How early to start (IntersectionObserver rootMargin).' },
        className: { type: 'string', required: false, description: 'Classes on the wrapper (give it the final size).' },
      },
    }),
  ],
  examples: [
    {
      id: 'visible-map',
      title: 'Deferred content',
      render: () => (
        <Cell label="visible: content rendered" wide>
          <WhenVisible className="h-32 max-w-md" fallback={<Skeleton className="size-full" />}>
            <div className="grid size-full place-items-center rounded-md bg-primary/[0.12] font-semibold text-primary">Map loaded</div>
          </WhenVisible>
        </Cell>
      ),
    },
  ],
  a11y: { aria: ['No role; the fallback should be an aria-hidden Skeleton'] },
  guidance: { do: ['Size the wrapper so the swap causes no layout shift.'], dont: ['Don’t defer what is visible when the page opens (it is the LCP).'] },
})
