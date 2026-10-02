// Single source for the production security headers. vite.config.ts applies them to `npm run preview`
// (so the built app is tested under the real policy) and vercel.json repeats them for hosting; a unit test keeps the two equal.
const OSM = 'https://tile.openstreetmap.org'
// Stock photography (Wikimedia Commons thumbnails); see src/lib/stock and /credits.
const COMMONS = 'https://upload.wikimedia.org'

export const csp = [
  "default-src 'self'",
  "script-src 'self'",
  // Tailwind/MapLibre/Framer Motion set inline styles; scripts stay strict.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${OSM} ${COMMONS}`,
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
