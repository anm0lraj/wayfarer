import { Link } from 'react-router-dom'
import { ImageCard } from '@/components/ui/ImageCard'
import { formatMoney } from '@/lib/money'
import type { Destination } from '@/types'

/** Large-image destination tile. The whole card is one link; it names the place and a rough daily budget. */
export function DestinationCard({ destination, ratio = '4/3' }: { destination: Destination; ratio?: '16/9' | '4/3' | '3/4' }) {
  return (
    <Link to={`/explore/${destination.id}`} className="block rounded-lg transition-transform hover:-translate-y-0.5 motion-reduce:transition-none">
      <ImageCard
        src={destination.heroImage}
        alt=""
        ratio={ratio}
        title={destination.name}
        subtitle={`${destination.region ?? destination.country} · from ${formatMoney(destination.estimatedDailyBudget)}/day`}
        className="shadow-sm"
      />
    </Link>
  )
}
