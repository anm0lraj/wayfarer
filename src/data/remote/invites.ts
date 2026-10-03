import { collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { getDb } from '@/services/firebase/firestore'
import type { TripCollaborator } from '@/types'

/**
 * Inviting people to a trip. An invitation is one document per (trip, email), `invites/{tripId}__{email}`. The owner
 * writes it; whoever signs in with that verified email sees it and can accept. Accepting adds them to the trip's
 * `members` (the security rules check the invitation says so) and records them in the trip's collaborators. These
 * are online-only actions: they involve someone else, so there is nothing sensible to queue.
 */
export type InviteRole = 'editor' | 'viewer'

export interface Invite {
  id: string
  tripId: string
  tripTitle: string
  email: string
  role: InviteRole
  status: 'pending' | 'accepted' | 'declined'
  invitedBy: string
  inviterName?: string
  createdAt: string
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase()
export const inviteId = (tripId: string, email: string) => `${tripId}__${normaliseEmail(email)}`

const invites = () => collection(getDb(), 'invites')
const inviteRef = (id: string) => doc(getDb(), 'invites', id)
const asInvite = (id: string, data: Record<string, unknown>) => ({ id, ...data }) as Invite

export interface Inviter { uid: string; name: string }

export async function sendInvite(input: { tripId: string; tripTitle: string; email: string; role: InviteRole }, by: Inviter): Promise<Invite> {
  const email = normaliseEmail(input.email)
  const invite: Invite = {
    id: inviteId(input.tripId, email), tripId: input.tripId, tripTitle: input.tripTitle, email, role: input.role,
    status: 'pending', invitedBy: by.uid, inviterName: by.name, createdAt: new Date().toISOString(),
  }
  const { id, ...data } = invite
  await setDoc(inviteRef(id), data)
  return invite
}

/** Invitations this person (as owner) has sent for one trip, newest first. */
export async function listSentInvites(tripId: string, uid: string): Promise<Invite[]> {
  const snap = await getDocs(query(invites(), where('tripId', '==', tripId), where('invitedBy', '==', uid)))
  return snap.docs.map((d) => asInvite(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Invitations waiting for the signed-in person, found by their (verified, lower-case) email. */
export async function listMyInvites(email: string): Promise<Invite[]> {
  const snap = await getDocs(query(invites(), where('email', '==', normaliseEmail(email)), where('status', '==', 'pending')))
  return snap.docs.map((d) => asInvite(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function withdrawInvite(id: string): Promise<void> {
  await deleteDoc(inviteRef(id))
}

export async function declineInvite(id: string): Promise<void> {
  await updateDoc(inviteRef(id), { status: 'declined' })
}

export interface Joiner { uid: string; name: string; email: string }

/**
 * Joins the trip. Order matters for the rules: first become a member (allowed because the invitation says so), then
 * record yourself as a collaborator (allowed because you are now a member, at the role you were given), then mark the
 * invitation used so it cannot be accepted twice.
 */
export async function acceptInvite(invite: Invite, me: Joiner): Promise<TripCollaborator> {
  await updateDoc(doc(getDb(), 'trips', invite.tripId), { [`members.${me.uid}`]: invite.role })
  const collaborator: TripCollaborator = {
    id: `collab_${me.uid}`, tripId: invite.tripId, userId: me.uid, role: invite.role, status: 'accepted',
    invitedBy: invite.invitedBy, invitedAt: invite.createdAt, name: me.name, email: me.email,
  }
  await setDoc(doc(getDb(), 'trips', invite.tripId, 'collaborators', collaborator.id), collaborator)
  await updateDoc(inviteRef(invite.id), { status: 'accepted' })
  return collaborator
}
