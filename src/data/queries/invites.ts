import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/providers/session'
import { env } from '@/config/env'
import { pullRemote } from '@/data/remote'
import type { Invite, InviteRole } from '@/data/remote/invites'
import { useOnline } from '@/lib/hooks/useOnline'

/** Invitations need the real backend (they involve another person's account) and a connection. */
export const sharingAvailable = env.backend === 'firebase'

// Loaded on demand, like the rest of the Firebase code, so the demo build never pulls it in.
const remote = () => import('@/data/remote/invites')

const keys = {
  sent: (tripId: string) => ['invites', 'sent', tripId] as const,
  mine: (email: string) => ['invites', 'mine', email] as const,
}

/** Invitations the signed-in owner has sent for a trip (pending, accepted or declined). */
export function useSentInvites(tripId: string, enabled: boolean) {
  const uid = useSession()?.user.id
  const online = useOnline()
  return useQuery({
    queryKey: keys.sent(tripId),
    enabled: sharingAvailable && enabled && !!uid && online,
    queryFn: async () => (await remote()).listSentInvites(tripId, uid!),
  })
}

/** Invitations waiting for the signed-in person. */
export function useMyInvites() {
  const email = useSession()?.user.email
  const online = useOnline()
  return useQuery({
    queryKey: keys.mine(email ?? ''),
    enabled: sharingAvailable && !!email && online,
    queryFn: async () => (await remote()).listMyInvites(email!),
    staleTime: 60_000,
  })
}

export function useInviteActions() {
  const session = useSession()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['invites'] })

  const send = useMutation({
    mutationFn: async (input: { tripId: string; tripTitle: string; email: string; role: InviteRole }) =>
      (await remote()).sendInvite(input, { uid: session!.user.id, name: session!.user.name }),
    onSuccess: refresh,
  })
  const withdraw = useMutation({ mutationFn: async (id: string) => (await remote()).withdrawInvite(id), onSuccess: refresh })
  const decline = useMutation({ mutationFn: async (id: string) => (await remote()).declineInvite(id), onSuccess: refresh })
  const accept = useMutation({
    mutationFn: async (invite: Invite) => {
      const user = session!.user
      await (await remote()).acceptInvite(invite, { uid: user.id, name: user.name, email: user.email ?? invite.email })
      await pullRemote(user.id) // bring the trip down straight away
    },
    onSuccess: async () => {
      await refresh()
      await qc.invalidateQueries() // the trip list and everything under it
    },
  })
  return { send, withdraw, decline, accept }
}
