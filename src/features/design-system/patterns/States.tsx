import { EmptyState, ErrorState, OfflineState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { toast } from '@/components/feedback/toast'
import { Cell } from '../Cell'
import type { Example } from '../doc'
import { Block, Code, Live, Rules, Table } from '../ui'

export const examples: Example[] = [
  {
    id: 'states-four',
    title: 'One screen, four states',
    description: 'Memories for a trip: loading, empty, error, offline.',
    render: () => (
      <div className="grid w-full gap-4 lg:grid-cols-2">
        <Cell label="loading" wide>
          <Card className="p-4">
            <SkeletonGroup label="Loading memories" className="grid grid-cols-3 gap-2">
              <Skeleton className="aspect-square" /><Skeleton className="aspect-square" /><Skeleton className="aspect-square" />
            </SkeletonGroup>
          </Card>
        </Cell>
        <Cell label="empty" wide><Card><EmptyState art="camera" title="Your story starts with one photo" description="Add a photo during your trip and it lands on the right day." action={<Button>Add a memory</Button>} /></Card></Cell>
        <Cell label="error" wide><Card><ErrorState title="Couldn’t load memories" description="Check your connection and try again." onRetry={() => toast({ title: 'Retrying…' })} /></Card></Cell>
        <Cell label="offline" wide><Card><OfflineState description="Photos you haven’t opened before need a connection. Your trip and itinerary still work." /></Card></Cell>
      </div>
    ),
  },
]

export function StatesPage() {
  return (
    <div className="space-y-12">
      <Block title="Every screen has four states" id="states-rules">
        <Table caption="Screen states" head={['State', 'Show', 'Never']} rows={[
          ['Loading', 'Skeletons shaped like the content, in a SkeletonGroup (“Loading trips”)', 'A blank screen or a lone spinner'],
          ['Empty', 'EmptyState: a spot illustration, a bold friendly title, what to do next', '“No data”'],
          ['Error', 'ErrorState: plain words, what failed, Try again', 'A stack trace, a joke'],
          ['Offline', 'What still works; OfflineState only for content that needs the network; the shell shows OfflineBanner', 'Hiding cached data'],
        ]} />
        <Rules items={[
          <>Reads come from IndexedDB first, so most screens work offline; network-only screens check <Code>useOnline()</Code>.</>,
          'Edits made offline are queued and synced later; the header’s sync badge counts them.',
        ]} />
        <Live id="states-four" />
      </Block>
    </div>
  )
}
