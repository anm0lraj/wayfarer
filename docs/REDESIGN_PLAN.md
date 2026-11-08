# Redesign plan

The owner's brief: bright, bold and adventurous, in the Airbnb/Booking spirit; never dark or dull. Each phase ends with typecheck, lint, tests and a browser check at 390 / 820 / 1440 px (light and dark), then a stop for review.

| # | Phase | Status |
|---|---|---|
| 1 | Colour foundation: Electric Blue tokens, orange accent, PWA/theme colours, icons, link-preview image | Done (`ce9146f`) |
| 2 | Generated illustrations: bright daytime scenes with depth; now the offline/error fallback | Done (`f2700c2`) |
| 2b | Real photos for the built-in catalogue (destinations, places, food, hotels, covers, memories): Wikimedia Commons, self-hosted WebP 640/1280 with `srcset`, `/credits` page | Done (`3acfb54`) |
| 3 | Component polish: buttons, cards, chips, live-trip card in orange; heading font; bolder, friendlier copy for headings and empty states; 3D-style illustrations for empty states and onboarding | Done (branch `claude/zen-mendel-f597ao-phase3`): Plus Jakarta Sans throughout, radius/shadow/motion tokens, subtle orange live panels and outlined badges, drawn 3D spot illustrations (no CC0 3D set was reachable), badge contrast on every background |
| 4 | Automatic photos for new places | Planned (see below) |
| 5 | Screen-by-screen layout pass, then re-run the UI/UX, accessibility and performance audits | Planned |

## Phase 4: automatic photos for new places

Today only the built-in catalogue has photos. A custom activity or a new place gets a generated illustration (scene picked from keywords), and the traveller can upload a trip cover; nothing is ever blank, but new places get no real photo.

- `PlacePhotoService` in `src/services` (interface + mock adapter, like weather and maps): when an item or place has no photo, search by name and location, store the chosen photo (URL + credit) on the record, cache it so each place is searched once, and fall back to the illustration if nothing suitable is found. The traveller can always replace it with their own upload.
- Live search runs through a small Vercel function (`api/`), so any key stays server-side (same pattern as the AI proxy). Candidate providers: **Unsplash API** (best fit: its rules require hotlinking, which suits runtime use; free key), Wikimedia Commons (no key, strong for named landmarks), Google Places Photos (best coverage of small places, paid per request).
- Needs: the provider's image host in the CSP `img-src`, the privacy notice and `legal.test.tsx` updated (visitors' browsers would contact the image host), attribution shown where the provider requires it, the environment switch pattern (`VITE_PLACE_PHOTOS` mock|live) like weather/routing.
- Intended end state: curated, self-hosted photos for built-in places; live photos for new places; generated illustrations as the last fallback.
