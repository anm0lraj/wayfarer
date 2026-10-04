import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { feedbackService } from '@/services/feedback/mock'
import type { FeedbackService } from '@/services/feedback/types'
import { renderApp } from '@/test/renderApp'

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  await resetDemoData()
})

async function openForm(feedback: FeedbackService) {
  const user = userEvent.setup()
  renderApp('/settings', { feedback })
  await user.click(await screen.findByRole('button', { name: 'Send feedback' }))
  return { user, box: await screen.findByLabelText('What happened, or what would help?') }
}

describe('send feedback', () => {
  it('is in Settings with the app version, so a report can name the build', async () => {
    renderApp('/settings')
    expect(await screen.findByRole('button', { name: 'Send feedback' })).toBeInTheDocument()
    expect(screen.getByText(/^Version /)).toBeInTheDocument()
  })

  it('sends the message with the page it was written on, then closes with a thank-you', async () => {
    const send = vi.fn(async () => undefined)
    const { user, box } = await openForm({ send })
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled() // nothing to send yet
    await user.type(box, '  The map is blank on my phone  ')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(send).toHaveBeenCalledWith({ message: '  The map is blank on my phone  ', route: '/settings' }))
    expect(await screen.findByText('Thank you')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByLabelText('What happened, or what would help?')).toBeNull())
  })

  it('keeps what was written and says so when sending fails', async () => {
    const { user, box } = await openForm({ send: async () => { throw new Error('You appear to be offline.') } })
    await user.type(box, 'Please add dark maps')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You appear to be offline.')
    expect(box).toHaveValue('Please add dark maps')
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled() // can try again
  })

  it('does not accept a blank message and stops at the length limit', async () => {
    const { user, box } = await openForm(feedbackService)
    await user.type(box, '   ')
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(box).toHaveAttribute('maxlength', '2000')
  })
})
