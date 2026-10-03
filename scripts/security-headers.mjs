// Single source for the production security headers. vite.config.ts applies them to `npm run preview`
// (so the built app is tested under the real policy) and vercel.json repeats them for hosting; a unit test keeps the two equal.
const OSM = 'https://tile.openstreetmap.org'
// Firebase (Authentication, Firestore). Sign-in by popup loads Google's small `apis.google.com` script and a
// sign-in frame served from the project's own firebaseapp.com domain; nothing else may run script or frame.
const FIREBASE_API = ['https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://firestore.googleapis.com']
// Web push: getting a token (Firebase Installations + FCM registration) happens from the page.
const FCM = ['https://fcmregistrations.googleapis.com', 'https://firebaseinstallations.googleapis.com', 'https://fcm.googleapis.com']
const GOOGLE_SCRIPT ='https://apis.google.com'
// Free weather and road-route services called from the browser (no keys). See src/services/weather/openMeteo.ts and maps/osrm.ts.
const LIVE_DATA = ['https://api.open-meteo.com', 'https://router.project-osrm.org']
const AUTH_FRAMES = ['https://*.firebaseapp.com', 'https://accounts.google.com']

export const csp = [
  "default-src 'self'",
  `script-src 'self' ${GOOGLE_SCRIPT}`,
  // Tailwind/MapLibre/Framer Motion set inline styles; scripts stay strict.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${OSM}`,
  // The service worker caches images by fetching them itself, and a worker's fetches are governed by connect-src, not
  // img-src. Every host allowed in img-src must also be here or images load on the first visit and fail after the
  // worker takes control. (A test enforces this.)
  `connect-src 'self' blob: data: ${OSM} ${FIREBASE_API.join(' ')} ${FCM.join(' ')} ${LIVE_DATA.join(' ')}`,
  `frame-src ${AUTH_FRAMES.join(' ')}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Browsers report anything the policy blocks (a missed new host, an injected script) to a function that logs it.
  "report-uri /api/report",
].join('; ')

export const securityHeaders = {
  'Content-Security-Policy': csp,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=(self)',
}
