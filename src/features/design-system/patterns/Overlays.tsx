import { useState } from 'react'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import type { Example } from '../doc'
import { Block, Code, DoDont, Live, Rules, Table } from '../ui'

function DeleteTripConfirm() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Delete trip</Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} wide="dialog" title="Delete “5 Days in Bali”?" description="Its days, bookings and memories are removed from this device and every device you sync with. This can’t be undone.">
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Keep trip</Button>
          <Button variant="danger" onClick={() => setOpen(false)}>Delete trip</Button>
        </div>
      </ResponsiveSheet>
    </>
  )
}

export const examples: Example[] = [
  { id: 'overlay-confirm', title: 'Confirming a destructive action', description: 'Not undoable, so it asks. Try it at Phone width: it becomes a bottom sheet.', render: () => <DeleteTripConfirm /> },
]

export function OverlaysPage() {
  return (
    <div className="space-y-12">
      <Block title="Sheets or dialogs" id="overlay-choice">
        <Table caption="Which overlay" head={['Need', 'Use', 'Phone', 'Tablet / desktop']} rows={[
          ['Add or edit something in context (an activity, a filter)', <Code key="a">ResponsiveSheet</Code>, 'Bottom sheet', 'Side panel; the list stays visible'],
          ['A focused decision or short form', <Code key="b">ResponsiveSheet wide=&quot;dialog&quot;</Code>, 'Bottom sheet', 'Centred dialog'],
          ['A multi-step flow with its own URL (Create Trip)', <Code key="c">phone=&quot;full&quot; wide=&quot;dialog&quot;</Code>, 'Full screen', 'Centred dialog'],
          ['A few actions on one item', <Code key="d">Menu</Code>, 'Dropdown', 'Dropdown'],
          ['Something happened, maybe undo', <Code key="e">toast()</Code>, 'Above the bottom bar', 'Bottom right'],
        ]} />
        <Rules items={[
          'Sheets that matter have a URL (…/day/2/add, …/items/:id), so they survive a refresh and back closes them.',
          'Focus moves in, is trapped, Escape closes, and focus returns to what opened it (or #main).',
          'Ask for confirmation only when the action can’t be undone; otherwise act and offer Undo.',
        ]} />
        <Live id="overlay-confirm" />
      </Block>
      <DoDont dos={['One overlay at a time.', 'Name the action in the confirm button (“Delete trip”), and the safe way out (“Keep trip”).']} donts={['“Are you sure?” + OK/Cancel.', 'Opening a sheet on page load.']} />
    </div>
  )
}
