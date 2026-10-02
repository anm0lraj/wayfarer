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

## Phase 5 notes
- Live Trip (`/trips/:id/live`, `features/live-trip`) is only for `effectiveState === 'active'`; otherwise it shows a friendly "not live" state. Status logic is pure in `liveStatus.ts`: a stored status always wins, an untouched item is *inferred* `in_progress` inside its window, and a missed item is flagged `overdue` for the traveller to confirm. **Never infer `completed`.**
- Location is opt-in (`useLiveLocation`): nothing is requested until the traveller presses "Use my location" after reading why. `point` is always a real fix. Arrival is only a *suggestion* ("Start it"), never an automatic status change.
- Notifications: `features/notifications/rules.ts` is a pure function (trip + plan + clock → candidates with stable `key`s). `NotificationEngine` (mounted in `AppShell`) delivers them through `NotificationService.deliver`, which drops duplicates by `key` and respects per-type prefs. The browser push prompt is only shown via `PushPermissionCard` (after creating a trip, in the notification centre, in Settings) — never on load.
- Emergency numbers are static data in `src/data/emergency.ts` (bundled, so they work offline); add a country there to support another destination.

## Phase 6 notes
- Capture (`features/memories/AddMemory.tsx`): photos are read for EXIF (`lib/media/exif.ts`: capture time + GPS), then resized/re-encoded by `compressImage` (which also strips EXIF from the stored file). Day and activity are attached by time via `attachToPlan` in the *trip's* timezone; the traveller can override. Location is never fetched until its button is pressed; `stripLocationOnPublic` defaults to on.
- Offline upload queue: media is saved to the local `blobs` table first (`storage.upload`), the memory is `uploadState: 'queued'`, and `processMemoryUploads` (`data/uploadQueue.ts`) calls `storage.publish`. `UploadRunner` (in `AppShell`) runs it on load, on reconnect and every 30 s; failures become `failed` and are retried only by the Retry button. Swapping in Firebase Storage means implementing `publish` and `upload` on the storage adapter.
- Stories: `StoryViewer` is one component, full-screen on phones and a centred 9:16 stage on desktop; it does not auto-advance with reduced motion or over video/audio. `stories/:storyId` plays, `stories/:storyId/edit` and `stories/new` use `StoryCreator`. Slides reorder with buttons (no drag-only interaction).
- jsdom has no `URL.createObjectURL`; `src/test/setup.ts` stubs it. Seed version is 7 (adds a Goa story).

## Phase 7 notes
- Publishing (`publicTripRepo.publish`, UI in `features/public-trips/ShareTrip.tsx`) writes a **sanitised snapshot**: no notes, `bookingId`s, confirmation numbers or memory coordinates. Keep it that way when adding fields to items/memories. `visibility: 'link'` pages are reachable at `/t/:slug` but excluded from `listPage` (the feed); `public` ones are listed. Unpublishing deletes the record, so republishing gets a new slug.
- `/t/:publicSlug` lives under `PublicLayout` (no sign-in, no app state). Save / Like / Use This Itinerary go through `useSignInGate` (`data/queries/publicTrips.ts`), which sends signed-out visitors to `/signin` with a return path. "Use This Itinerary" always copies; the original snapshot is never mutated (tested).
- `useDocumentMeta` sets Open Graph tags client-side only. Real link previews need the server/prerender step from the spec (§2): emit the same tags into the HTML for `/t/*`.
- The feed (`PublicFeed.tsx`) is server-paginated (`FEED_PAGE_SIZE` = 6, cursor), filtered by `q`/`destination` in the URL, and row-virtualised with `useWindowVirtualizer` (columns: 1/2/3/4 at <640/640/1024/1536). A "Load more" button is the keyboard/no-scroll fallback.
- Likes are `likedTrips` (Dexie v3). Seed version is 8 (adds 5 public trips, so there are 8).
- Profile tabs are routes: `/profile/{trips,published,saved,memories}`; `/saved` also exists.

## Phase 8 notes
- Sync: every repository write goes through `put`/`del` (`repositories/shared.ts`) into `syncQueue`. `SyncRunner` (in `AppShell`) calls `syncNow` (`data/syncEngine.ts`) when online: batches of 50 to `/api/sync` (mock acks everything), a `conflict` answer means the newer `updatedAt` wins and the user is told. `SyncIndicator` in the header shows pending changes. Don't write tables outside `put`/`del` or the change never syncs.
- `RouteEffects` (shell + public layout) sets the document title, moves focus to `#main` and announces the page after a *page* change (`routeKey`: itinerary day/sheets don't count). It never steals focus from a field being typed in or an open dialog. Public trip pages set their own title via `useDocumentMeta`.
- `PageTransition` (Framer Motion, lazy-loaded, off for reduced motion) wraps the shell's `<Outlet>`. Keep animation to this; no other page-level motion.
- Security: the CSP and headers live in `scripts/security-headers.mjs`, used by `vite preview` and repeated in `vercel.json` (a test keeps them equal). No inline scripts: the theme bootstrap is `public/theme-init.js`. A new third-party origin (fonts, tiles, images, API) needs adding to the CSP, then check `npm run preview` for violations.
- Contrast: `src/styles/contrast.test.ts` checks the tokens for WCAG AA in both themes. Use `border-border-strong` (3:1) for the edge of inputs/buttons/chips and `border-border` only for quiet dividers.
- PWA: `usePwa` (`lib/pwa.ts`) holds the update-ready flag and the install event; `UpdateBanner` and Settings read it. Updates apply only when the user chooses to reload.
- Tests: Vitest runs with 6 workers and a 15 s timeout (jsdom + IndexedDB per file starves on many-core machines otherwise). If a test finishes while repository steps are still running, call `settle()` (`src/test/settle.ts`) before the next reset. The seed fixtures load lazily (`data/seedData.ts`); import `buildSeed` from there in tests.
- Onboarding (`/onboarding/:step`) is real and skippable; Settings → Account links back to it.

## Demo data
Primary demo: "5 Days in Bali", 12-17 Oct 2026, 2 travellers, budget ₹60,000, interests Food + Beaches + Photography. At least 3 public itineraries for the Explore feed. Include a demo-mode date simulator to preview Upcoming and Live states.
