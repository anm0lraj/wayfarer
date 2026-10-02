# Build a Complete Responsive Web Travel Planning & Trip Companion App (React)

You are a senior product designer, UX architect, front-end engineer, and product strategist.

Build a polished, production-quality **responsive web application** for travel planning and trip companionship, built with **React**, that works well on **phones, tablets, and desktops** and can be **installed as a Progressive Web App (PWA)**. It takes the user through the entire travel journey:

**Discover → Plan → Build Itinerary → Book → Travel → Capture Memories → Share**

The app should feel like a modern combination of a travel planner, itinerary builder, map-based trip organizer, AI travel assistant, booking companion, and social travel journal.

Do not build this as a simple CRUD application. Think deeply about the end-to-end travel experience and create a cohesive product.

---

## 1. Product Vision

The app should allow users to:

1. Discover destinations
2. Ask an AI travel assistant questions
3. Create a trip
4. Build a day-by-day itinerary
5. Visualize the itinerary on a map
6. Get recommendations for places, restaurants, activities and attractions
7. Organize bookings
8. Track the trip while travelling
9. Add live updates, stories, photos and memories
10. Share the completed trip or itinerary publicly
11. Allow other users to discover and reuse public itineraries

The core idea:

> **Plan your journey. Experience it. Capture it. Share it.**

---

## 2. Platform & Tech Stack

Build this as a **responsive React web application** that is **mobile-first**, adapts to tablet and desktop, and is installable as a **PWA** (works offline, can be added to the home screen).

Preferred stack:

- **React 18+** with **TypeScript** (strict mode)
- **Vite** as the build tool
- **React Router** (data routers, lazy-loaded routes)
- **Tailwind CSS** for styling, with design tokens defined as CSS variables
- **Radix UI / shadcn/ui** for accessible primitives (dialogs, sheets, tabs, popovers, menus)
- **TanStack Query** for server state, caching, retries and background refresh
- **Zustand** for client/UI state (active trip, UI preferences, draft forms)
- **React Hook Form + Zod** for forms and validation
- **Dexie (IndexedDB)** for local persistence and offline data
- **vite-plugin-pwa / Workbox** for service worker, offline caching and install prompt
- **MapLibre GL JS** (or Leaflet) with free OpenStreetMap-based tiles for maps, behind a map provider abstraction so **Google Maps JavaScript API** can be swapped in later
- **dnd-kit** for drag and drop (touch + mouse + keyboard)
- **date-fns** for date handling
- **Framer Motion** for restrained, purposeful animation
- **TanStack Virtual** for long lists/feeds
- **Firebase** where appropriate:
  - Firebase Authentication (web)
  - Firebase Storage (photos/videos/voice notes)
  - Firebase Cloud Messaging (web push)
  - Firebase Analytics
- **MSW (Mock Service Worker)** to serve realistic mock APIs during development
- **Vitest + React Testing Library** for unit/component tests, **Playwright** for end-to-end tests

Structure the project so that external services can easily be replaced later.

Use mock/local data where real APIs are unavailable.

The app must run without requiring paid third-party APIs during initial development.

Architect public trip pages so that server-side rendering (e.g. migrating those routes to Next.js or adding a prerender step) can be added later for SEO and link previews without restructuring the app.

---

## 3. Responsive Layout & Core Navigation

The app must be designed for three layout classes, not just shrunk or stretched:

| Layout | Width | Navigation | Layout pattern |
|---|---|---|---|
| **Phone** | < 640px | Bottom navigation bar | Single column, bottom sheets, full-screen flows |
| **Tablet** | 640–1024px | Navigation rail (left, icons + labels) | Two-pane where useful (list + detail, itinerary + map) |
| **Desktop** | > 1024px | Collapsible left sidebar | Multi-column: e.g. itinerary + map side by side, AI assistant as a docked side panel |

Primary destinations:

- Home
- Trips
- Explore
- AI
- Profile

During an active trip, introduce a prominent **Live Trip** entry point (a highlighted nav item or persistent banner):

Home → Active Trip → Live Trip

Responsive behaviour rules:

