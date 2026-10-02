import { Chip } from '@/components/ui/Chip'
import { formatMoney } from '@/lib/money'
import type { HotelSearchState } from './filters'

const PRICES = [3000, 5000, 8000]
const RATINGS = [4, 4.5]
const DISTANCES = [1, 2, 3]

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])

/** Price, rating, distance, property type and amenities (spec §16). Controlled by the URL via `onChange`. */
export function HotelFilters({ value, onChange, options, currency = 'INR' }: {
  value: HotelSearchState
  onChange: (next: HotelSearchState) => void
  options: { amenities: string[]; propertyTypes: string[] }
  currency?: string
}) {
  const set = (patch: Partial<HotelSearchState>) => onChange({ ...value, ...patch })
  return (
    <div className="space-y-5">
      <Group legend="Max price per night">
        {PRICES.map((p) => <Chip key={p} selected={value.maxPrice === p} onClick={() => set({ maxPrice: value.maxPrice === p ? undefined : p })}>Up to {formatMoney({ amount: p, currency })}</Chip>)}
      </Group>
      <Group legend="Guest rating">
        {RATINGS.map((r) => <Chip key={r} selected={value.minRating === r} onClick={() => set({ minRating: value.minRating === r ? undefined : r })}>{r}+ rating</Chip>)}
      </Group>
      <Group legend="Distance from centre">
        {DISTANCES.map((d) => <Chip key={d} selected={value.maxDistanceKm === d} onClick={() => set({ maxDistanceKm: value.maxDistanceKm === d ? undefined : d })}>Within {d} km</Chip>)}
      </Group>
      <Group legend="Property type">
        {options.propertyTypes.map((t) => <Chip key={t} selected={value.propertyTypes.includes(t)} onClick={() => set({ propertyTypes: toggle(value.propertyTypes, t) })}>{t}</Chip>)}
      </Group>
      <Group legend="Amenities">
        {options.amenities.map((a) => <Chip key={a} selected={value.amenities.includes(a)} onClick={() => set({ amenities: toggle(value.amenities, a) })}>{a}</Chip>)}
      </Group>
    </div>
  )
}
