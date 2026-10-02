import { Bed, Car, Plane, Ticket, Trash2, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/money'
import type { Booking } from '@/types'
import { bookingWhen } from './bookingWhen'

const icons: Record<Booking['type'], LucideIcon> = { flight: Plane, hotel: Bed, activity: Ticket, transport: Car }

/** The label every demo booking must carry (spec §15): it was saved to the trip, nothing was purchased. */
export function DemoBadge({ className }: { className?: string }) {
  return <Badge tone="warning" className={className}>Saved to trip — not booked</Badge>
}

export function BookingCard({ booking, tz, onRemove, removing }: { booking: Booking; tz?: string; onRemove?: (b: Booking) => void; removing?: boolean }) {
  const Icon = icons[booking.type]
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-surface p-3 sm:p-4">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 className="font-semibold">{booking.title}</h3>
          <p className="font-semibold">{formatMoney(booking.price)}</p>
        </div>
        <p className="text-sm text-fg-muted">{booking.provider} · {bookingWhen(booking, tz)}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <DemoBadge />
          {onRemove && (
            <Button variant="ghost" size="sm" disabled={removing} aria-label={`Remove ${booking.title} from trip`} onClick={() => onRemove(booking)}>
              <Trash2 aria-hidden className="size-4" /> Remove
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}
