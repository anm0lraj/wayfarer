# Wayfarer design system

The written companion to the living library at **`/_design`** (development builds only: `npm run dev`, then open http://localhost:5173/_design). The library renders the real components and reads the real tokens, so where this file and the library differ, the library and `src/styles/tokens.css` win; please fix this file.

## Principles

1. **Travel first.** Large real photos, maps where geography matters, AI only where it saves effort. No random gradients, no card in a card, no decoration for its own sake.
2. **Blue acts, orange is now.** One strong brand colour, Electric Blue, marks what you can do (buttons, links, selection, focus, the current nav item). Orange marks what is happening right now (live trip, In progress, sync, demo clock). Everything else stays calm.
3. **Three layouts, designed.** Phone (< 640 px): bottom bar, bottom sheets, full-screen flows. Tablet (640–1023 px): navigation rail, two panes, side panels. Desktop (≥ 1024 px): collapsible sidebar, itinerary and map side by side, docked AI panel.
4. **Accessible by default.** WCAG 2.2 AA in light and dark, 44 × 44 px targets (36 px with a mouse on desktop), full keyboard support, visible focus, reduced motion respected.
5. **Honest.** Bold, friendly headings and empty states; plain controls, prices, safety information and errors. Demo bookings always say “Saved to trip — not booked”.

## Tokens

Defined in `src/styles/tokens.css`, mapped to Tailwind utilities in `tailwind.config.ts`. Colours are space-separated RGB channels so Tailwind can add alpha (`bg-primary/[0.12]`). Light values are on `:root, [data-theme='light']`, dark on `:root[data-theme='dark'], [data-theme='dark']`; the app sets `data-theme` on `<html>`, and any element can carry it (the library uses this to show both themes side by side).

### Colour

| Token | Light | Dark | Utility | Use |
|---|---|---|---|---|
| `--bg` | `244 247 255` #F4F7FF | `10 15 36` #0A0F24 | `bg-bg` | Page ground |
| `--surface` | `255 255 255` #FFFFFF | `18 27 58` #121B3A | `bg-surface` | Cards, sheets, inputs, nav |
| `--surface-2` | `238 243 254` #EEF3FE | `24 35 74` #18234A | `bg-surface-2` | Inset panels, skeletons, neutral badge, hover rows |
| `--border` | `219 227 247` #DBE3F7 | `42 56 104` #2A3868 | `border-border` | Quiet dividers, card edges |
| `--border-strong` | `106 120 160` #6A78A0 | `118 134 184` #7686B8 | `border-border-strong` | Edges of inputs, buttons, chips (3:1) |
| `--fg` | `16 24 52` #101834 | `238 242 255` #EEF2FF | `text-fg` | Text |
| `--fg-muted` | `74 86 120` #4A5678 | `158 172 210` #9EACD2 | `text-fg-muted` | Secondary text, icons |
| `--primary` | `26 80 240` #1A50F0 | `124 156 255` #7C9CFF | `bg-primary`, `text-primary` | Electric Blue: actions, links, selection |
| `--on-primary` | `255 255 255` #FFFFFF | `8 18 60` #08123C | `text-primary-fg` | Text on primary |
| `--secondary` | `168 66 0` #A84200 | `255 159 28` #FF9F1C | `text-secondary` | Deep orange: live text and icons |
| `--on-secondary` | `255 255 255` #FFFFFF | `38 22 4` #261604 | `text-secondary-fg` | Text on secondary |
| `--accent` | `255 159 28` #FF9F1C | `255 159 28` #FF9F1C | `bg-accent` | Bright orange, **fills only** (dots, small marks) |
| `--on-accent` | `38 22 4` #261604 | `38 22 4` #261604 | `text-accent-fg` | Ink on accent |
| `--live-bg` | `255 244 228` #FFF4E4 | `52 37 30` #34251E | `bg-live` | “Happening now” panels, live badge |
| `--live-border` | `255 200 140` #FFC88C | `128 82 40` #805228 | `border-live-border` | Edge of live panels |
| `--success` | `17 109 64` #116D40 | `74 222 128` #4ADE80 | `text-success`, `bg-success` | Done, ready |
| `--on-success` | `255 255 255` #FFFFFF | `5 40 20` #052814 | `text-success-fg` | Text on success |
| `--warning` | `144 74 6` #904A06 | `251 191 36` #FBBF24 | `text-warning`, `bg-warning` | Needs attention, demo bookings, offline |
| `--on-warning` | `255 255 255` #FFFFFF | `40 25 4` #281904 | `text-warning-fg` | Text on warning |
| `--error` | `184 26 26` #B81A1A | `248 113 113` #F87171 | `text-error`, `bg-error` | Errors, destructive |
| `--on-error` | `255 255 255` #FFFFFF | `50 8 8` #320808 | `text-error-fg` | Text on error |
| `--focus` | `26 80 240` #1A50F0 | `124 156 255` #7C9CFF | global `:focus-visible` | Focus ring: 3 px outline, 2 px offset |

Rules: no raw hex in components; no bright orange fill behind text; no solid orange (or solid colour) badges; `border` is never an input edge. The brand hex values are repeated in `index.html`, `vite.config.ts`, `src/lib/theme.ts` and `public/icon*.svg`; change them together.

**Contrast.** Every documented pair passes AA in both themes: text, muted text and every tone as text on `bg`, `surface` and `surface-2`; button labels (`on-*` on each tone); badges (tone text on the tone at 12 % over `surface`, `surface-2` and `bg`); ink on accent; text, muted text, deep orange and links on `live-bg` (4.5:1); focus ring on `bg` and control edges on `surface` (3:1). Checked by `src/styles/contrast.test.ts` and, for the list shown in the library, `CONTRAST_PAIRS` in `src/features/design-system/tokens.ts` (`library.a11y.test.tsx`). Captions on photos sit on `.scrim-text` (55–60 % black, 4.75:1 for white even over pure white; `scrim.test.ts`).

### Typography

Plus Jakarta Sans (variable, 200–800, self-hosted, SIL OFL 1.1) for everything: `--font-sans: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`; headings use `--font-display` (= `--font-sans` today; utility `font-display`).

| Utility | Token | 390 px | 1440 px | Use |
|---|---|---|---|---|
| `text-4xl` | `clamp(1.75rem, 1.4rem + 1.6vw, 2.625rem)` | 28.6 px | 42 px | Page title (h1) on desktop |
| `text-3xl` | `clamp(1.5rem, 1.3rem + 1vw, 2rem)` | 24.7 px | 32 px | Page title on phones |
| `text-2xl` | `clamp(1.25rem, 1.15rem + 0.6vw, 1.5rem)` | 20.7 px | 24 px | Section heading (h2), empty-state title |
| `text-xl` | `clamp(1.0625rem, 1rem + 0.35vw, 1.25rem)` | 17.4 px | 20 px | Card and sheet titles |
| `text-lg` | `clamp(1rem, 0.95rem + 0.2vw, 1.0625rem)` | 16 px | 17 px | Large buttons, sub-headings |
| `text-base` | `clamp(0.875rem, 0.85rem + 0.15vw, 0.9375rem)` | 14.2 px | 15 px | Body, inputs, buttons |
| `text-sm` | `clamp(0.78125rem, 0.76rem + 0.1vw, 0.84375rem)` | 12.6 px | 13.5 px | Captions, badges, chips |
| `text-xs` | `clamp(0.6875rem, 0.67rem + 0.08vw, 0.75rem)` | 11 px | 11.9 px | Labels, nav labels |

Weights: 400 body · 500 muted emphasis, nav labels · 600 buttons, chips, badges, labels · 700 h2–h3, card titles, prices · 800 h1, empty-state titles. Line height: body 1.55; h1–h3 1.2 (h1 1.15) with −0.01em tracking (h1 −0.02em) and `text-wrap: balance`. Numbers that align or change in place use `tabular-nums`.

### Spacing, radius, elevation, motion, layout

- **Spacing**: Tailwind’s 4 px scale; mostly `1.5` (6), `2` (8), `3` (12), `4` (16), `5` (20), `6` (24), `8` (32), `10` (40). Page: `max-w-7xl`, gutters `px-4` / `sm:px-6` / `lg:px-8`.
- **Touch**: `--touch: 2.75rem` (44 px), 2.25rem (36 px) with a fine pointer at ≥ 1024 px; utilities `min-h-touch`, `min-w-touch`.
- **Radius**: `rounded-sm` 0.5rem (8 px) · `rounded-md` 0.75rem (12 px, controls) · `rounded-lg` 1rem (16 px, cards) · `rounded-xl` / `rounded-2xl` 1.5rem (24 px, hero panels, dialogs) · `rounded-full` chips and badges.
- **Elevation** (light / dark):
  - `shadow-sm`: `0 1px 2px rgb(16 24 52 / 0.06), 0 2px 8px -2px rgb(26 60 160 / 0.1)` / `0 1px 2px rgb(0 0 0 / 0.35), 0 2px 8px -2px rgb(0 0 0 / 0.3)`
  - `shadow-md`: `0 1px 3px rgb(16 24 52 / 0.06), 0 10px 24px -8px rgb(26 60 160 / 0.2)` / `0 1px 3px rgb(0 0 0 / 0.35), 0 12px 28px -8px rgb(0 0 0 / 0.55)`
  - `shadow-lg`: `0 2px 6px rgb(16 24 52 / 0.06), 0 24px 48px -16px rgb(26 60 160 / 0.3)` / `0 2px 6px rgb(0 0 0 / 0.35), 0 28px 56px -16px rgb(0 0 0 / 0.7)`
  - `shadow-primary`: `inset 0 1px 0 rgb(255 255 255 / 0.18), 0 1px 2px rgb(16 24 52 / 0.12), 0 6px 16px -6px rgb(26 80 240 / 0.6)` / `inset 0 1px 0 rgb(255 255 255 / 0.25), 0 6px 18px -6px rgb(124 156 255 / 0.45)`
  - `shadow-accent`: `inset 0 1px 0 rgb(255 255 255 / 0.3), 0 1px 2px rgb(16 24 52 / 0.1), 0 6px 16px -6px rgb(230 120 0 / 0.55)` / `inset 0 1px 0 rgb(255 255 255 / 0.3), 0 6px 18px -6px rgb(255 159 28 / 0.45)`
- **Motion**: `--dur-fast` 160ms (`duration-fast`: colour, press), `--dur-base` 240ms (`duration-base`: card lift), `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)` (`ease-out`); photo zoom and progress fill 500 ms. `lift` class: shadow-lg on hover, plus a 3 px rise only with a fine pointer and no reduced motion. Buttons rise 1 px and press down 1 px / 98 % (`motion-safe:` only). With `prefers-reduced-motion: reduce` every animation and transition is cut to 0.01 ms. Hover styles apply only with a real pointer (`hoverOnlyWhenSupported`). The only page-level motion is `PageTransition`.
- **Layout**: breakpoints `sm` 640, `lg` 1024, `xl` 1280 (no `md`). `--nav-h` 3.5rem (phone bar), `--rail-w` 4.5rem, `--sidebar-w` 13.5rem (collapsed `--sidebar-w-collapsed` 4rem), `--safe-*` = `env(safe-area-inset-*, 0px)` (`pb-safe`, `pt-safe`).
- **Icons**: Lucide, stroke 2 (2.4 for the current nav item); `size-4` inline, `size-5` buttons and nav, `size-6`/`7` feature icons; always `aria-hidden`, icon-only buttons need `aria-label`.
- **Imagery**: real, credited, self-hosted Commons photos (`img(id)`), WebP 640/1280 with `srcset` (`responsiveImage`, `CARD_SIZES`, `FEED_SIZES`), fixed aspect ratios, `priority` for the first visible cards; generated poster illustrations as fallback (`placeholderImage`).
- **3D spot illustrations**: `Spot art="suitcase|pin|globe|camera|plane"`, empty states and onboarding only; errors and offline use a plain icon.

## Voice

Bold and friendly for headings, greetings, empty states and page descriptions (“Your next adventure starts here”, “Your story starts with one photo”). Plain for controls (“Add hotel”, “Save”), prices, bookings, safety, errors and no-results (“Couldn’t load hotels. Check your connection and try again.”). Demo bookings: “Saved to trip — not booked”, exactly; never “Booked”, “Confirmed” or “Paid”. Local transport prices are estimates.

## Components

Each has a page at `/_design/components/<id>` with live variants and states, a props table, keyboard/ARIA notes and do/don’t. Docs live next to the component in `*.docs.tsx`.

| Group | Component (id) | Variants and states shown | Key props | Accessibility |
|---|---|---|---|---|
| Actions | Button (`button`) | primary, secondary, ghost, danger; sm, md, lg, icon; hover, focus-visible, pressed, disabled, loading; asChild link | `variant`, `size`, `asChild` + button attrs | native button, `type="button"` default; icon-only needs aria-label; 44 px |
| Actions | ThemeToggle (`theme-toggle`) | default, hover, focus | `className` | aria-label names current and next theme; announces change |
| Inputs | Input (`input`) | default + hint, placeholder, hover, focus, error, disabled, read-only | `label` (required), `hint`, `error`, `hideLabel` + input attrs | label for, aria-describedby, aria-invalid |
| Inputs | SearchField (`search-field`) | empty, filled, focus | `label` (default “Search”), `hint`, `error` | type=search, hidden label |
| Inputs | DateRangeField (`date-range-field`) | interactive, empty, error | `start`, `end`, `onChange`, `min`, `errors` | two labelled native dates; length is aria-live |
| Selection | Chip (`chip`) | default, hover, focus, selected, selected + focus, disabled; filter group | `selected` + button attrs | aria-pressed; group with aria-label |
| Selection | OptionCard (`option-card`) | interactive group; default, hover, focus, selected | `selected`, `onSelect`, `title`, `description`, `icon` | role=radio in a labelled radiogroup; arrow keys |
| Selection | Tabs (`tabs`) | interactive; active, default, hover, focus, disabled | Radix Tabs props | tablist/tab/tabpanel, arrow keys |
| Feedback | Badge (`badge`) | neutral, primary, success, warning, error, accent (live); with icon; over a photo | `tone` | plain text, colour never alone |
| Feedback | ProgressBar (`progress-bar`) | 0, 72, 100 %, with visible text | `value`, `label` | role=progressbar with values and label |
| Feedback | Skeleton (`skeleton`) | card, list | `SkeletonGroup label` | shapes aria-hidden; group role=status “Loading …” |
| Feedback | States (`states`) | EmptyState (art), ErrorState (+ retry), OfflineState | `title`, `description`, `action`, `as`, `art`, `onRetry` | error role=alert, offline role=status |
| Feedback | OfflineBanner (`offline-banner`) | live (only while offline) | — | role=status |
| Feedback | Toast (`toast`) | plain, with Undo, with description | `toast({ title, description, action, durationMs })` | Radix toast region (F8), title announced |
| Navigation | App navigation (`navigation`) | BottomNav 390, NavRail 820, Sidebar 1440 (+ collapse) | Sidebar `collapsed`, `onToggle` | nav “Primary”, aria-current, aria-expanded |
| Navigation | TabNav (`tab-nav`) | trip workspace links | `label`, TabLink = NavLink props | nav landmark of links, aria-current |
| Navigation | Stepper (`stepper`) | first, middle, last step | `steps`, `current` | role=group “Progress”, aria-live step text |
| Navigation | SkipLink (`skip-link`) | focused | — | first focusable, jumps to #main |
| Containers | Card (`card`) | card, with action, inset panel, interactive lift | div attrs | one link when clickable |
| Containers | ResponsiveSheet (`responsive-sheet`) | panel, dialog, full screen on phone | `open`, `onOpenChange`, `title`, `description`, `wide`, `phone`, `headingLevel` | Radix dialog: focus trap, Escape, focus return |
| Containers | Menu (`menu`) | items, label, separator, disabled, danger | `trigger`, `align`; MenuItem `onSelect`, `danger`, `disabled`, `icon` | Radix menu: arrows, typeahead, Escape |
| Containers | PageHeader (`page-header`) | with description, with actions | `title`, `description`, `actions` | the page’s one h1 |
| Containers | Section / CardRow (`section`) | Explore row (scrolls on phones, grid above) | `title`, `description`, `to`, `linkLabel` | section labelled by its h2; list |
| Containers | WhenVisible (`when-visible`) | rendered | `fallback`, `margin` | — |
| Containers | ScreenStub (`screen-stub`) | placeholder | `title`, `phase`, `spec` | h1 + empty state |
| Data | WeatherChip (`weather-chip`) | sunny, partly cloudy, cloudy, rain, storm, snow | `condition`, `tempC` | condition as sr-only text |
| Media | ImageCard (`image-card`) | 4/3, 16/9 + meta, 3/4 + badge, 1/1, illustration fallback, long text | `src`, `alt`, `title`, `subtitle`, `meta`, `badge`, `ratio`, `priority`, `sizes` | text on scrim, alt="" when titled |
| Media | Spot (`spot`) | suitcase, pin, globe, camera, plane; sizes | `art` | always aria-hidden |
| Domain | TripCard (`trip-card`) | planning, upcoming, active, completed, draft, hover, focus | `trip`, `state` (effective), `countdown`, `progress`, `priority` | one link, labelled progress |
| Domain | DestinationCard (`destination-card`) | 4/3, 3/4, hover, focus | `destination`, `ratio`, `priority` | one link |
| Domain | PublicTripCard (`public-trip-card`) | default, no budget + h2, hover | `trip`, `priority`, `headingLevel` | one link; “saves” spoken |

## Patterns

- **Forms** (`/_design/patterns/forms`): React Hook Form + Zod (`zodResolver`), validate on blur (`mode: 'onTouched'`), error under the field (`Input error`), focus moves to the first error on submit, button says “Saving…” and is disabled while saving, what was typed is kept.
- **Screen states** (`states`): every screen has loading (skeletons in a labelled group), empty (EmptyState + next action), error (ErrorState + Try again) and offline (what still works).
- **Sheets and dialogs** (`overlays`): `ResponsiveSheet` = bottom sheet on phones, side panel on tablet/desktop; `wide="dialog"` for focused decisions; `phone="full"` for multi-step flows; sheets that matter have a URL; confirm only what can’t be undone.
- **Toasts and Undo** (`toasts`): act at once, then `toast({ title, action: { label: 'Undo' } })`; optimistic itinerary edits roll back with a toast on failure.
- **Live trip status** (`live-status`): Upcoming (neutral), On the way (primary), In progress (accent), Completed (success), Skipped (neutral), “Time has passed” (warning). Live panels are `bg-live` + `border-live-border` with normal text. Completed is never inferred.
- **Booking labels** (`bookings`): every saved booking shows `DemoBadge` “Saved to trip — not booked”; buttons say “Add hotel to trip”, never “Book now”.

## Adding a component

1. Build it in `src/components/<group>/MyThing.tsx` from tokens (no raw hex), with a 44 px target, a visible focus style (the global outline, or `focus-visible:ring-*` if you remove it) and `aria-hidden` icons.
2. Add `MyThing.docs.tsx` beside it that default-exports `defineDoc({...})` (or an array for several exports):
   - `parts: [part('MyThing', MyThing, { props: {...}, inherits? })]`. Pass the inherited props type as the second type argument (e.g. `part<typeof MyThing, ButtonHTMLAttributes<HTMLButtonElement>>`) when it spreads HTML or Radix props. Every own prop needs `{ type, required, default?, description }`; the type system rejects a missing prop, an extra one, or a wrong `required`.
   - `examples`: one per concern (variants, sizes, states). Wrap each variant/state in `<Cell label="…" force?="hover|focus|active">`; use `frame: { width, height }` for things that depend on the viewport. Keep example ids unique within the file and JSX text free of unbalanced brackets.
   - `a11y` (keyboard, aria, announces, focus, pointer, motion) and `guidance` (do / don’t).
3. It appears in the library automatically. Run `npm test -- src/features/design-system`.

## Contribution checklist

- [ ] Tokens only; new colour pairs added to `contrast.test.ts` (and `CONTRAST_PAIRS` if documented).
- [ ] Works at 390, 820 and 1440 px, light and dark; checked in `/_design` with the width and theme switches.
- [ ] Every state shown: default, hover, focus-visible, pressed, disabled, loading, selected, error, empty, skeleton, read-only as they apply.
- [ ] Keyboard path and screen-reader name; 44 px targets; reduced motion respected.
- [ ] Copy follows the voice rules; booking wording exact.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass (the drift tests are `src/features/design-system/docs.test.tsx` and `library.a11y.test.tsx`).
