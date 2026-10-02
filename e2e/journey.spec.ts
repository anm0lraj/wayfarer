import { expect, test, type Page } from '@playwright/test'

// The spec §39 demo journey in a real browser, against the production build (with its real CSP and service worker),
// at 390 / 820 / 1440 px. Each project starts with an empty browser profile, so the demo data is seeded fresh.
// The unit-level version of this walk is src/features/journey.test.tsx; this one adds what jsdom can't:
// a real canvas (photo compression), real file inputs, real focus, the map, offline mode and the CSP.

const primaryNav = (page: Page) => page.locator('nav[aria-label="Primary"]:visible')

/** Uses the Settings demo date simulator, the way a person demoing the app would. */
async function setDemoDate(page: Page, preset: '7 days before' | 'Day 1, 08:30' | 'Day after trip') {
  await page.goto('/settings')
  await page.getByRole('button', { name: preset }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Demo date:' })).toBeVisible()
}

// A real (1×1) PNG, so the browser's image pipeline runs for real when it is chosen.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

test.describe('Bali journey', () => {
  test('prepare → live → capture → publish → reuse', async ({ page }) => {
    test.setTimeout(120_000)
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => ((window as unknown as { __csp: string[] }).__csp ??= []).push(`${e.violatedDirective} ${e.blockedURI}`))
    })

    // Seven days out: countdown, checklist and the first reminder.
    await setDemoDate(page, '7 days before')
    await page.goto('/trips/trip-bali')
    await expect(page.getByRole('heading', { level: 1, name: '5 Days in Bali' })).toBeVisible()
    await expect(page.getByText('7 days to go')).toBeVisible()
    await page.goto('/trips/trip-bali/checklist')
    await expect(page.getByRole('heading', { name: 'Before you go' })).toBeVisible()
    await page.goto('/notifications')
    await expect(page.getByText('Your Bali trip starts in 7 days.')).toBeVisible({ timeout: 15_000 })

    // Trip day: Live appears in the navigation, with the first-activity greeting and a directions link.
    await setDemoDate(page, 'Day 1, 08:30')
    await page.goto('/')
    await primaryNav(page).getByRole('link', { name: 'Live' }).click()
    await expect(page).toHaveURL(/\/trips\/trip-bali\/live$/)
    await expect(page.getByText('Good morning. Your first activity starts at 9:30 AM.')).toBeVisible()
    await expect(page.getByRole('link', { name: /Navigate to Next/ })).toHaveAttribute('target', '_blank')

    // On the way → arrived → done.
    await page.getByRole('button', { name: /on my way/ }).click()
    await page.getByRole('button', { name: /I.ve arrived/ }).click()
    await expect(page.getByText('Happening now')).toBeVisible()
    await page.getByRole('button', { name: /Mark done/ }).click()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible() // the "done" toast

    // A note, then a photo (compressed by the real browser, uploaded in the background).
    await page.getByRole('link', { name: /Add memory/ }).click()
    await page.getByRole('button', { name: /Note/ }).click()
    await page.getByLabel('Your note').fill('Landed. Humid, golden light.')
    await page.getByRole('button', { name: 'Save memory' }).click()
    await expect(page).toHaveURL(/\/trips\/trip-bali\/memories$/)
    await expect(page.getByRole('heading', { name: /Day 1/ })).toBeVisible()
    await expect(page.getByText('Landed. Humid, golden light.')).toBeVisible()

    await page.getByRole('link', { name: 'Add memory' }).click()
    await page.getByLabel('Choose a photo').setInputFiles({ name: 'sunset.png', mimeType: 'image/png', buffer: PNG })
    await page.getByLabel('Caption (optional)').fill('Sunset at Seminyak Beach')
    await page.getByRole('button', { name: 'Save memory' }).click()
    await expect(page.getByRole('img', { name: 'Sunset at Seminyak Beach' })).toBeVisible()
    await expect(page.getByText('Waiting to upload')).toHaveCount(0, { timeout: 15_000 })

    // A story from the photo.
    await page.getByRole('link', { name: /Create story/ }).click()
    await page.getByLabel('Title').fill('Day 1 — Bali')
    await page.getByRole('button', { name: /Sunset at Seminyak Beach/ }).click()
    await page.getByRole('button', { name: 'Save story' }).click()
    const story = page.getByRole('dialog', { name: 'Story: Day 1 — Bali' })
    await expect(story).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(story).toBeHidden()

    // After the trip: the prompt, then publish.
    await setDemoDate(page, 'Day after trip')
    await page.goto('/trips/trip-bali')
    await expect(page.getByText('Turn your memories into a shareable trip?')).toBeVisible()
    await page.getByRole('link', { name: 'Share this trip' }).click()
    await page.getByRole('radio', { name: /^Public/ }).check()
    await page.getByLabel('Description').fill('Five days of sunsets, temples and street food in Bali.')
    await page.getByRole('button', { name: 'Publish trip' }).click()
    await expect(page.getByText('Your trip is live')).toBeVisible()
    const link = (await page.locator('p.font-mono').innerText()).trim()
    expect(link).toMatch(/\/t\/5-days-in-bali-[a-z0-9]{4}$/)

    // Someone opens the link: a public page with its own title and preview tags, then copies it.
    await page.goto(link)
    await expect(page.getByRole('heading', { level: 1, name: '5 Days in Bali' })).toBeVisible()
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', '5 Days in Bali')
    await expect(page.getByRole('img', { name: 'Sunset at Seminyak Beach' })).toBeVisible() // their photo is on the public page
    await page.getByRole('button', { name: 'Use This Itinerary' }).click()
    const dialog = page.getByRole('dialog', { name: 'Use this itinerary' })
    await dialog.locator('input[type=date]').fill('2027-02-01')
    await dialog.getByRole('button', { name: 'Copy to my trips' }).click()
    await expect(page).toHaveURL(/\/trips\/[^/]+\/itinerary(\/day\/1)?$/) // the itinerary opens on its first day
    await expect(page.getByRole('heading', { level: 1, name: /\(copy\)/ })).toBeVisible()

    // Nothing the journey did was blocked by the content security policy.
    expect(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])).toEqual([])
  })

  test('a signed-out visitor can read a public trip and is asked to sign in only to save', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('demo-signed-out', '1'))
    const url = '/t/7-days-in-japan-food-culture-k7p2'
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1, name: /7 Days in Japan/ })).toBeVisible()
    await page.getByRole('button', { name: /^Save$/ }).click()
    await expect(page).toHaveURL(/\/signin$/)
    await page.getByRole('button', { name: 'Continue as demo traveller' }).click()
    await expect(page).toHaveURL(new RegExp(`${url}$`)) // straight back where they were
    await page.getByRole('button', { name: /^Save$/ }).click()
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible()
  })

  test('works offline: edits are kept on the device and sync when the connection returns', async ({ page, context }) => {
    await page.goto('/trips/trip-bali/memories/new')
    await page.getByRole('button', { name: /Note/ }).click()
    await expect(page.getByLabel('Your note')).toBeVisible()
    await context.setOffline(true)
    await expect(page.getByText(/Offline mode/)).toBeVisible()

    await page.getByLabel('Your note').fill('Written with no signal')
    await page.getByRole('button', { name: 'Save memory' }).click()
    await expect(page.getByText('Written with no signal')).toBeVisible()
    await expect(page.getByRole('status', { name: /waiting for a connection/ })).toBeVisible()

    await context.setOffline(false)
    await expect(page.getByText(/Offline mode/)).toBeHidden()
    await expect(page.getByRole('status', { name: /waiting for a connection|waiting to sync|Syncing/ })).toBeHidden({ timeout: 20_000 })
  })
})
