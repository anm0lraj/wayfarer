# Security review (M5)

Reviewed 4 October 2026 against the code at that date. This is a review of this codebase and its configuration, not a
penetration test. It lists what protects what, what was found, what was fixed, and what is still open before a public launch.

## What is worth protecting

| Asset | Where | Who may touch it |
|---|---|---|
| Trips, itineraries, memories, photos | Firestore `trips/*` | Members of the trip, by role (owner / editor / viewer) |
| Profile, settings, assistant chats, devices | Firestore `users/{uid}/*` | That person only |
| Published pages | `publicTrips`, `publicSlugs` | Anyone reads; only the publisher writes |
| Service-account key, `CRON_SECRET`, `GEMINI_API_KEY` | Vercel **Sensitive** variables | Server functions only; never in the bundle |
| Assistant allowance | `users/{uid}/usage/{day}` | Can only go up |

## Trust boundaries and what holds each one

- **Browser ↔ Firestore.** Everything is decided by `firestore.rules`, tested with the emulator (`npm run test:rules`, 48 tests):
  roles on trips and everything inside them, counted likes and saves, the fields a published page may contain, media size and
  type, invitations tied to a verified email, a usage counter that cannot go down, the fixed shape of a push device record, and
  a sent-reminder log with no client access. The client's own role checks are only for the interface.
- **Browser ↔ our functions.** Every function that does something for a person (`api/ai/*`, `api/push/test`, `api/account/delete`)
  verifies the Firebase ID token with Firebase and takes the account id from that answer, never from the request. Bodies are
  size-capped and schema-checked. The scheduled sweep answers only to `CRON_SECRET` (constant-time comparison).
- **Server ↔ Firebase with the service account.** It bypasses the rules, so only three places use it (`api/push/sweep`, `api/push/test`,
  `api/account/delete`) and each acts for exactly one person or for the schedule. Account deletion also needs a sign-in from
  the last 10 minutes.
- **Model.** The assistant can only call fixed functions; every proposal is dropped unless its ids exist in data the app sent; the
  app re-validates and applies nothing until the traveller confirms. Trip data reaches the model labelled as data (prompt
  injection), never private notes.
- **Published content.** Pages are built on the publisher's device from fields that leave out notes, booking numbers and photo
  locations. The rules accept only the defined fields at sane sizes, and readers parse pages with a schema that drops anything
  else. Link previews escape every user-written string and serve a cover only if it is a JPEG, PNG or WebP (never SVG or HTML).
- **Transport and page.** CSP with no inline script and a fixed list of hosts; HSTS; `X-Frame-Options: DENY`; `nosniff`;
  a strict referrer policy; violation reports go to `/api/report`.
- **Data on the device.** Signing out removes the account's data; a different account signing in removes leftovers first.

## Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | "Delete account" removed only the sign-in and the local copy; trips, photos, published pages, likes and chats stayed on the servers | High (privacy) | **Fixed**: `api/account/delete` removes everything, tested against the emulators |
| 2 | `react-router` 6 open-redirect advisory (we only navigate to in-app paths, but it was in the bundle) | Moderate | **Fixed**: React Router 7 |
| 3 | `maplibre-gl` 4 XSS advisory in popup HTML (we use no popups) | Critical on paper, not reachable | **Fixed**: MapLibre 6 (needed an explicit worker URL; an e2e test guards it) |
| 4 | `@grpc/grpc-js` advisories through Firebase (server-side code, not in the browser bundle) | High on paper, not reachable | **Fixed**: pinned `^1.14.5`; `npm audit --omit=dev` reports 0 |
| 5 | No HSTS header | Low | **Fixed** |
| 6 | No visibility of crashes or blocked resources in production | Operational | **Fixed**: `/api/report` logs both, with no personal data |
| 7 | No dependency update process | Low | **Fixed**: Dependabot weekly |
| 8 | No Firebase App Check: anyone with the public web key can call Firestore directly (the rules still apply) | Medium | **Open** (see below) |
| 9 | `/api/report`, `/api/og`, `/api/og-image` are public and not rate-limited by us | Low | Accepted for beta; platform limits apply; revisit with Vercel rate-limit rules |
| 10 | One signed-in person can store many documents in their own area (no per-user quota except media size) | Low–Medium (cost) | **Open**: budget alerts before launch |
| 11 | Two assistant requests at the same instant can slightly overshoot the daily allowance | Low | Accepted (documented in `quota.ts`) |
| 12 | `style-src 'unsafe-inline'` (Tailwind, MapLibre and Framer Motion set inline styles) | Low | Accepted; scripts stay strict |
| 13 | Dev-only tooling advisories (`npm audit` with dev dependencies) | None for users | Tracked by Dependabot |

Checked and clean: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`; no secrets in tracked files or git history; no `target="_blank"`
without `rel`; no server request whose address comes from user input; the sign-in return path comes from router state, not from the URL.

## Before a public launch

1. **App Check** (finding 8): enable Firebase App Check with reCAPTCHA Enterprise (or the free v3) for the web app, enforce it for
   Firestore and Authentication in `wayfarer-prod`. Needs a site key from the Firebase console; it stops other programs from
   using the project's public key.
2. **Budgets and alerts** (finding 10): set a Google Cloud budget on `wayfarer-prod` with email alerts at 50/90/100 %, and a Gemini
   quota cap; consider a per-user limit on documents.
3. **Rotate secrets** at launch and whenever someone with access leaves: service-account key (Firebase → Service accounts →
   generate, update Vercel, delete the old key), `CRON_SECRET`, `GEMINI_API_KEY`. Use separate values for Preview and Production.
4. **GitHub**: turn on secret scanning and push protection, Dependabot alerts, and require the three CI jobs on `main`.
5. **Vercel**: upgrade to Pro (Hobby is non-commercial), add a rate-limit rule for `/api/*`, and keep Production environment
   variables Sensitive.
6. **Privacy notice**: fill in the operator and contact address (`VITE_CONTACT_EMAIL`), then have the notice and terms
   reviewed by someone qualified for the operator's situation (India's DPDP Act). The Gemini free tier may use prompts to improve
   Google's products; move to a paid key (which does not) before real users rely on the assistant.
7. Replace the public OpenStreetMap tile server, the OSRM demo server and Open-Meteo's free tier with services you may use commercially.

## Reporting a problem

Until there is a dedicated address, security reports go to the contact address in the privacy notice.
