import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from './Menu'
import { Button } from './Button'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'
import { toast } from '@/components/feedback/toast'

export default defineDoc({
  id: 'menu',
  title: 'Menu',
  group: 'containers',
  source: 'src/components/ui/Menu.tsx',
  summary: 'An overflow menu of actions on a thing (an activity, a trip), built on Radix DropdownMenu: arrow keys, typeahead, Escape and focus return come with it.',
  parts: [
    part('Menu', Menu, {
      props: {
        trigger: { type: 'ReactNode', required: true, description: 'The button that opens it (usually an icon Button with an aria-label). Rendered asChild.' },
        children: { type: 'ReactNode', required: true, description: 'MenuItem, MenuLabel and MenuSeparator.' },
        align: { type: "'start' | 'end'", required: false, default: "'end'", description: 'Edge of the trigger the menu lines up with.' },
      },
    }),
    part('MenuItem', MenuItem, {
      props: {
        children: { type: 'ReactNode', required: true, description: 'The action, named plainly.' },
        onSelect: { type: '() => void', required: true, description: 'Runs when chosen (click, Enter or Space); the menu then closes.' },
        danger: { type: 'boolean', required: false, default: 'false', description: 'Red text for destructive actions.' },
        disabled: { type: 'boolean', required: false, default: 'false', description: 'Skipped by the keyboard and dimmed.' },
        icon: { type: 'ReactNode', required: false, description: 'Leading icon (decorative).' },
      },
    }),
    part('MenuLabel', MenuLabel, { props: { children: { type: 'ReactNode', required: true, description: 'A small uppercase group label.' } } }),
    part('MenuSeparator', MenuSeparator, { props: {} }),
  ],
  examples: [
    {
      id: 'menu-open',
      title: 'Activity menu',
      description: 'Open it with the button, then use the arrow keys. Delete is a danger item; Move is disabled here.',
      render: () => (
        <Cell label="trigger: icon button">
          <Menu trigger={<Button variant="ghost" size="icon" aria-label="More actions for Uluwatu Temple"><MoreHorizontal aria-hidden className="size-5" /></Button>}>
            <MenuLabel>Uluwatu Temple</MenuLabel>
            <MenuItem icon={<Pencil className="size-4" />} onSelect={() => toast({ title: 'Edit' })}>Edit</MenuItem>
            <MenuItem icon={<Copy className="size-4" />} onSelect={() => toast({ title: 'Duplicated' })}>Duplicate</MenuItem>
            <MenuItem disabled onSelect={() => {}}>Move to another day</MenuItem>
            <MenuSeparator />
            <MenuItem danger icon={<Trash2 className="size-4" />} onSelect={() => toast({ title: 'Activity deleted', action: { label: 'Undo', onClick: () => {} } })}>Delete</MenuItem>
          </Menu>
        </Cell>
      ),
    },
  ],
  a11y: {
    keyboard: [['Enter / Space / ↓', 'Opens and focuses the first item'], ['↑ ↓', 'Moves between items (disabled ones are skipped)'], ['Letters', 'Typeahead'], ['Enter / Space', 'Chooses'], ['Escape', 'Closes and returns focus to the trigger']],
    aria: ['Trigger: aria-haspopup="menu", aria-expanded', 'role="menu" with role="menuitem" items; labels are role="group" names', 'Icons aria-hidden'],
    announces: 'The trigger’s name, “menu”, then each item as it is reached.',
    focus: 'Keyboard focus: a 2 px inset blue ring on the item plus the grey highlight (fixed here: the highlight alone was too faint).',
    pointer: 'Items are 44 px tall.',
  },
  guidance: {
    do: ['Use for secondary actions on an item; keep the main action visible.', 'Give the trigger a specific aria-label (“More actions for Uluwatu Temple”).', 'Follow a destructive item with an Undo toast.'],
    dont: ['Don’t hide the only way to do something in a menu.', 'Don’t put form fields in a menu (use a sheet).'],
  },
})
