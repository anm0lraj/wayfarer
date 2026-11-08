import type { HTMLAttributes } from 'react'
import { Skeleton, SkeletonGroup } from './Skeleton'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'skeleton',
  title: 'Skeleton',
  group: 'feedback',
  source: 'src/components/ui/Skeleton.tsx',
  summary: 'The loading state. Grey shapes the size of the content that is coming, so nothing jumps when it arrives. Group them so a screen reader hears “Loading” once.',
  parts: [
    part<typeof Skeleton, HTMLAttributes<HTMLDivElement>>('Skeleton', Skeleton, { inherits: 'All <div> attributes; size it with className (h-6 w-1/2, aspect-[16/10]…).', props: {} }),
    part('SkeletonGroup', SkeletonGroup, {
      props: {
        label: { type: 'string', required: false, default: "'Loading'", description: 'What is loading, e.g. “Loading trips”.' },
        children: { type: 'ReactNode', required: true, description: 'The Skeleton shapes.' },
        className: { type: 'string', required: false, description: 'Layout classes for the group.' },
      },
    }),
  ],
  examples: [
    {
      id: 'skeleton-card',
      title: 'A trip card loading',
      render: () => (
        <Cell label="card skeleton">
          <SkeletonGroup label="Loading trips" className="w-72 overflow-hidden rounded-lg border border-border bg-surface">
            <Skeleton className="aspect-[16/10] rounded-none" />
            <div className="space-y-2 p-4"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-2 w-full rounded-full" /></div>
          </SkeletonGroup>
        </Cell>
      ),
    },
    {
      id: 'skeleton-list',
      title: 'A list loading',
      render: () => (
        <Cell label="rows" wide>
          <SkeletonGroup label="Loading activities" className="grid max-w-md gap-3">
            <Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" />
          </SkeletonGroup>
        </Cell>
      ),
    },
  ],
  a11y: {
    aria: ['Skeleton: aria-hidden', 'SkeletonGroup: role="status", aria-busy="true", aria-label'],
    announces: '“Loading trips” once, not each shape.',
    motion: 'Pulses; with reduced motion the pulse stops after one cycle (global rule).',
  },
  guidance: {
    do: ['Match the shapes and sizes of the real content.', 'Prefer skeletons to spinners for content.'],
    dont: ['Don’t leave a screen blank while loading.', 'Don’t show a skeleton for longer than the request (show the error state on failure).'],
  },
})
