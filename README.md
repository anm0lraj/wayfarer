# Wayfarer — travel planning & trip companion

Plan your journey. Experience it. Capture it. Share it.

A responsive React web app (phone, tablet, desktop) that installs as a PWA. It runs entirely on mock services and local storage, so it needs no paid APIs or keys.

**Status:** Phases 1–4 of 8 are built (foundation, Home/Explore/Trips/Create Trip/Overview, Itinerary/Map/AI assistant, Hotels/Flights/Bookings/Checklist). Bookings are demo only: saved to the trip, never purchased. Live Trip, memories, stories and public sharing are not built yet — those routes show a placeholder. Full spec: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md).

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
| `npm run preview` | Serve the production build (needed to test the PWA) |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint (zero warnings allowed) |
| `npm test` | Vitest unit and component tests |
| `npm run e2e` | Playwright at 390 / 820 / 1440 px (first time: `npx playwright install chromium`) |

The app seeds a demo on first load: **5 Days in Bali** (12–16 Oct 2026, 2 travellers, ₹60,000), a past Goa trip with photos, 8 destinations and 3 public itineraries. Settings has a **demo date simulator** (to preview Upcoming, Live and Completed), a switch to simulate the AI being unavailable, and **Reset demo data**.

## How it's built

React 18 + TypeScript (strict), Vite, React Router, Tailwind with design tokens, Radix primitives, TanStack Query, Zustand, React Hook Form + Zod, Dexie (IndexedDB), dnd-kit, MapLibre, MSW.

```
src/
  app/         shell, providers, router, layouts
  features/    one folder per area (trips, itinerary, map, ai, explore, …)
  components/  design system (ui, layout, feedback, domain)
  services/    interfaces + mock adapters: ai, maps, bookings, weather, auth, storage, notifications, geolocation
  data/        Dexie db, repositories, sync queue, seed, query hooks
  mocks/       MSW handlers and seed fixtures
  types/       models and Zod schemas
```

Principles worth knowing:

- **Every external service is an interface** in `src/services` with a mock adapter; screens never import a vendor SDK. Swap an adapter in `src/services/container.ts` to go real.
- **No secrets in the client.** AI and booking calls go to `/api/*`, mocked in the page by MSW handlers (`src/mocks`). A real backend/serverless proxy replaces that.
- **The AI only proposes.** Its output is Zod-validated, shown as a card, applied through the same repositories as a manual edit, and undoable.
- **No fake bookings.** Mock bookings are always "Saved to trip — not booked".
- **Offline first.** Trips live in IndexedDB; writes are queued for sync.

More detail: [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) and [`CLAUDE.md`](CLAUDE.md) (architecture rules and non-obvious decisions).

## Deploy

Deployed as a static site. `vercel.json` rewrites every route to `index.html` (client-side routing), sets basic security headers and cache rules. Build command `npm run build`, output `dist`. A strict Content-Security-Policy is planned for the polish phase.

Map tiles come from OpenStreetMap, so the map needs a network connection; everything else works offline once loaded.
