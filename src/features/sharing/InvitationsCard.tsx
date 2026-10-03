import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/feedback/toast'
import { useInviteActions, useMyInvites } from '@/data/queries/invites'
import type { Invite } from '@/data/remote/invites'

/** Trips other people have invited the signed-in person to. Renders nothing when there are none. */
export function InvitationsCard() {
  const invites = useMyInvites()
  const { accept, decline } = useInviteActions()
  const list = invites.data ?? []
  if (list.length === 0) return null

  const onAccept = async (i: Invite) => {
    try {
      await accept.mutateAsync(i)
      toast({ title: `You joined “${i.tripTitle}”`, description: i.role === 'editor' ? 'You can edit it with the others.' : 'You can view it.' })
    } catch {
      toast({ title: 'Couldn’t accept the invitation', description: 'It may have been withdrawn. Check your connection and try again.' })
    }
  }

  return (
    <section aria-labelledby="invitations-heading" className="space-y-3">
      <h2 id="invitations-heading" className="text-lg font-semibold">Invitations</h2>
      <Card className="divide-y divide-border">
        {list.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium">{i.inviterName ?? 'Someone'} invited you to “{i.tripTitle}”</p>
              <p className="text-sm text-fg-muted">{i.role === 'editor' ? 'You can edit the trip' : 'You can view the trip'}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={accept.isPending} onClick={() => void onAccept(i)}>Accept</Button>
              <Button size="sm" variant="secondary" disabled={decline.isPending} onClick={() => void decline.mutateAsync(i.id)}>Decline</Button>
            </div>
          </div>
        ))}
      </Card>
    </section>
  )
}
