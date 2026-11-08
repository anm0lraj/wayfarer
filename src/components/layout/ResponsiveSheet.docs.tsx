import { useState } from 'react'
import { ResponsiveSheet } from './ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

function SheetDemo({ wide, phone }: { wide?: 'panel' | 'dialog'; phone?: 'sheet' | 'full' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Add activity</Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Add activity" description="Day 2 · Tue 13 Oct" wide={wide} phone={phone}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setOpen(false) }}>
          <Input label="Name" defaultValue="Sunset at Tanah Lot" />
          <Input label="Start time" type="time" defaultValue="17:30" />
          <Button type="submit">Add to Day 2</Button>
        </form>
      </ResponsiveSheet>
    </>
  )
}

export default defineDoc({
  id: 'responsive-sheet',
  title: 'ResponsiveSheet',
  group: 'containers',
  source: 'src/components/layout/ResponsiveSheet.tsx',
  summary: 'One API, three presentations: a bottom sheet on phones (or full screen for flows), a right side panel on tablet and desktop, or a centred dialog. Built on Radix Dialog.',
  parts: [
    part('ResponsiveSheet', ResponsiveSheet, {
      props: {
        open: { type: 'boolean', required: true, description: 'Controlled open state (usually from the URL).' },
        onOpenChange: { type: '(open: boolean) => void', required: true, description: 'Called on Escape, overlay click and the close button.' },
        title: { type: 'string', required: true, description: 'Dialog title (h2, or h1 with headingLevel 1).' },
        description: { type: 'string', required: false, description: 'One line under the title (aria-describedby).' },
        children: { type: 'ReactNode', required: true, description: 'The content; it scrolls inside the sheet.' },
        wide: { type: "'panel' | 'dialog'", required: false, default: "'panel'", description: 'Tablet/desktop: side panel or centred dialog.' },
        phone: { type: "'sheet' | 'full'", required: false, default: "'sheet'", description: 'Phone: bottom sheet or full screen (multi-step flows like Create Trip).' },
        headingLevel: { type: '1 | 2', required: false, default: '2', description: '1 when the sheet is the page (it has its own URL).' },
      },
    }),
  ],
  examples: [
    { id: 'sheet-panel', title: 'Panel (default)', description: 'Bottom sheet below 640 px, side panel above. Switch the width to Phone to see the bottom sheet.', render: () => <SheetDemo /> },
    { id: 'sheet-dialog', title: 'Dialog', description: 'Centred dialog on tablet and desktop, bottom sheet on phones.', render: () => <SheetDemo wide="dialog" /> },
    { id: 'sheet-full', title: 'Full screen on phones', render: () => <Cell label="phone: full, wide: dialog"><SheetDemo wide="dialog" phone="full" /></Cell> },
  ],
  a11y: {
    keyboard: [['Escape', 'Closes'], ['Tab / Shift+Tab', 'Cycles inside the sheet (focus is trapped)']],
    aria: ['role="dialog" aria-modal, labelled by the title, described by the description', 'Close button aria-label="Close"'],
    announces: 'The title and description on open.',
    focus: 'Moves into the sheet on open; on close returns to whatever opened it, or to #main when opened from a URL.',
    pointer: 'Tap the overlay to close. The phone grab handle is decorative (no drag-only interaction).',
    motion: 'Opens without a slide.',
  },
  guidance: {
    do: ['Give a sheet that matters its own URL (…/day/2/add).', 'Keep one primary action at the end of the content.'],
    dont: ['Don’t stack a sheet on a sheet.', 'Don’t use for a yes/no confirm of a reversible action; prefer Undo.'],
  },
})
