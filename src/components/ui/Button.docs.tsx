import type { ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from './Button'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'button',
  title: 'Button',
  group: 'actions',
  source: 'src/components/ui/Button.tsx',
  summary: 'The one way to trigger an action. Electric Blue `primary` for the main action on a screen, `secondary` beside it, `ghost` for quiet toolbar actions and `danger` for deleting.',
  parts: [
    part<typeof Button, ButtonHTMLAttributes<HTMLButtonElement>>('Button', Button, {
      inherits: 'All <button> attributes (onClick, disabled, type, aria-*…). `type` defaults to "button", so a Button never submits a form by accident; pass type="submit" when it should.',
      props: {
        variant: { type: "'primary' | 'secondary' | 'ghost' | 'danger' | null", required: false, default: "'primary'", description: 'Visual weight. One primary per view.' },
        size: { type: "'md' | 'sm' | 'lg' | 'icon' | null", required: false, default: "'md'", description: 'Padding and text size. Every size keeps the 44 px touch target; `icon` is square and needs an aria-label.' },
        asChild: { type: 'boolean', required: false, default: 'false', description: 'Render the child element (e.g. a router <Link>) with the button styles instead of a <button>.' },
      },
    }),
  ],
  examples: [
    {
      id: 'variants',
      title: 'Variants',
      render: () => (
        <>
          <Cell label="primary"><Button>Plan a trip</Button></Cell>
          <Cell label="secondary"><Button variant="secondary">Add hotel</Button></Cell>
          <Cell label="ghost"><Button variant="ghost">Skip</Button></Cell>
          <Cell label="danger"><Button variant="danger">Delete trip</Button></Cell>
        </>
      ),
    },
    {
      id: 'sizes',
      title: 'Sizes',
      description: 'Sizes change padding and text, never the 44 px minimum height (36 px with a mouse on desktop).',
      render: () => (
        <>
          <Cell label="sm"><Button size="sm">Save</Button></Cell>
          <Cell label="md (default)"><Button>Save</Button></Cell>
          <Cell label="lg"><Button size="lg">Plan a trip</Button></Cell>
          <Cell label="icon"><Button size="icon" variant="ghost" aria-label="Close"><X aria-hidden className="size-5" /></Button></Cell>
          <Cell label="with icon"><Button><Plus aria-hidden className="size-5" />Add activity</Button></Cell>
        </>
      ),
    },
    {
      id: 'states-primary',
      title: 'States: primary',
      description: 'Hover, focus-visible and pressed are pinned with the component’s own CSS.',
      render: () => (
        <>
          <Cell label="default"><Button>Save</Button></Cell>
          <Cell label="hover" force="hover"><Button>Save</Button></Cell>
          <Cell label="focus-visible" force="focus"><Button>Save</Button></Cell>
          <Cell label="pressed" force="active"><Button>Save</Button></Cell>
          <Cell label="disabled"><Button disabled>Save</Button></Cell>
          <Cell label="loading"><Button disabled aria-busy>Saving…</Button></Cell>
        </>
      ),
    },
    {
      id: 'states-secondary',
      title: 'States: secondary, ghost, danger',
      render: () => (
        <>
          <Cell label="secondary hover" force="hover"><Button variant="secondary">Add hotel</Button></Cell>
          <Cell label="secondary focus" force="focus"><Button variant="secondary">Add hotel</Button></Cell>
          <Cell label="secondary disabled"><Button variant="secondary" disabled>Add hotel</Button></Cell>
          <Cell label="ghost hover" force="hover"><Button variant="ghost">Skip</Button></Cell>
          <Cell label="ghost focus" force="focus"><Button variant="ghost">Skip</Button></Cell>
          <Cell label="danger hover" force="hover"><Button variant="danger"><Trash2 aria-hidden className="size-5" />Delete</Button></Cell>
          <Cell label="danger disabled"><Button variant="danger" disabled>Delete</Button></Cell>
        </>
      ),
    },
    {
      id: 'as-link',
      title: 'As a link',
      description: 'Navigation that looks like a button is still a link: use asChild with <Link>.',
      render: () => (
        <Cell label="asChild + Link"><Button asChild variant="secondary"><Link to="/explore">Explore destinations</Link></Button></Cell>
      ),
    },
  ],
  a11y: {
    keyboard: [['Tab', 'Moves focus to the button'], ['Enter / Space', 'Activates it']],
    aria: ['Native <button type="button">', 'Icon-only buttons need aria-label (the icon is aria-hidden)', 'While saving: disabled + aria-busy, and the label says what is happening ("Saving…")'],
    announces: 'Its text (or aria-label) and "button"; disabled buttons are announced as dimmed/unavailable.',
    focus: '3 px Electric Blue outline 2 px outside the button (global :focus-visible).',
    pointer: 'At least 44 × 44 px (36 px with a fine pointer on desktop). Hover only applies with a real pointer, so a tap never leaves it "hovered".',
    motion: 'Primary rises 1 px on hover; every variant presses down 1 px and to 98 % — only with motion allowed. Colour changes always run (160 ms).',
  },
  guidance: {
    do: ['Name the action plainly: “Save”, “Add hotel”, “Delete trip”.', 'Keep one primary button per view; pair it with secondary or ghost.', 'Use `danger` only for destructive actions, and confirm or offer Undo.'],
    dont: ['Don’t make links look like buttons without asChild + Link (the URL must stay a link).', 'Don’t shrink below the 44 px target with custom classes.', 'Don’t colour a button orange: orange means “happening now”, not “click me”.'],
  },
})
