import { Check, CircleDashed, Footprints, MapPin, Play, SkipForward } from 'lucide-react'
import { Badge } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Cell } from '../Cell'
import type { Example } from '../doc'
import { Block, Code, Live, Rules } from '../ui'

export const examples: Example[] = [
  {
    id: 'live-badges',
    title: 'Activity status',
    description: 'The tones the Live Trip dashboard uses for each status.',
    render: () => (
      <>
        <Cell label="upcoming"><Badge><CircleDashed aria-hidden className="size-3.5" />Upcoming</Badge></Cell>
        <Cell label="on the way"><Badge tone="primary"><Footprints aria-hidden className="size-3.5" />On the way</Badge></Cell>
        <Cell label="in progress"><Badge tone="accent"><Play aria-hidden className="size-3.5" />In progress</Badge></Cell>
        <Cell label="completed"><Badge tone="success"><Check aria-hidden className="size-3.5" />Completed</Badge></Cell>
        <Cell label="skipped"><Badge><SkipForward aria-hidden className="size-3.5" />Skipped</Badge></Cell>
        <Cell label="overdue"><Badge tone="warning"><CircleDashed aria-hidden className="size-3.5" />Time has passed</Badge></Cell>
      </>
    ),
  },
  {
    id: 'live-panel',
    title: 'Happening now panel',
    render: () => (
      <Card className="w-full max-w-md space-y-4 border-live-border bg-live p-5">
        <Badge tone="accent" className="px-3 py-1"><span aria-hidden className="size-2 rounded-full bg-accent motion-safe:animate-pulse" />Happening now</Badge>
        <div>
          <h3 className="text-xl font-bold">Uluwatu Temple</h3>
          <p className="text-fg-muted">Until 11:30 · <MapPin aria-hidden className="inline size-4" /> 20 min away</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button>Mark done</Button><Button variant="secondary">Skip</Button></div>
      </Card>
    ),
  },
]

export function LiveStatusPage() {
  return (
    <div className="space-y-12">
      <Block title="Live = subtle orange" id="live-rules">
        <Rules items={[
          <>A live panel is <Code>bg-live</Code> + <Code>border-live-border</Code> with normal text; orange only in the badge or a small icon (<Code>text-secondary</Code>), the bright <Code>accent</Code> only as a dot. Buttons stay the normal blue / secondary.</>,
          'Statuses: Upcoming, On the way, In progress, Completed, Skipped. A stored status always wins; an untouched item inside its time window is shown as In progress (inferred), a missed one as “Time has passed” for the traveller to confirm. Completed is never inferred.',
          'Status changes are announced (“Activity marked completed”).',
          'Location is opt-in and explained first; arrival is only a suggestion (“Start it”), never an automatic change.',
          'Live Trip is designed for one hand: large type, big targets, the next step first.',
        ]} />
        <Live id="live-badges" />
        <Live id="live-panel" />
      </Block>
    </div>
  )
}
