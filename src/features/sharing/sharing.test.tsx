import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/feedback/Toaster'
import type { Invite } from '@/data/remote/invites'
import type { TripWithState } from '@/data/queries/trips'

const mocks = vi.hoisted(() => ({
  send: vi.fn(async () => ({})),
  withdraw: vi.fn(async () => undefined),
  accept: vi.fn(async () => undefined),
  decline: vi.fn(async () => undefined),
  mine: [] as Invite[],
  sent: [] as Invite[],
  collaborators: [] as unknown[],
  remove: vi.fn(async () => undefined),
}))

vi.mock('@/data/queries/invites', () => ({
  sharingAvailable: true,
  useMyInvites: () => ({ data: mocks.mine }),
  useSentInvites: () => ({ data: mocks.sent, isError: false }),
  useInviteActions: () => ({
    send: { mutateAsync: mocks.send, isPending: false },
    withdraw: { mutateAsync: mocks.withdraw },
    accept: { mutateAsync: mocks.accept, isPending: false },
    decline: { mutateAsync: mocks.decline, isPending: false },
  }),
}))
vi.mock('@/data/repositories', () => ({ collaboratorRepo: { list: async () => mocks.collaborators, remove: mocks.remove } }))

import { InvitationsCard } from './InvitationsCard'
import { SharePeopleSheet } from './SharePeopleSheet'

const trip = { id: 't1', title: '5 Days in Bali', ownerId: 'u1' } as TripWithState
const invite = (over: Partial<Invite> = {}): Invite => ({ id: 't9__me@example.com', tripId: 't9', tripTitle: 'Goa Weekend', email: 'me@example.com', role: 'editor', status: 'pending', invitedBy: 'u2', inviterName: 'Ana', createdAt: '2026-10-01T00:00:00.000Z', ...over })

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}<Toaster /></QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.mine = []
  mocks.sent = []
  mocks.collaborators = []
})

describe('invitations on Home', () => {
  it('shows nothing when nobody has invited you', () => {
    renderWith(<InvitationsCard />)
    expect(screen.queryByRole('heading', { name: 'Invitations' })).toBeNull()
  })

  it('lists who invited you to what, and lets you accept or decline', async () => {
    mocks.mine = [invite(), invite({ id: 't8__me@example.com', tripTitle: 'Kyoto', role: 'viewer', inviterName: undefined })]
    const user = userEvent.setup()
    renderWith(<InvitationsCard />)

    expect(screen.getByText(/Ana invited you to “Goa Weekend”/)).toBeInTheDocument()
    expect(screen.getByText(/Someone invited you to “Kyoto”/)).toBeInTheDocument()
    expect(screen.getByText('You can edit the trip')).toBeInTheDocument()
    expect(screen.getByText('You can view the trip')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0]!)
    expect(mocks.accept).toHaveBeenCalledWith(expect.objectContaining({ tripId: 't9', role: 'editor' }))
    expect(await screen.findByText('You joined “Goa Weekend”')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Decline' })[1]!)
    expect(mocks.decline).toHaveBeenCalledWith('t8__me@example.com')
  })

  it('tells you when an invitation can no longer be accepted', async () => {
    mocks.mine = [invite()]
    mocks.accept.mockRejectedValueOnce(new Error('permission-denied'))
    renderWith(<InvitationsCard />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Accept' }))
    expect(await screen.findByText('Couldn’t accept the invitation')).toBeInTheDocument()
  })
})

describe('sharing a trip', () => {
  it('sends an invitation with the chosen role', async () => {
    const user = userEvent.setup()
    renderWith(<SharePeopleSheet trip={trip} open onOpenChange={() => undefined} />)

    await user.type(screen.getByLabelText('Email address'), 'Friend@Example.com')
    await user.click(screen.getByRole('radio', { name: 'Can view' }))
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith({ tripId: 't1', tripTitle: '5 Days in Bali', email: 'Friend@Example.com', role: 'viewer' }))
    expect(await screen.findByText('Invitation sent')).toBeInTheDocument()
  })

  it('asks for a real email address before sending anything', async () => {
    const user = userEvent.setup()
    renderWith(<SharePeopleSheet trip={trip} open onOpenChange={() => undefined} />)
    await user.type(screen.getByLabelText('Email address'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText(/Enter an email address/)).toBeInTheDocument()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('shows who is on the trip and pending invitations, with ways to take them back', async () => {
    mocks.collaborators = [{ id: 'c1', tripId: 't1', userId: 'u2', role: 'editor', status: 'accepted', name: 'Ana', email: 'ana@example.com', invitedBy: 'u1', invitedAt: '' }]
    mocks.sent = [invite({ id: 't1__bob@example.com', tripId: 't1', email: 'bob@example.com', role: 'viewer' }), invite({ id: 't1__cy@example.com', tripId: 't1', email: 'cy@example.com', status: 'declined' })]
    const user = userEvent.setup()
    renderWith(<SharePeopleSheet trip={trip} open onOpenChange={() => undefined} />)

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Waiting for them to accept · Can view')).toBeInTheDocument()
    expect(screen.getByText('Declined · Can edit')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Withdraw invitation to bob@example.com' }))
    expect(mocks.withdraw).toHaveBeenCalledWith('t1__bob@example.com')

    await user.click(screen.getByRole('button', { name: 'Remove Ana' }))
    expect(mocks.remove).toHaveBeenCalledWith('c1')
  })
})
