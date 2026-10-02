import { expect, test, type Page } from '@playwright/test'

// One spec, run at 390 / 820 / 1440 px (see playwright.config.ts projects).
// Only one of bottom nav / rail / sidebar is displayed at a time, so `:visible` picks the active one.
const primaryNav = (page: Page) => page.locator('nav[aria-label="Primary"]:visible')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening)/ })).toBeVisible()
})

test('shows exactly one navigation pattern for the viewport', async ({ page }, info) => {
  const nav = primaryNav(page)
  await expect(nav).toHaveCount(1)
  const box = (await nav.boundingBox())!
  const vp = page.viewportSize()!
  if (info.project.name === 'phone') {
    expect(box.y + box.height).toBeCloseTo(vp.height, -1) // bottom bar
    expect(box.width).toBeCloseTo(vp.width, -1)
  } else if (info.project.name === 'tablet') {
    expect(box.x).toBe(0) // left rail
    expect(box.width).toBeLessThan(120)
  } else {
    expect(box.x).toBe(0) // sidebar
    expect(box.width).toBeGreaterThan(200)
  }
})

test('navigates between primary areas with real URLs and back/forward', async ({ page }) => {
  await primaryNav(page).getByRole('link', { name: 'Explore' }).click()
  await expect(page).toHaveURL(/\/explore$/)
  await primaryNav(page).getByRole('link', { name: 'Trips' }).click()
  await expect(page).toHaveURL(/\/trips$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/explore$/)
})

test('trip workspace tabs are URLs and the seeded Bali trip loads', async ({ page }) => {
  await page.getByRole('link', { name: /5 Days in Bali/ }).click()
  await expect(page).toHaveURL(/\/trips\/trip-bali$/)
  await page.getByRole('link', { name: 'Map' }).click()
  await expect(page).toHaveURL(/\/trips\/trip-bali\/map$/)
})

test('dark mode applies and persists across reload', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('demo date simulator makes the Live entry appear', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Day 2, 10:00' }).click()
  await expect(primaryNav(page).getByRole('link', { name: /Live/ })).toBeVisible()
})

test('unknown URLs show the 404 state', async ({ page }) => {
  await page.goto('/no/such/page')
  await expect(page.getByText('We can’t find that page')).toBeVisible()
})

// A scrolling row whose hidden (sr-only) children sit outside it used to widen the whole page on phones.
test('no page scrolls sideways', async ({ page }) => {
  for (const path of ['/', '/explore', '/trips', '/trips/trip-bali', '/trips/trip-bali/itinerary/day/1', '/trips/trip-bali/bookings']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    expect(scroll, path).toBeLessThanOrEqual(client)
  }
})
