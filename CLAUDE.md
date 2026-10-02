# Travel Planning & Trip Companion App

Responsive React web app (phone, tablet, desktop) installable as a PWA. Takes users through: Discover → Plan → Build Itinerary → Book → Travel → Capture Memories → Share.

Full product spec: @docs/PRODUCT_SPEC.md (read the relevant sections before building each feature; do not skip ahead of the current phase).

## Stack
- React 18 + TypeScript (strict), Vite
- React Router (lazy-loaded routes), Tailwind CSS with design tokens as CSS variables
- Radix UI / shadcn/ui primitives, Framer Motion (restrained), dnd-kit, TanStack Query, TanStack Virtual
- Zustand for client state, React Hook Form + Zod for forms and validation
- Dexie (IndexedDB) for offline data, vite-plugin-pwa for service worker
- MapLibre GL / Leaflet behind a map provider interface (Google Maps can be added later)
- MSW for mock APIs, Vitest + React Testing Library, Playwright for e2e

## Architecture rules
- Feature-based folders: `src/app`, `src/features/*`, `src/components`, `src/services`, `src/data`, `src/mocks`, `src/lib`, `src/types`, `src/styles`.
- Every external service (AI, maps, bookings, weather, auth, storage, notifications) is an interface in `src/services` with a mock adapter. Screens never import a vendor SDK directly.
- Types and Zod schemas live in `src/types`. AI actions are typed, Zod-validated, and applied through the same repositories as user edits. The model never writes data directly.
- No secret API keys in the client. AI and booking calls go through a backend/serverless proxy (mocked for now).
- Mock bookings must be clearly labelled as demo or "not booked". Never fake a confirmed booking or fake live location.
- Location, camera, and notification permissions are requested only in context, after an explanation.

## UX rules
- Mobile-first, but design phone, tablet, and desktop layouts deliberately. Do not just stretch the phone layout.
- Phone: bottom nav and bottom sheets. Tablet: navigation rail. Desktop: sidebar, itinerary + map side by side, docked AI panel.
- Every screen has a real URL. Every screen has loading (skeleton), empty, error, and offline states.
- Light and dark mode. WCAG 2.2 AA, full keyboard support, respect `prefers-reduced-motion`.
- Calm, premium, travel-focused. Avoid random gradients, excess cards, and AI used as decoration.

## Working style
- Work phase by phase (see spec section 42). Do only the current phase. Stop at the end of each phase for review.
- For each phase: outline the plan, implement, run typecheck + lint + tests, check the app in the browser at 390px, 820px, and 1440px widths, then summarize what changed.
- Keep functions and components small. Prefer reusing design-system components over new one-offs.
- Do not add dependencies beyond the stack above without asking.

## Commands
- `npm run dev` - start dev server (http://localhost:5173; dev-only component gallery at `/_design`)
- `npm run build` - typecheck + production build + PWA service worker (uses `scripts/vite-build.mjs`, which adds the Web Crypto flag on Node < 19)
- `npm run preview` - serve the production build (needed for PWA/service worker checks)
- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint, zero warnings allowed
- `npm test` - Vitest unit/component tests (`npm run test:watch` to watch)
- `npm run e2e` - Playwright tests at 390 / 820 / 1440 px (first run: `npx playwright install chromium`)

## Phase 1 notes (things that are not obvious from the code)
- `/api/*` is mocked **in-page** by wrapping `fetch` (`src/mocks/install.ts`) with MSW handlers, not by MSW's service worker: the PWA's Workbox worker owns scope `/` and a page can have only one. MSW is lazy-loaded on the first API call.
- Trip state: only `draft | planning | ready | archived` are stored. `upcoming | active | completed` are derived by `computeTripState` from the trip's own timezone and the clock service (demo date simulator in Settings). Always read state via `useTrips()` / `effectiveState`, never `trip.state` for display.
- Bookings are always `mode: 'demo'`, `status: 'saved'` via `bookingRepo.saveDemo`; the schema rejects a confirmed demo booking.
- Repositories enforce roles (`requireTripAccess`) and queue every write in `syncQueue`. AI actions go through `applyAIAction` (Zod-validated, undoable).
- Dev environment is Node 18.15: `package.json` overrides `path-scurry`'s `lru-cache` to 10.x and tests use a custom Vitest environment (`src/test/environment.ts`). Both can be dropped on Node ≥ 20.
- Seed data is versioned (`SEED_VERSION` in `src/data/seed.ts`); bump it when fixtures change so existing IndexedDB data reseeds.

## Phase 3 notes
- `/trips/:id/itinerary/*` is **one** route (`ItineraryView`) that serves the day list, `…/day/:n/add` and `…/items/:id`, so opening a sheet never remounts the list behind it. The URLs are unchanged.
- Itinerary edits go through `useItineraryActions`: optimistic cache update → repository write → rollback + toast on failure → refetch. Pure cache updaters live in `planCache.ts`. Every day mutation in `itineraryRepo` ends with `refreshLegs(dayId)` (distance/travel time between stops); don't write items without it.
- Timing rules live in `features/itinerary/schedule.ts` (warnings, busy-day, re-time). The seeded Bali trip is tested to have **no** warnings, so keep fixtures realistic.
- Maps: screens use `TripMap` + the `MapProvider` interface only. MapLibre forces `position: relative` on its container — keep the container inside an absolutely positioned wrapper (see `TripMap.tsx`); jsdom can't catch a collapsed map, so e2e checks its height.
- Split view (itinerary beside map) = desktop, or tablet in landscape (`useSplitView`). Portrait tablet gets a collapsible map strip; phones get a separate Map tab.
- AI: the assistant only *proposes*. Every action is Zod-validated in `useChat`, shown as a card, applied via `applyAIAction` on click (destructive ones ask again), and undoable. Chat state is persisted per conversation; the desktop docked panel width/open state is in `panelStore`.
- Tests that need a map use `createFakeMap()` (`src/test/fakeMap.ts`) through `renderApp(path, { maps })`.

## Phase 4 notes
- Saving anything to a trip goes through `useSaveBooking` (`data/queries/bookings.ts`): `BookingService.createBooking` → only a `demo` result is stored (via `bookingRepo.saveDemo`), a `live` result throws until a real provider adapter exists. Every booking card/panel shows `DemoBadge` ("Saved to trip — not booked"); never word it as confirmed or purchased.
- Hotel search state (stay dates, guests, filters, sort) lives in the URL query (`features/bookings/filters.ts` parses/serialises, defaulting to the trip's dates and party size). Filter chips come from the unfiltered list. Phone/tablet use a filter sheet, ≥1024px a sidebar. Flights use `?leg=return&from&to&date&travellers`.
- Activities and transport are "saved" from itinerary items (`bookable.ts`), keyed by `refId = item.id`. Flight times are read as wall-clock straight from the ISO string (it carries the airport's offset); other times use the trip timezone (`zonedIso`, `bookingWhen(b, tz)`).
- Checklist: the three booking items are derived from saved bookings (`resolveChecklist`), the rest are plain custom items the user can tick or delete.

## Demo data
Primary demo: "5 Days in Bali", 12-17 Oct 2026, 2 travellers, budget ₹60,000, interests Food + Beaches + Photography. At least 3 public itineraries for the Explore feed. Include a demo-mode date simulator to preview Upcoming and Live states.
