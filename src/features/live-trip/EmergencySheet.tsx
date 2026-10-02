import { Phone } from 'lucide-react'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { emergencyInfoFor } from '@/data/emergency'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  country?: string
  /** Where they are staying, if a hotel has been saved to the trip. */
  stay?: { name: string; address?: string }
}

/** Emergency numbers and notes. Bundled with the app, so it works with no connection. */
export function EmergencySheet({ open, onOpenChange, country, stay }: Props) {
  const info = emergencyInfoFor(country)
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Emergency information" description={`${info.country} · available offline`}>
      <div className="space-y-5 overflow-y-auto px-5 pb-6">
        <ul className="grid gap-2">
          {info.contacts.map((c) => (
            <li key={c.label}>
              <Button asChild variant="secondary" className="min-h-14 w-full justify-between text-base">
                <a href={`tel:${c.number}`} aria-label={`Call ${c.label}, ${c.number}`}>
                  <span className="flex items-center gap-2"><Phone aria-hidden className="size-5" /> {c.label}</span>
                  <span className="font-bold tabular-nums">{c.number}</span>
                </a>
              </Button>
            </li>
          ))}
        </ul>
        {stay && (
          <section aria-labelledby="stay-h">
            <h3 id="stay-h" className="font-semibold">Where you’re staying</h3>
            <p className="text-fg-muted">{stay.name}{stay.address ? ` — ${stay.address}` : ''}</p>
            <p className="mt-1 text-sm text-fg-muted">Show this to a taxi driver if you need a ride back.</p>
          </section>
        )}
        <section aria-labelledby="notes-h">
          <h3 id="notes-h" className="font-semibold">Good to know</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-fg-muted">
            {info.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
        <p className="text-sm text-fg-muted">These numbers are bundled with the app and may change. Check them before you travel.</p>
      </div>
    </ResponsiveSheet>
  )
}
