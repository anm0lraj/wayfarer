import { DemoBadge } from '@/features/bookings/BookingCard'
import { Badge } from '@/components/ui/Chip'
import { Cell } from '../Cell'
import type { Example } from '../doc'
import { Block, Code, DoDont, Live, Rules } from '../ui'

export const examples: Example[] = [
  {
    id: 'booking-labels',
    title: 'Labels',
    render: () => (
      <>
        <Cell label="every saved booking"><DemoBadge /></Cell>
        <Cell label="sample timetable"><p className="max-w-xs text-sm text-fg-muted">Sample timetable for the demo. Times and fares are not live.</p></Cell>
        <Cell label="local transport estimate"><Badge>Estimate</Badge></Cell>
      </>
    ),
  },
]

export function BookingsPage() {
  return (
    <div className="space-y-12">
      <Block title="Demo bookings are labelled, always" id="booking-rules">
        <Rules items={[
          <>No real booking API is connected. Saving a flight, hotel, train, bus or activity stores a <Code>mode: &apos;demo&apos;</Code>, <Code>status: &apos;saved&apos;</Code> record; the schema rejects a confirmed demo booking.</>,
          <>Every booking card and panel shows <Code>DemoBadge</Code>: “Saved to trip — not booked”, exactly, in the warning tone.</>,
          'Buttons say what happens: “Add hotel to trip”, “Save flight to trip”, never “Book now” or “Pay”.',
          'Local transport prices are ranges and estimates, never quotes, and can’t be booked.',
        ]} />
        <Live id="booking-labels" />
      </Block>
      <DoDont dos={['“Saved to trip — not booked”.', '“Add hotel to trip”.']} donts={['“Booked”, “Confirmed”, “Reservation complete”.', 'A confirmation number on a demo booking.']} />
    </div>
  )
}