- Bottom sheets on phone become side panels, popovers or dialogs on tablet/desktop.
- Full-screen flows on phone (e.g. Create Trip) become centered dialogs or split views on desktop.
- The itinerary and map are separate tabs on phone but shown side by side on tablet landscape and desktop, with selection synced between them.
- The AI assistant is a full screen on phone and a docked, resizable side panel on desktop so it can be used alongside the itinerary.
- Every route must have a real, shareable URL (e.g. `/trips/:tripId/itinerary/day/2`, `/explore/:destinationId`, `/t/:publicSlug`). Browser back/forward must behave correctly.
- Respect safe-area insets on phones (`env(safe-area-inset-*)`) for installed PWA use.
- Touch targets at least 44×44px; support hover states only as enhancements.
- Support both portrait and landscape orientations.

---

## 4. Onboarding

Create a short onboarding experience.

Collect:

- Name
- Home location
- Preferred travel style
- Budget range
- Preferred destinations
- Interests: Nature, Food, Adventure, History, Beaches, Mountains, Nightlife, Photography, Shopping, Culture
- Typical trip duration
- Preferred accommodation
- Solo / Couple / Friends / Family

Allow users to skip onboarding.

Do not make onboarding unnecessarily long. On desktop, present it as a centered, multi-step card rather than full-bleed phone screens.

---

## 5. Home Screen

Create a personalized travel dashboard.

**Upcoming Trips** — cards showing:

- Destination
- Dates
- Trip duration
- Cover image
- Planning progress
- Countdown

Example:

> Goa
> 12–16 Oct
> 18 days to go
> Planning 72% complete

**Continue Planning** — unfinished planning tasks:

- Add accommodation
- Add activities
- Complete Day 2
- Review route

**Explore** — destination recommendations.

**Inspiration** — public itineraries from other travellers.

**Memories** — recently uploaded travel memories.

On desktop, use a multi-column grid; on phone, a single scrolling column with horizontally scrollable carousels.

---

## 6. Create Trip

Primary CTA: **+ Plan a Trip**

Trip creation flow (full-screen stepper on phone, dialog/split view on desktop, with progress indicator and the ability to go back):

**Step 1 — Destination**
Search destination (e.g. Goa, Japan, Paris, Bali). Allow multiple destinations, e.g. *Delhi → Jaipur → Udaipur → Jodhpur*.

**Step 2 — Dates**
Select start and end date. Calculate trip duration automatically.

**Step 3 — Travellers**
Solo / Couple / Friends / Family / Custom number.

**Step 4 — Budget**
Economy / Comfort / Premium / Luxury. Allow custom budget.

**Step 5 — Interests**
Select travel interests.

**Step 6 — Planning Style**
Let AI plan / Build manually / AI + manual.

After creation, generate the trip workspace. Persist in-progress drafts so a refresh or closed tab does not lose the user's input.

---

## 7. AI Travel Assistant

Create a dedicated AI query space. This should be one of the most important parts of the app.

The experience should feel like a conversational travel assistant, with streamed responses.

Example queries:

- "Plan a 5-day trip to Bali under ₹60,000."
- "What should I do in Tokyo for 4 days?"
- "Find places near my hotel."
- "I have 4 hours before my flight. What can I do nearby?"
- "Rearrange Day 2 because I don't want to wake up early."
- "Suggest vegetarian restaurants near this attraction."
- "Make this itinerary less hectic."
- "Add a sunset viewpoint to Day 3."
- "Can I fit these three places into one afternoon?"

The AI should understand the current trip context. For example:

> Trip: Bali, 12–17 October, Budget ₹60,000, Hotel: Seminyak
> User: "Suggest something for tomorrow evening."

The AI should understand the context without asking the user to repeat everything.

All AI calls must go through a **backend proxy / serverless function** (never call an LLM provider directly from the browser with an API key). Provide a mock AI provider that returns realistic, structured responses so the app works without any paid API.

---

## 8. AI Actions

AI responses should not only be text. Provide actionable buttons/cards:

- Add to itinerary
- Replace activity
- Move to another day
- View on map
- Save
- Book
- Navigate
- Add restaurant
- Add attraction

Example:

> AI: "I found three sunset spots near your hotel."
> [Add to Day 3] [View on Map] [Compare]

---

## 9. AI Itinerary Generation

Allow users to generate a complete itinerary, e.g. "Create a 6-day Japan itinerary focused on food, culture and photography."

Generate days such as:

**Day 1** — Arrival, Hotel check-in, Nearby exploration, Dinner
**Day 2** — Attraction, Lunch, Shopping, Sunset location, Dinner

Each activity should contain:

