import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Badge, Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { useInviteActions, useSentInvites } from '@/data/queries/invites'
import type { TripWithState } from '@/data/queries/trips'
import { collaboratorRepo } from '@/data/repositories'
import type { InviteRole } from '@/data/remote/invites'
import { useOnline } from '@/lib/hooks/useOnline'

const roleLabel = { owner: 'Owner', editor: 'Can edit', viewer: 'Can view' } as const
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

/** Owner-only: invite people by email, see who is on the trip, take access away. */
export function SharePeopleSheet({ trip, open, onOpenChange }: { trip: TripWithState; open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient()
  const online = useOnline()
  const { send, withdraw } = useInviteActions()
  const sent = useSentInvites(trip.id, open)
  const people = useQuery({ queryKey: ['collaborators', trip.id], enabled: open, queryFn: () => collaboratorRepo.list(trip.id) })
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('editor')
  const [error, setError] = useState<string>()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!looksLikeEmail(email)) return setError('Enter an email address, like name@example.com.')
    setError(undefined)
    try {
      await send.mutateAsync({ tripId: trip.id, tripTitle: trip.title, email, role })
      toast({ title: 'Invitation sent', description: `${email.trim().toLowerCase()} can accept it when they sign in.` })
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t send the invitation.')
    }
  }

  const removePerson = async (id: string) => {
    await collaboratorRepo.remove(id)
    await qc.invalidateQueries({ queryKey: ['collaborators', trip.id] })
    toast({ title: 'Removed from this trip', description: 'Their access ends once your change syncs.' })
  }

  const pending = (sent.data ?? []).filter((i) => i.status !== 'accepted')

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Share with people" description={`Invite someone to “${trip.title}”. They need to sign in with the Google account for that email.`}>
      <form noValidate onSubmit={(e) => void submit(e)} className="space-y-3">
        <Input label="Email address" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={error} placeholder="friend@example.com" />
        <div role="radiogroup" aria-label="What they can do" className="flex flex-wrap gap-2">
          <Chip role="radio" aria-checked={role === 'editor'} selected={role === 'editor'} onClick={() => setRole('editor')} type="button">Can edit</Chip>
          <Chip role="radio" aria-checked={role === 'viewer'} selected={role === 'viewer'} onClick={() => setRole('viewer')} type="button">Can view</Chip>
        </div>
        <p className="text-sm text-fg-muted">{role === 'editor' ? 'Editors can change the itinerary, bookings and memories.' : 'Viewers can look at the trip but not change it.'}</p>
        <Button type="submit" disabled={!online || send.isPending}>{send.isPending ? 'Sending…' : 'Send invitation'}</Button>
        {!online && <p className="text-sm text-fg-muted">You’re offline. Invitations can be sent once you’re back online.</p>}
      </form>

      <section aria-labelledby="people-heading" className="mt-6">
        <h3 id="people-heading" className="text-sm font-semibold">On this trip</h3>
        <ul className="mt-2 divide-y divide-border rounded-md border border-border">
          <li className="flex min-h-touch items-center justify-between gap-3 px-3 py-2"><span>You</span><Badge>Owner</Badge></li>
          {(people.data ?? []).filter((c) => c.status === 'accepted').map((c) => (
            <li key={c.id} className="flex min-h-touch items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0"><span className="block truncate">{c.name ?? c.email ?? 'Traveller'}</span>{c.name && c.email && <span className="block truncate text-sm text-fg-muted">{c.email}</span>}</span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge>{roleLabel[c.role]}</Badge>
                <Button variant="ghost" size="sm" aria-label={`Remove ${c.name ?? c.email ?? 'this person'}`} onClick={() => void removePerson(c.id)}>Remove</Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {pending.length > 0 && (
        <section aria-labelledby="pending-heading" className="mt-6">
          <h3 id="pending-heading" className="text-sm font-semibold">Invitations</h3>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {pending.map((i) => (
              <li key={i.id} className="flex min-h-touch items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0"><span className="block truncate">{i.email}</span><span className="block text-sm text-fg-muted">{i.status === 'declined' ? 'Declined' : 'Waiting for them to accept'} · {roleLabel[i.role]}</span></span>
                <Button variant="ghost" size="sm" aria-label={`Withdraw invitation to ${i.email}`} onClick={() => void withdraw.mutateAsync(i.id)}>Withdraw</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {sent.isError && <p className="mt-4 text-sm text-error">Couldn’t load invitations. Check your connection and try again.</p>}
    </ResponsiveSheet>
  )
}
