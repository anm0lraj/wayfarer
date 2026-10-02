import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { renderApp } from '@/test/renderApp'
import { settle } from '@/test/settle'
import { coverFromFile, MAX_COVER_BYTES } from '@/lib/media/image'

beforeAll(() => installMockApi())
beforeEach(async () => {
  await settle()
  localStorage.clear()
  await resetDemoData()
})

const photo = () => new File([new Uint8Array([1, 2, 3, 4])], 'beach.jpg', { type: 'image/jpeg' })

describe('trip cover photo', () => {
  it('the traveller’s own photo replaces the illustration, and they can go back', async () => {
    const user = userEvent.setup()
    renderApp('/trips/trip-bali')
    expect((await db.trips.get('trip-bali'))?.coverImage).toMatch(/^data:image\/svg/)

    await user.upload(await screen.findByLabelText('Choose a cover photo'), photo())
    await waitFor(async () => expect((await db.trips.get('trip-bali'))?.coverImage).toMatch(/^data:image\/jpeg;base64,/))

    const reset = await screen.findByRole('button', { name: 'Use illustration' })
    await waitFor(() => expect(reset).toBeEnabled()) // disabled while the first change finishes
    await user.click(reset)
    await waitFor(async () => expect((await db.trips.get('trip-bali'))?.coverImage).toMatch(/^data:image\/svg/))
    await settle()
  })
})

describe('coverFromFile', () => {
  it('refuses things that are not images, and photos that stay too large', async () => {
    await expect(coverFromFile(new File(['hi'], 'notes.txt', { type: 'text/plain' }))).rejects.toThrow('Choose an image file')
    await expect(coverFromFile(new File([new Uint8Array(MAX_COVER_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' }))).rejects.toThrow('too large')
  })
})
