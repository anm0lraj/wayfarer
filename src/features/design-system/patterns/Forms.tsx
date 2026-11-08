import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/feedback/toast'
import type { Example } from '../doc'
import { Block, Code, DoDont, Live, Rules } from '../ui'

const budgetSchema = z.object({
  title: z.string().trim().min(1, 'Give the trip a name.'),
  travellers: z.coerce.number().int('Use a whole number.').min(1, 'At least one traveller.').max(20, 'Up to 20 travellers.'),
  budget: z.coerce.number({ invalid_type_error: 'Enter an amount in rupees, like 60000.' }).positive('Enter an amount in rupees, like 60000.'),
})
type BudgetForm = z.infer<typeof budgetSchema>

function TripBasicsForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    mode: 'onTouched',
    defaultValues: { title: '', travellers: 2, budget: 60000 },
  })
  return (
    <form noValidate className="grid max-w-md gap-4" onSubmit={handleSubmit(async () => { toast({ title: 'Trip details saved' }) })}>
      <Input label="Trip name" hint="You can change this later." error={errors.title?.message} {...register('title')} />
      <Input label="Travellers" type="number" inputMode="numeric" error={errors.travellers?.message} {...register('travellers')} />
      <Input label="Budget (₹)" inputMode="numeric" error={errors.budget?.message} {...register('budget')} />
      <div><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save details'}</Button></div>
    </form>
  )
}

export const examples: Example[] = [
  { id: 'form-validation', title: 'Validated form', description: 'Leave the name empty and move on, or type letters into the budget.', render: () => <TripBasicsForm /> },
]

export function FormsPage() {
  return (
    <div className="space-y-12">
      <Block title="Validation" id="forms-validation">
        <Rules items={[
          <>Forms use React Hook Form with a Zod schema (<Code>zodResolver</Code>); the schema is the single source of truth for rules and messages.</>,
          <>Validate on blur (<Code>mode: &apos;onTouched&apos;</Code>), then live while fixing. Never on the first keystroke.</>,
          <>The error goes under its field (<Code>Input error</Code> sets <Code>aria-invalid</Code> and <Code>aria-describedby</Code>) and says how to fix it.</>,
          <>On submit with errors, focus moves to the first invalid field (React Hook Form’s default <Code>shouldFocusError</Code>).</>,
          <>While saving: disable the button and change its label (“Saving…”). Keep what the traveller typed on failure.</>,
          'Multi-step forms keep a draft (Create Trip persists it), so a refresh loses nothing.',
        ]} />
        <Live id="form-validation" />
      </Block>
      <DoDont
        dos={['Visible labels on every field.', 'Right input types and inputMode for the phone keyboard.', 'Ask only for what is needed now.']}
        donts={['Placeholder as label.', 'Errors only at the top of the form.', 'Clearing the form after an error.']}
      />
    </div>
  )
}
