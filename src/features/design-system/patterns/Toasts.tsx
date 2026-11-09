import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/feedback/toast'
import type { Example } from '../doc'
import { Block, Code, Live, Rules } from '../ui'

const DAY = ['09:00 Breakfast at Pagi Kitchen', '10:30 Uluwatu Temple', '13:00 Lunch at Warung Sari', '17:30 Sunset at Jimbaran Bay']

function DeleteWithUndo() {
  const [items, setItems] = useState(DAY)
  const remove = (i: number) => {
    const before = items
    setItems(items.filter((_, j) => j !== i))
    toast({ title: 'Activity deleted', action: { label: 'Undo', onClick: () => { setItems(before); toast({ title: 'Activity restored' }) } } })
  }
  return (
    <ul className="w-full max-w-md divide-y divide-border rounded-lg border border-border bg-surface">
      {items.map((label, i) => (
        <li key={label} className="flex items-center justify-between gap-3 px-4 py-2">
          <span className="tabular-nums">{label}</span>
          <Button variant="ghost" size="icon" aria-label={`Delete ${label.slice(6)}`} onClick={() => remove(i)}><Trash2 aria-hidden className="size-5" /></Button>
        </li>
      ))}
      {items.length === 0 && <li className="px-4 py-3 text-fg-muted">Nothing planned. Undo brings the activities back.</li>}
    </ul>
  )
}

export const examples: Example[] = [
  { id: 'toast-undo', title: 'Delete with Undo', description: 'Delete an activity, then press Undo in the toast.', render: () => <DeleteWithUndo /> },
]

export function ToastsPage() {
  return (
    <div className="space-y-12">
      <Block title="Act, then offer Undo" id="toast-rules">
        <Rules items={[
          'For reversible actions (delete an activity, remove a saved place), do it at once and show a toast with Undo. No confirm dialog.',
          <>Itinerary edits are optimistic: the change shows at once, the repository writes it, and on failure the change is rolled back with a toast that says so (<Code>useItineraryActions</Code>).</>,
          'AI changes are applied only after the traveller presses the action card, and can be undone the same way.',
          'The toast title is announced; Undo is reachable with F8 then Tab, and stays for 6 seconds (paused while hovered or focused).',
          'Deleting a memory removes its stored photo only after the Undo window has passed.',
        ]} />
        <Live id="toast-undo" />
      </Block>
    </div>
  )
}
