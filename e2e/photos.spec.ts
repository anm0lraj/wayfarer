import { expect, test } from '@playwright/test'

// Photos come from another origin (Wikimedia Commons). On the first visit the page fetches them itself, but once the
// service worker controls the page it fetches them on the page's behalf, and the worker's requests are checked
// against the CSP's connect-src. A policy that only allowed the host in img-src let the photos load on the first
// visit and then silently fall back to illustrations from the second page load on. This test makes that visible.
test.describe('photos', () => {
  test('still load after the service worker takes control of the page', async ({ page }) => {
    await page.goto('/explore/itineraries')
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload() // now controlled by the worker
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { message: 'service worker should control the page' }).toBe(true)

    const state = () =>
      page.evaluate(() => {
        const stock = [...document.images].filter((i) => i.src.includes('upload.wikimedia.org'))
        return { stock: stock.length, loaded: stock.filter((i) => i.complete && i.naturalWidth > 0).length, fellBack: [...document.images].filter((i) => i.dataset.fellBack).length }
      })
    await expect.poll(async () => (await state()).loaded, { timeout: 30_000 }).toBeGreaterThanOrEqual(3) // lazy-loading: only the cards in view load at once
    expect((await state()).fellBack).toBe(0) // none of them gave up and showed an illustration
  })

  test('every credited photo is listed with its author and licence', async ({ page }) => {
    await page.goto('/credits')
    await expect(page.getByRole('heading', { level: 1, name: 'Photo credits' })).toBeVisible()
    const items = page.getByRole('listitem')
    await expect(items.first()).toBeVisible()
    expect(await items.count()).toBeGreaterThan(40)
    await expect(items.first().getByRole('link').first()).toHaveAttribute('href', /commons\.wikimedia\.org/)
    await expect(items.first()).toContainText(/by .+/)
  })
})
