// Draws public/og-default.png (1200x630), the picture link previews show when a trip has no photo cover.
// Run once with `node scripts/make-og-image.mjs` (needs Chrome: PW_CHANNEL=chrome) and commit the result.
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const icon = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
const html = `<html><body style="margin:0;width:1200px;height:630px;display:grid;place-items:center;background:linear-gradient(160deg,#0b3b4a,#0e7490 55%,#f59e0b);font-family:Inter,system-ui,sans-serif;color:#fff">
<div style="text-align:center"><div style="width:140px;height:140px;margin:0 auto 28px">${icon}</div>
<div style="font-size:92px;font-weight:700;letter-spacing:-1px">Wayfarer</div>
<div style="font-size:36px;margin-top:14px;opacity:.92">Plan your journey. Experience it. Capture it. Share it.</div></div></body></html>`

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html)
await page.screenshot({ path: new URL('../public/og-default.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') })
await browser.close()
console.log('public/og-default.png written')
