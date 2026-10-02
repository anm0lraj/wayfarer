# Wayfarer — travel planning & trip companion

Plan your journey. Experience it. Capture it. Share it.

A responsive React web app (phone, tablet, desktop) that installs as a PWA. It runs entirely on mock services and local storage, so it needs no paid APIs or keys.

**Status:** all eight phases are built: discover, plan, itinerary and map, AI assistant, bookings (demo only), Live Trip, memories and stories, public sharing, and the polish pass (offline sync, PWA update and install, accessibility, security headers). Bookings are always saved to the trip, never purchased. Full spec: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md).

## Run it

Needs Node 18.15+ (Node 20+ recommended).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (dev-only component gallery at `/_design`) |
| `npm run build` | Typecheck, production build and PWA service worker |
| `npm run preview` | Serve the production build with the production security headers (needed to test the PWA) |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint (zero warnings allowed) |
| `npm test` | Vitest unit, component and integration tests |
| `npm run e2e` | Playwright at 390 / 820 / 1440 px (first time: `npx playwright install chromium`) |

The app seeds a demo on first load: **5 Days in Bali** (12–16 Oct 2026, 2 travellers, ₹60,000), a past Goa trip with photos and a story, 8 destinations and 8 public itineraries. Settings has a **demo date simulator** (to preview Upcoming, Live and Completed), a switch to simulate the AI being unavailable, **Install the app**, notification switches, and **Reset demo data**.

## How it's built

React 18 + TypeScript (strict), Vite, React Router, Tailwind with design tokens, Radix primitives, TanStack Query, Zustand, React Hook Form + Zod, Dexie (IndexedDB), dnd-kit, MapLibre, Framer Motion, MSW.

```
src/
  app/         shell, providers, router, layouts
  features/    one folder per area (trips, itinerary, map, ai, explore, live-trip, memories, public-trips, …)
  components/  design system (ui, layout, feedback, domain)
  services/    interfaces + mock adapters: ai, maps, bookings, weather, auth, storage, notifications, geolocation
  data/        Dexie db, repositories, sync queue and engine, upload queue, seed, query hooks
  mocks/       MSW handlers and seed fixtures
  types/       models and Zod schemas
```

Principles worth knowing:

- **Every external service is an interface** in `src/services` with a mock adapter; screens never import a vendor SDK. Swap an adapter in `src/services/container.ts` to go real.
- **No secrets in the client.** AI and booking calls go to `/api/*`, mocked in the page by MSW handlers (`src/mocks`). A real backend or serverless proxy replaces that.
- **The AI only proposes.** Its output is Zod-validated, shown as a card, applied through the same repositories as a manual edit, and undoable.
- **No fake bookings.** Mock bookings are always "Saved to trip — not booked".
- **Offline first.** Everything the app reads lives in IndexedDB, so the itinerary, bookings, saved places and memories work with no signal. Every write is also queued; `SyncRunner` sends the queue in batches when online and the header shows how many changes are waiting. Conflicts: the newer `updatedAt` wins and the traveller is told (`src/data/syncEngine.ts`). Photos queue separately in the upload queue (`src/data/uploadQueue.ts`).
- **Permissions are asked in context.** Location, camera, microphone and notifications are requested only after an explanation, from a button the traveller pressed — never on load.

More detail: [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) and [`CLAUDE.md`](CLAUDE.md) (architecture rules and non-obvious decisions).

## Swapping mocks for real services

| To get | Replace | Where |
|---|---|---|
| A real LLM | The `aiService` adapter and the `/api/ai` handler, with a serverless function that calls the model (keys stay server-side) | `src/services/ai`, `src/mocks/handlers/ai.ts` |
| Real flights and hotels | `bookingService`. Today only `mode: 'demo'` results are stored; a `live` result throws until you handle it deliberately | `src/services/bookings`, `src/data/queries/bookings.ts` |
| Google Maps | A `MapProvider` adapter next to `maplibreProvider.ts` | `src/services/maps` |
| Real weather | `weatherService` | `src/services/weather` |
| Firebase Auth, Storage, FCM | `authService`, `storageService` (`upload` and `publish`), `notificationService` | `src/services/*` |
| A real backend for sync | The `/api/sync` endpoint (the mock acknowledges everything). Compare `updatedAt` per entity and answer `conflict` with your newer copy | `src/data/syncEngine.ts`, `src/mocks/handlers/data.ts` |

Wire the new adapter in `src/services/container.ts`. Screens only see the interfaces.

## Deploy

Deployed as a static site. `vercel.json` rewrites every route to `index.html` (client-side routing), sets cache rules and the security headers, including a strict Content-Security-Policy (no inline or remote scripts; fonts from Google Fonts; map tiles from OpenStreetMap). The same headers are applied to `npm run preview` from `scripts/security-headers.mjs`, and a test keeps the two in sync. Build command `npm run build`, output `dist`.

Map tiles come from OpenStreetMap, so the map needs a network connection for areas you haven't viewed; tiles you've seen are cached. Bulk tile download is deliberately not done (OpenStreetMap's tile policy forbids it).

## Public pages and link previews

`/t/:slug` pages set Open Graph tags from JavaScript (`useDocumentMeta`). Crawlers that don't run JavaScript won't see them, so for real link previews add a prerender or server-render step for `/t/*` that writes the same tags into the HTML. The route is kept free of app state (`PublicLayout`), so that is a small change.

## Browser support

Built for current Chrome, Edge, Safari (iOS 16+) and Firefox. A few things to know:

- The install button only exists in Chromium browsers. Safari users use Add to Home Screen, which Settings explains.
- Web push on iOS needs the app added to the Home Screen. The in-app notification centre works everywhere.
- The `:has()` highlight on the sharing options simply doesn't highlight on browsers without it.
- Automated tests run in jsdom (Vitest). Playwright specs exist for the shell and itinerary at three widths. Safari and Firefox have not been exercised by automation.

## Testing

`npm test` runs unit, component and integration tests, including a walk through the whole demo journey (`src/features/journey.test.tsx`), a check that every route renders a real screen (`src/app/routes.smoke.test.tsx`), and a WCAG contrast check of the design tokens in both themes (`src/styles/contrast.test.ts`).
