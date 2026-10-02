/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { securityHeaders } from './scripts/security-headers.mjs'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  preview: { headers: securityHeaders },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Wayfarer — Travel Planner & Trip Companion',
        short_name: 'Wayfarer',
        description: 'Plan your journey. Experience it. Capture it. Share it.',
        theme_color: '#0e7490',
        background_color: '#f6f7f9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'images', expiration: { maxEntries: 120 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: './src/test/environment.ts',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Each test file boots a jsdom app with IndexedDB; running them all at once on a many-core machine starves the
    // first query of CPU and produces random timeouts. A handful of workers is faster overall and stable.
    maxWorkers: 6,
    minWorkers: 1,
    testTimeout: 15_000,
  },
})