- Time
- Duration
- Location
- Description
- Estimated cost
- Distance
- Travel time
- Category
- Image
- Map location

Allow users to regenerate individual days. Show a preview/diff before applying a regenerated day.

---

## 10. Trip Workspace

Every trip has a dedicated workspace with its own URL.

**Header:** Destination, Dates, Weather, Planning progress

**Tabs:** Overview, Itinerary, Map, Bookings, Memories

Tabs are reflected in the URL. On desktop, Itinerary and Map can be combined into a split view.

---

## 11. Itinerary Builder

This is one of the core features. Display the itinerary by day.

Example:

**Day 1 — Arrival**

- 09:30 ✈️ Arrive at airport
- 11:00 🏨 Hotel check-in
- 13:00 🍜 Lunch
- 15:00 📍 City exploration
- 18:30 🌅 Sunset viewpoint
- 20:00 🍽 Dinner

Allow:

- Drag and drop (touch, mouse **and** keyboard-accessible via dnd-kit)
- Reorder activities
- Move activity between days (on desktop, show days as columns or a day list you can drop onto)
- Delete activity (with undo toast)
- Duplicate activity
- Add activity
- Add notes
- Add reservation
- Add custom location

Each itinerary item should have: Time, Duration, Location, Category, Cost, Notes, Booking information.

Show travel time between locations.

Warn users when the itinerary is unrealistic, e.g.:

> ⚠️ This schedule gives you only 15 minutes to travel between these locations. Recommended travel time: 35 minutes.

Use optimistic updates with rollback on failure.

---

## 12. Map Integration

Build a **map provider abstraction** (interface + adapters). Ship with a free provider (MapLibre GL / Leaflet + OpenStreetMap tiles and a free/open routing source or mocked routes), and make a Google Maps JavaScript API adapter possible later without changing screens.

The map should visualize: Hotels, Attractions, Restaurants, Activities, Airports, Transport, Itinerary locations.

For each day, allow **View Day on Map**, displaying numbered itinerary points (1 → 2 → 3 → 4) and a route between locations.

Allow:

- Directions (deep link to Google Maps / Apple Maps / device maps app)
- Navigation (deep link)
- Nearby search
- Save location
- Add to itinerary

Selecting an item in the itinerary highlights it on the map and vice versa. Lazy-load the map library so it doesn't slow initial page load.

---

## 13. Explore

Create a destination discovery experience.

Search: "Where do you want to go?"

Destination cards. Categories: Trending, Weekend trips, Beaches, Mountains, Food, Adventure, International, Budget trips.

**Destination page:**

- Hero image
- Overview
- Best time to visit
- Estimated budget
- Popular places
- Food
- Activities
- Public itineraries
- Weather
- Travel tips

CTA: **Plan a Trip** (pre-fills the Create Trip flow with this destination).

---

## 14. Recommendations

Provide contextual recommendations. When viewing a destination:

- **Popular Places** — Attractions
- **Eat & Drink** — Restaurants
- **Experiences** — Activities
- **Hidden Gems** — Less touristy locations

Each recommendation supports: Save, Add to trip, View on map, Ask AI, Share (Web Share API with copy-link fallback).

---

## 15. Booking Hub

Once itinerary planning is complete, move the user into booking.

Sections: Flights, Hotels, Activities, Transport.

Booking cards contain: Provider, Price, Date, Time, Confirmation number, Booking status.

For initial implementation, use mock booking data. Architect the app so flight/hotel provider APIs can be integrated later (via backend, never with keys in the client).

**Important:** Do not pretend that a booking has been completed unless a real booking API is connected. Mock bookings must be clearly labelled (e.g. "Saved to trip — not booked" or "Demo booking").

---

## 16. Hotel Booking

Hotel search UI: Destination, Dates, Guests.

Filters: Price, Rating, Distance, Amenities, Property type. (Filter sheet on phone, persistent filter sidebar on desktop; filters reflected in URL query params.)

Hotel card: Image, Name, Rating, Price/night, Total price, Distance from destination, Amenities.

Hotel detail: Photos (gallery/lightbox), Rooms, Amenities, Location (map), Reviews, Price, Booking CTA.

Allow: **Add Hotel to Trip**

---

## 17. Flight Booking

Flight search: From, To, Date, Travellers.

Flight cards: Airline, Departure, Arrival, Duration, Stops, Price.

Allow: **Add Flight to Trip**

Use mock data initially if live APIs are unavailable.

