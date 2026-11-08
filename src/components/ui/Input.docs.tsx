import type { InputHTMLAttributes } from 'react'
import { Input, SearchField } from './Input'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

const input = defineDoc({
  id: 'input',
  title: 'Input',
  group: 'inputs',
  source: 'src/components/ui/Input.tsx',
  summary: 'A labelled text field. The label is always there (visible, or kept for screen readers with hideLabel); a hint and an error are wired to the field with aria-describedby.',
  parts: [
    part<typeof Input, InputHTMLAttributes<HTMLInputElement>>('Input', Input, {
      inherits: 'All <input> attributes (type, value, onChange, placeholder, required, disabled, readOnly…). `className` styles the <input> itself.',
      props: {
        label: { type: 'string', required: true, description: 'The field’s name. Required: there is no unlabelled input.' },
        hint: { type: 'string', required: false, description: 'Help under the field. Hidden while there is an error.' },
        error: { type: 'string', required: false, description: 'Error message. Sets aria-invalid and a red edge; say how to fix it.' },
        hideLabel: { type: 'boolean', required: false, default: 'false', description: 'Keep the label for screen readers only (e.g. a search box whose purpose is obvious).' },
      },
    }),
  ],
  examples: [
    {
      id: 'input-states',
      title: 'States',
      stack: true,
      render: () => (
        <>
          <Cell label="default + hint" wide><Input label="Trip name" hint="You can change this later." defaultValue="5 Days in Bali" /></Cell>
          <Cell label="placeholder" wide><Input label="Home city" placeholder="e.g. Bengaluru" /></Cell>
          <Cell label="hover" force="hover" wide><Input label="Travellers" type="number" defaultValue={2} /></Cell>
          <Cell label="focus-visible" force="focus" wide><Input label="Budget" defaultValue="60,000" /></Cell>
          <Cell label="error / invalid" wide><Input label="Budget" error="Enter an amount in rupees, like 60000." defaultValue="sixty" /></Cell>
          <Cell label="disabled" wide><Input label="Currency" defaultValue="INR" disabled /></Cell>
          <Cell label="read-only" wide><Input label="Trip link" defaultValue="wayfarer.app/t/5-days-in-bali-ab12" readOnly /></Cell>
        </>
      ),
    },
  ],
  a11y: {
    keyboard: [['Tab', 'Moves into the field'], ['Typing', 'Edits; native behaviour for date, number and search types']],
    aria: ['<label for> tied to the input (useId)', 'aria-describedby → hint or error', 'aria-invalid="true" while there is an error'],
    announces: 'Label, value, then the hint or the error text.',
    focus: 'Global focus outline plus a blue edge.',
    pointer: '44 px tall; native pickers on phones for date/time.',
  },
  guidance: {
    do: ['Write the error next to the field and say how to fix it.', 'Validate with Zod through React Hook Form (see Patterns → Forms).', 'Use the right type (number, date, email) for the phone keyboard.'],
    dont: ['Don’t use the placeholder as the label.', 'Don’t clear what the traveller typed when showing an error.'],
  },
})

const search = defineDoc({
  id: 'search-field',
  title: 'SearchField',
  group: 'inputs',
  source: 'src/components/ui/Input.tsx',
  summary: 'The rounded search box with a blue magnifier. Its label is hidden but always present (default “Search”; give a specific one).',
  parts: [
    part<typeof SearchField, InputHTMLAttributes<HTMLInputElement>>('SearchField', SearchField, {
      inherits: 'All <input> attributes; type is "search".',
      props: {
        label: { type: 'string', required: false, default: "'Search'", description: 'Screen-reader label, e.g. “Search destinations”.' },
        hint: { type: 'string', required: false, description: 'As Input.' },
        error: { type: 'string', required: false, description: 'As Input.' },
        hideLabel: { type: 'boolean', required: false, default: 'true', description: 'Always true here; passing it has no effect.' },
      },
    }),
  ],
  examples: [
    {
      id: 'search-states',
      title: 'States',
      stack: true,
      render: () => (
        <>
          <Cell label="empty" wide><SearchField label="Search destinations" placeholder="Where do you want to go?" /></Cell>
          <Cell label="filled" wide><SearchField label="Search itineraries" defaultValue="Bali" /></Cell>
          <Cell label="focus-visible" force="focus" wide><SearchField label="Search places" placeholder="Temples, cafés, beaches…" /></Cell>
        </>
      ),
    },
  ],
  a11y: {
    keyboard: [['Escape', 'Clears the text (native search field)'], ['Enter', 'Submits when inside a form']],
    aria: ['type="search" (searchbox role)', 'Visually hidden <label>', 'Magnifier icon is aria-hidden'],
    announces: '“Search destinations, search text field”.',
    pointer: '44 px tall pill.',
  },
  guidance: {
    do: ['Give a specific label: “Search destinations”, not “Search”.', 'Debounce live searches (350 ms like the location picker) and say when nothing matched.'],
    dont: ['Don’t hide the purpose: keep a clear placeholder or nearby heading.'],
  },
})

export default [input, search]
