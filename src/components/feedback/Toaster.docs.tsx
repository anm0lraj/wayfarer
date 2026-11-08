import { Toaster } from './Toaster'
import { toast } from './toast'
import { Button } from '@/components/ui/Button'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, fn, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'toast',
  title: 'Toast',
  group: 'feedback',
  source: 'src/components/feedback/Toaster.tsx',
  summary: 'A short message after something happened, with an optional action such as Undo. Call toast() from anywhere; the one <Toaster /> in App draws them above the phone’s bottom nav, bottom-right on desktop.',
  parts: [
    part('Toaster', Toaster, { props: {} }),
    fn('toast', toast, {
      props: {
        title: { type: 'string', required: true, description: 'What happened, in a few words (“Activity deleted”). Also announced.' },
        description: { type: 'string', required: false, description: 'One more line if needed.' },
        action: { type: '{ label: string; onClick: () => void }', required: false, description: 'One action, usually Undo.' },
        durationMs: { type: 'number', required: false, default: '6000', description: 'How long it stays (pauses while hovered or focused).' },
      },
    }),
  ],
  examples: [
    {
      id: 'toast-kinds',
      title: 'Try them',
      description: 'Each button shows a real toast at the bottom of the window.',
      render: () => (
        <>
          <Cell label="plain"><Button variant="secondary" onClick={() => toast({ title: 'Hotel saved to trip' })}>Plain toast</Button></Cell>
          <Cell label="with Undo"><Button variant="secondary" onClick={() => toast({ title: 'Activity deleted', action: { label: 'Undo', onClick: () => toast({ title: 'Activity restored' }) } })}>Toast with Undo</Button></Cell>
          <Cell label="with description"><Button variant="secondary" onClick={() => toast({ title: 'Couldn’t save', description: 'Your change was undone. Try again when you’re online.' })}>Error toast</Button></Cell>
        </>
      ),
    },
  ],
  a11y: {
    keyboard: [['F8', 'Moves focus to the toast region (Radix hotkey)'], ['Tab', 'Action, then Dismiss'], ['Escape', 'Dismisses the focused toast']],
    aria: ['Radix Toast: region “Notifications (F8)”, each toast role="status"', 'Action has altText = its label', 'Dismiss button aria-label="Dismiss"'],
    announces: 'The title through the app’s live region (toast() calls announce()).',
    pointer: 'Swipe down to dismiss on touch; 44 px action and close targets.',
    motion: 'No slide animation; it appears in place.',
  },
  guidance: {
    do: ['Offer Undo after deletes instead of a confirm dialog where the change is reversible.', 'Keep the title under ~40 characters.'],
    dont: ['Don’t use a toast for errors the traveller must act on (show them in place).', 'Don’t stack several toasts for one action.'],
  },
})
