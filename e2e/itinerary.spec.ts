import { expect, test } from '@playwright/test'

// Runs at 390 / 820 / 1440 px. Written to catch what jsdom can't: real map rendering and real drag and drop.
test.describe('itinerary and map', () => {
  test('the map renders with a real size and one numbered pin per located stop', async ({ page }, info) => {
    // Regression: MapLibre 6 looks for its worker next to its own script; the build didn't ship it, the request got the
    // app's HTML, and the map drew pins but never a tile. The worker file must be served, as real JavaScript (checked on the
    // response rather than a "worker" event, which Playwright's Firefox does not emit; real Firefox runs this fine).
    const workerFailed = page.waitForEvent('console', { predicate: (m) => /worker|Failed to fetch/i.test(m.text()) && m.type() === 'error', timeout: 6000 }).then(() => true, () => false)
    const workerFile = page.waitForResponse((r) => /maplibre-gl-worker.*\.js$/.test(r.url()), { timeout: 15_000 })
    await page.goto('/trips/trip-bali/map?day=1')
    const served = await workerFile
    expect(served.status()).toBe(200)
    expect(served.headers()['content-type']).toMatch(/javascript/) // the SPA's HTML answer is what the original bug returned
    expect(await workerFailed).toBe(false)
    const map = page.getByRole('application', { name: 'Map of your stops' })
    await expect(map).toBeVisible()
    // Regression: the vendor CSS once collapsed the container to 0px tall.
    await expect.poll(async () => (await map.boundingBox())?.height ?? 0).toBeGreaterThan(200)
    await expect(page.locator('.maplibregl-marker')).toHaveCount(6)
    await expect(page.getByRole('button', { name: 'Stop 1: Arrive at Ngurah Rai Airport' })).toBeVisible()
    info.annotations.push({ type: 'note', description: 'Needs network for OpenStreetMap tiles; pins and route draw regardless.' })
  })

  test('itinerary and map sit side by side on desktop and tabs/strip elsewhere', async ({ page }, info) => {
    await page.goto('/trips/trip-bali/itinerary/day/1')
    await expect(page.getByRole('heading', { name: /Day 1/ })).toBeVisible()
    const map = page.getByRole('application', { name: 'Map of your stops' })
    if (info.project.name === 'desktop') {
      await expect(map).toBeVisible()
      const list = await page.getByRole('list', { name: 'Day 1 activities' }).boundingBox()
      const m = await map.boundingBox()
      expect(m!.x).toBeGreaterThan(list!.x + list!.width - 1) // map is to the right of the list
    } else if (info.project.name === 'phone') {
      await expect(map).toHaveCount(0) // phone: the map is its own tab
      await expect(page.getByRole('link', { name: 'View day on map' })).toBeVisible()
    }
  })

  test('drag and drop reorders and persists across reload', async ({ page }, info) => {
    // On a phone the third card is below the fold and a mouse can't drag to it; keep the width, make it taller.
    if (/phone/.test(info.project.name)) await page.setViewportSize({ width: page.viewportSize()!.width, height: 1800 })
    await page.goto('/trips/trip-bali/itinerary/day/1')
    const list = page.getByRole('list', { name: 'Day 1 activities' })
    const first = list.getByRole('button', { name: /^Reorder Arrive at Ngurah Rai Airport/ })
    const third = list.getByRole('button', { name: /^Reorder Lunch at Warung Sari Rasa/ })
    const a = (await first.boundingBox())!
    const b = (await third.boundingBox())!
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(a.x + a.width / 2, a.y + 20, { steps: 4 })
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 10, { steps: 12 })
    await page.mouse.up()
    await expect(list.getByRole('listitem').nth(2)).toContainText('Arrive at Ngurah Rai Airport')

    // The screen updates immediately (optimistic); the save to IndexedDB lands a moment later. Reload only once it has,
    // and check the stored positions are a clean 0..5 with no two items sharing one.
    const stored = () =>
      page.evaluate(
        () =>
          new Promise<Array<{ title: string; position: number }>>((resolve, reject) => {
            const open = indexedDB.open('travel-app')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const all = open.result.transaction('items').objectStore('items').getAll()
              all.onsuccess = () => {
                open.result.close()
                resolve(all.result.filter((i) => i.dayId === 'day-1').map((i) => ({ title: i.title, position: i.position })).sort((x, y) => x.position - y.position))
              }
            }
          }),
      )
    await expect.poll(async () => (await stored()).findIndex((i) => i.title === 'Arrive at Ngurah Rai Airport')).toBe(2)
    expect((await stored()).map((i) => i.position)).toEqual([0, 1, 2, 3, 4, 5])
    await page.reload()
    await expect(page.getByRole('list', { name: 'Day 1 activities' }).getByRole('listitem').nth(2)).toContainText('Arrive at Ngurah Rai Airport')
  })

  test('keyboard users can reorder with the actions menu', async ({ page }) => {
    await page.goto('/trips/trip-bali/itinerary/day/1')
    await page.getByRole('button', { name: 'Actions for Hotel check-in, Seminyak' }).press('Enter')
    await page.getByRole('menuitem', { name: 'Move up' }).press('Enter')
    await expect(page.getByRole('list', { name: 'Day 1 activities' }).getByRole('listitem').first()).toContainText('Hotel check-in')
  })

  test('assistant: ask, review a proposal, apply, undo', async ({ page }) => {
    await page.goto('/trips/trip-bali/ai')
    await page.getByRole('button', { name: 'Add a sunset viewpoint to Day 3' }).click()
    const card = page.getByRole('group', { name: 'Add to itinerary' })
    await expect(card).toBeVisible({ timeout: 10_000 })
    await card.getByRole('button', { name: 'Add to Day 3' }).click()
    await expect(card.getByText('Done')).toBeVisible()
    await card.getByRole('button', { name: 'Undo' }).click()
    await expect(card.getByText('Undone')).toBeVisible()
  })
})
