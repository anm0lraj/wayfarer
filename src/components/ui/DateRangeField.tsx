import { Input } from './Input'
import { addDays, tripLengthDays } from '@/lib/dates'

interface DateRangeFieldProps {
  start: string
  end: string
  onChange: (range: { start: string; end: string }) => void
  min?: string
  errors?: { start?: string; end?: string }
}

/**
 * Start/end date pair built on native date inputs (accessible, and the best picker on phones).
 * Moving the start past the end pulls the end along; the duration is always shown.
 */
export function DateRangeField({ start, end, onChange, min, errors }: DateRangeFieldProps) {
  const days = start && end && end >= start ? tripLengthDays(start, end) : null
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Start date" type="date" value={start} min={min} error={errors?.start}
          onChange={(e) => { const v = e.target.value; onChange({ start: v, end: end && end < v ? v : end }) }}
        />
        <Input label="End date" type="date" value={end} min={start || min} error={errors?.end} onChange={(e) => onChange({ start, end: e.target.value })} />
      </div>
      <p aria-live="polite" className="text-sm font-medium text-primary">
        {days ? `${days} ${days === 1 ? 'day' : 'days'} · ${Math.max(days - 1, 0)} ${days === 2 ? 'night' : 'nights'}` : ' '}
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        {[3, 5, 7].map((n) => (
          <button
            key={n} type="button" disabled={!start}
            onClick={() => onChange({ start, end: addDays(start, n - 1) })}
            className="min-h-touch rounded-full border border-border px-3 font-medium text-fg-muted hover:bg-surface-2 disabled:opacity-50"
          >
            {n} days
          </button>
        ))}
      </div>
    </div>
  )
}
