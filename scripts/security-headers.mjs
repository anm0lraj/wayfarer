// Single source for the production security headers. vite.config.ts applies them to `npm run preview`
// (so the built app is tested under the real policy) and vercel.json repeats them for hosting; a unit test keeps the two equal.
const OSM = 'https://tile.openstreetmap.org'

export const csp = [
  "default-src 'self'",
  "script-src 'self'",
  // Tailwind/MapLibre/Framer Motion set inline styles; scripts stay strict.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${OSM}`,
  // The service worker caches images by fetching them itself, and a worker's fetches are governed by connect-src, not
  // img-src. Every host allowed in img-src must also be here or images load on the first visit and fail after the
  // worker takes control. (A test enforces this.)
  `connect-src 'self' blob: data: ${OSM}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

export const securityHeaders = {
  'Content-Security-Policy': csp,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=(self)',
}
