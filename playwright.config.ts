import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  // PW_CHANNEL=chrome (or msedge) runs against the browser already installed on this machine instead of Playwright's own Chromium.
  use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry', channel: process.env.PW_CHANNEL || undefined },
  webServer: { command: 'npm run build && npm run preview -- --port 4173', port: 4173, reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    // Other engines (spec §42: Safari on iPhone, Firefox). WebKit stands in for Safari. Opt in with PW_ALL_BROWSERS=1 and
    // `npx playwright install firefox webkit`; the default run stays on Chromium. (CI runs them in their own job.)
    ...(process.env.PW_ALL_BROWSERS ? [
      { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
      { name: 'webkit-iphone', use: { ...devices['iPhone 14'] } },
      { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    ] : []),
  ],
})