---

## 18. Trip Preparation

Before the trip starts, show a **Trip Checklist**:

- Flight booked
- Hotel booked
- Activities booked
- Passport
- Visa
- Travel insurance
- Currency
- Packing list

Allow users to create custom checklist items.

---

## 19. Live Trip Mode

Once the trip start date arrives (based on the trip's timezone), the trip changes into **LIVE TRIP**. This should feel different from planning mode — simpler, larger type, glanceable, designed for one-handed phone use.

Dashboard:

> 📍 You're in Bali

**Today — Day 2**

- 09:00 Breakfast
- 10:00 Temple visit
- 13:00 Lunch
- 15:00 Beach
- 18:30 Sunset

Show:

- Current location (only if permission granted)
- Next activity
- Remaining activities
- Navigation
- Weather
- Travel time
- Emergency information

Primary CTA: **Navigate to Next** (opens directions in the device's maps app via deep link).

Provide a "simulate trip date" developer/demo toggle so Live Trip mode can be demonstrated before the real dates.

---

## 20. Live Status

Users can update activity status: Upcoming, On the way, In progress, Completed, Skipped.

Allow automatic progress based on time, and on location where the browser Geolocation API permission has been granted.

Never make location tracking mandatory.

Clearly explain why location is needed **before** triggering the browser permission prompt, and handle denied/unavailable states gracefully. Note that background location is not available on the web — design accordingly (update while the app is open).

---

## 21. Stories & Memories

During a trip, users can capture memories via **Add Memory**:

- Photo (file input with `accept="image/*"` and `capture` for direct camera on mobile)
- Video
- Text
- Location
- Voice note (MediaRecorder API)

Example:

> 📸 Photo — "Sunset at Seminyak Beach"

Automatically attach: Date, Time, Location, Trip, Itinerary activity (read EXIF where available, otherwise current time/activity).

Allow captions. Compress and resize images client-side before upload. Queue uploads while offline and sync when back online.

---

## 22. Travel Stories

Create an Instagram-story-like experience specifically for trips, e.g. "Day 2 — Bali", with:

- Photos
- Videos
- Text
- Location
- Stickers
- Itinerary highlights

Stories can be: Private, Friends only, Public.

Keep the interface simple. Full-screen tap-to-advance viewer on phone, centered vertical viewer with arrow-key navigation on desktop.

---

## 23. Memories Timeline

Create a beautiful chronological travel journal:

**Bali — October 2026**

- Day 1: 📸 Airport, 📸 Hotel, 📸 Dinner
- Day 2: 📸 Temple, 📸 Beach, 📸 Sunset

Show the trip as a visual timeline (single column on phone, masonry/grid per day on desktop).

---

## 24. Public Trip Sharing

Users can publish a trip. CTA: **Share Trip**

Privacy options: Private, Anyone with link, Public.

Public trip page (its own clean URL, e.g. `/t/5-days-in-bali-ab12`, with Open Graph meta tags for link previews) contains:

- Cover image
- Destination
- Duration
- Approximate budget
- Travel style
- Day-by-day itinerary
- Map
- Places visited
- Photos
- Memories
- Tips

Other users can: Like, Save, Share, Copy itinerary, Use as inspiration.

CTA: **Use This Itinerary** — creates a copy in the user's account rather than modifying the original. Logged-out visitors can view public trips and are asked to sign in only when they try to save or copy.

---

## 25. Public Explore Feed

Create a social discovery feed, e.g.:

- "7 Days in Japan — Food & Culture"
- "4 Days in Bali — Couple Trip"
- "3-Day Goa Budget Trip"
- "10 Days Europe Backpacking"

Each post shows: Cover image, Creator, Destination, Duration, Budget range, Number of saves, Short description.

Allow: Save, View Trip, Use Itinerary.

Use infinite scroll with pagination and list virtualization; responsive grid (1 column phone, 2 tablet, 3–4 desktop).

---

## 26. Profile

Profile shows: Profile photo, Name, Bio, Trips, Public itineraries, Memories, Saved trips.

Stats: Trips, Countries, Cities, Memories.

Sections: My Trips, Published, Saved, Memories.

---

## 27. Trip States

A trip has lifecycle states:

- **Draft**
- **Planning**
- **Ready** — bookings completed / itinerary ready
- **Upcoming** — trip is approaching
- **Active** — trip currently happening
- **Completed** — trip finished
- **Archived** — older trips

The UI adapts based on the state. Model this as an explicit state machine with defined transitions.

---

## 28. Notifications

Create useful notifications using **web push (FCM)** where permitted, plus an in-app notification center as the reliable fallback (web push is not available in every browser, and on iOS only for installed PWAs).

Examples:

- "Your Bali trip starts in 7 days."
- "Your hotel check-in is tomorrow."
- "It's raining in your next destination."
- "Your next activity starts in 30 minutes."
- "You have 2 unplanned hours today."
- "Your Day 3 itinerary may be too busy."

Only ask for notification permission after the user takes a relevant action (e.g. creating a trip), never on first load. Avoid excessive notifications and give users per-type controls in Settings.

---

## 29. Offline Support

Travel often happens with poor connectivity. Use the service worker + IndexedDB to cache:

- Itinerary
- Hotel details
- Flight details
- Saved places
- Map tiles for the trip area where technically and legally possible
- Emergency information
- Travel notes

The core itinerary must remain accessible and editable offline. Queue changes made offline and sync them when connectivity returns, with clear conflict handling.

Show an "Offline mode" indicator when connectivity is unavailable (using `navigator.onLine` plus failed-request detection). Provide an "Available offline" action for a trip that pre-caches everything needed.

---

## 30. UX Principles

The product should feel:

- Premium
- Calm
- Visual
- Modern
- Simple
- Travel-focused
- Human
- AI-assisted, not AI-dominated

Avoid excessive cards, gradients, animations and unnecessary UI elements.

Prioritize content hierarchy. Use large destination imagery. Use bottom sheets (phone) and side panels (desktop) for contextual actions. Use maps where geography matters. Use AI when it reduces effort. Do not use AI merely for decoration.

Respect `prefers-reduced-motion`.

---

## 31. Design System

Create a consistent design system, implemented as design tokens (CSS variables consumed by Tailwind) and a reusable component library.

**Colors:** Primary, Secondary, Surface, Background, Success, Warning, Error (with on-color pairs that meet WCAG AA contrast).

**Typography:** a modern web font (e.g. Inter, Plus Jakarta Sans or similar via Google Fonts or self-hosted) with a responsive type scale using `clamp()`.

**Spacing, radius, elevation and breakpoint tokens.**

**Components:**

- Buttons
- Cards
- Chips
- Bottom sheets / side sheets (responsive)
- Search
- Tabs
- Inputs
- Date picker / date-range picker
- Image cards
- Itinerary cards
- Map pins
- Booking cards
- Memory cards
- AI message cards
- Bottom navigation / navigation rail / sidebar
- Dialogs
- Toasts
- Skeleton loading states
- Empty states
- Error states

Support **light mode** and **dark mode** (follow system preference by default, with a manual override in Settings).

---

## 32. Important UX States

Design all important states:

- Empty
- Loading (skeletons, not spinners everywhere)
- Error (with retry)
- Offline
- No search results
- No itinerary
- No memories
- Booking pending
- Booking confirmed
- Location permission denied
- Notification permission denied
- AI unavailable
- Unsupported browser feature (e.g. no camera, no push)

Do not leave screens blank.

---

## 33. AI + Product Integration

AI should have access to trip context, e.g.:

- Trip: Bali
- Dates: 12–17 October
- Travellers: 2
- Budget: ₹60,000
- Hotel: Seminyak
- Current day: Day 2
- Completed: Uluwatu Temple
- Upcoming: Seminyak Beach

When the user asks "What should I do next?", the AI should use this information.

AI should be able to trigger structured actions such as:

```
ADD_ACTIVITY
MOVE_ACTIVITY
REMOVE_ACTIVITY
REORDER_ITINERARY
CREATE_ITINERARY
SUGGEST_PLACES
FIND_RESTAURANTS
OPTIMIZE_ROUTE
```

Define these as typed, Zod-validated action schemas. Keep AI actions structured rather than allowing the model to directly modify data — the app validates and applies them through the same repository layer as user edits.

Always show confirmation for meaningful or destructive changes, and support undo.

---

## 34. Data Models

Create TypeScript types (with matching Zod schemas) for:

- User
- Trip
- Destination
- ItineraryDay
- ItineraryItem
- Place
- Restaurant
- Hotel
- Flight
- Booking
- Memory
- Story
- PublicTrip
- SavedTrip
- ChecklistItem
- Notification
- AIConversation
- AIMessage
- TripCollaborator

Include relationships between these models (IDs/foreign keys), and document them in a short diagram or table.

---

## 35. Collaboration

Design the architecture to eventually support collaborative trips. Users should eventually be able to invite Partner, Friends, Family.

Permissions: Owner, Editor, Viewer.

For the first version, collaboration can use mock/local data, but the architecture (data model, permission checks, sync strategy) should support it.

---

## 36. Security & Privacy

Follow good web security practices:

- **Never expose secret API keys in the client bundle.** AI, booking and other paid/secret APIs go through a backend or serverless proxy. (Firebase web config is public by design — protect data with Firebase Security Rules.)
- Prefer secure, httpOnly cookies or the Firebase Auth SDK's session handling for auth; do not store sensitive tokens in `localStorage`.
- Set a Content Security Policy and other security headers.
- Sanitize any user-generated content rendered as HTML.
- Serve only over HTTPS (required for geolocation, camera, service workers and push anyway).
- Request minimum permissions, only in context.
- Location is opt-in.
- Camera/microphone access only when the user initiates capture.
- Give users control over public/private content.
- Allow users to delete trips, memories and their account.
- Do not expose private trip data through public endpoints or public URLs; strip EXIF location from photos on public pages unless the user opts in.

---

## 37. Performance

The application should:

- Load quickly (target Lighthouse performance ≥ 90 on mobile; good Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1)
- Code-split by route and lazy-load heavy modules (map, story editor, AI)
- Lazy-load images with responsive `srcset`, modern formats (WebP/AVIF) and fixed aspect ratios to avoid layout shift
- Paginate and virtualize feeds and long lists
- Cache frequently accessed data (TanStack Query + IndexedDB + service worker)
- Avoid unnecessary re-renders (memoization where measured, stable selectors in Zustand)
- Handle poor network conditions (retries, timeouts, offline queue)
- Maintain smooth scrolling and 60fps interactions on mid-range phones
- Keep heavy work (image compression, route calculations) off the main thread using Web Workers where needed

---

## 38. Accessibility

- Meet **WCAG 2.2 AA**.
- Full keyboard navigation, including drag-and-drop reordering alternatives.
- Visible focus states, correct focus management in dialogs and sheets.
- Semantic HTML and ARIA only where needed.
- Screen-reader labels for map pins, icons and status changes; announce live updates (e.g. "Activity marked completed") via live regions.
- Support browser zoom up to 200% and larger text without breaking layouts.

---

## 39. Sample User Journey

Implement this complete flow as the primary demo:

1. User creates a **5-day Bali trip for 2 people**, budget **₹60,000**, interests **Food + Beaches + Photography**.
2. AI generates the itinerary.
3. User modifies Day 2.
4. User opens the map.
5. User adds a restaurant.
6. User adds a hotel.
7. User adds a mock flight booking.
8. Trip becomes **Upcoming**.
9. Seven days before travel: show the preparation checklist.
10. On the trip start date, the trip becomes **LIVE**.
11. User sees: "Good morning. Your first activity starts at 9:00 AM."
12. User navigates to the activity.
13. User marks it completed.
14. User uploads a photo; it automatically appears under **Day 1 Memories**.
15. User creates a story.
16. At the end of the trip, prompt: "Your Bali trip is complete. Turn your memories into a shareable trip?"
17. User selects **Publish**; the app generates a beautiful public trip page with its own URL.
18. Another user discovers it and selects **Use This Itinerary**; a copy is created in their account.

The demo must work on phone, tablet and desktop widths. Include a demo-mode date simulator so steps 8–17 can be shown without waiting for real dates. Cover this journey with a Playwright end-to-end test.

---

## 40. Screens / Routes to Build

Build polished, responsive screens for at least:

1. Splash / app shell loading
2. Onboarding
3. Home
4. Explore
5. Destination Details
6. AI Assistant
7. Create Trip
8. Trip Overview
9. Itinerary
10. Add Activity
11. Map
12. Hotel Search
13. Hotel Details
14. Flight Search
15. Booking Overview
16. Trip Checklist
17. Live Trip Dashboard
18. Activity Details
19. Add Memory
20. Memories Timeline
21. Story Creator
22. Share Trip
23. Public Trip
24. Public Explore Feed
25. Saved Trips
26. Profile
27. Settings
28. 404 / Not found

Define a route map (URL for each screen) before implementation.

---

## 41. Prototype Data

Do not leave the application empty. Populate it with realistic demo data, served via MSW and seeded into IndexedDB:

- Destination: **Bali, Indonesia**
- Trip: **5 Days in Bali**
- Dates: **12–17 October 2026**
- Travellers: **2**
- Budget: **₹60,000**

Include realistic places, restaurants, activities, hotels, flights, itinerary items, photos/placeholders (use free-licence images or generated placeholders), and memories.

Create at least **3 public itineraries** for the Explore feed.

Provide a "Reset demo data" option in Settings.

---

## 42. Development Approach

Do not attempt to build everything as one giant implementation. Work incrementally.

**Phase 1 — Foundation**
Vite + React + TypeScript project, Tailwind + design tokens, routing and responsive app shell (bottom nav / rail / sidebar), theme (light/dark), design system components, data models, repositories, MSW mock APIs, IndexedDB setup, PWA setup.

**Phase 2**
Home, Explore, Trips, Create Trip, Trip Overview.

**Phase 3**
Itinerary, Map, Places, AI Assistant.

**Phase 4**
Hotel, Flight, Booking, Trip preparation.

**Phase 5**
Live Trip, Location, Status tracking, Notifications.

**Phase 6**
Memories, Stories, Photo uploads.

**Phase 7**
Public trips, Explore feed, Save/copy itinerary.

**Phase 8 — Polish**
Animations, loading/empty/error states, offline behaviour, accessibility, dark mode, performance, cross-browser testing (Chrome, Safari iOS, Firefox, Edge), responsive QA at phone/tablet/desktop sizes.

---

## 43. Important Implementation Rule

Before writing code:

1. Understand the entire product.
2. Create the information architecture.
3. Define navigation and the URL/route map.
4. Define the responsive layout strategy for each key screen (phone, tablet, desktop).
5. Define data models.
6. Define reusable components.
7. Define service interfaces and mock repositories/APIs.
8. Then implement screen by screen.

Suggested folder structure (feature-based):

```
src/
  app/            # app shell, providers, router, layouts
  features/       # trips, itinerary, map, ai, explore, bookings, live-trip, memories, stories, public-trips, profile, settings
  components/     # shared design-system components
  services/       # interfaces + adapters: ai, maps, bookings, weather, auth, storage, notifications
  data/           # repositories, Dexie DB, sync queue
  mocks/          # MSW handlers + seed data
  lib/            # utilities, hooks, date helpers
  types/          # shared types and Zod schemas
  styles/         # tokens, global CSS
```

Do not create disconnected screens. Every screen should connect logically to the rest of the product.

---

## 44. UX Quality Bar

Think like a senior product designer. Ask for every feature:

- What user problem does this solve?
- Is this the simplest interaction?
- Can the user understand what happens next?
- Can the user undo it?
- Does this reduce travel-planning effort?
- Is the information presented at the right time?
- Does this work while the user is travelling, one-handed, on a phone?
- Does this work with poor connectivity?
- Does this layout make good use of a tablet or desktop screen, rather than just stretching the phone layout?

Avoid:

- Generic dashboard UI
- Excessive AI chat
- Random gradients
- Overloaded screens
- Unnecessary popups and premature permission prompts
- Excessive forms
- Fake booking confirmations
- Fake live location
- Placeholder UX that looks unfinished
- Phone layouts simply stretched to desktop width

---

## 45. Final Deliverable

Build a functional, responsive React web application (installable PWA) with:

- Clean, feature-based architecture in TypeScript
- Reusable, accessible component library
- Real routing with shareable URLs
- Responsive layouts for phone, tablet and desktop
- Functional mock data (MSW + IndexedDB)
- Working itinerary creation/editing with drag and drop
- Map provider abstraction with a free default provider
- AI assistant abstraction (via backend proxy) with a mock provider
- Booking flow (clearly labelled as mock where not real)
- Live trip mode
- Memory/photo flow with offline upload queue
- Public trip sharing flow
- Light/dark mode
- Offline support for core itinerary
- Loading/error/empty states
- README with setup, scripts, architecture overview and how to swap mock services for real ones

The final result should feel like a real travel product, not a UI prototype.

Prioritize the complete end-to-end journey over implementing every edge case.

When a real external API is unavailable, create a clean abstraction and realistic mock implementation so it can be replaced later without restructuring the application.
