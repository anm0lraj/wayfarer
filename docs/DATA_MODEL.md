# Data model

Types and Zod schemas live in `src/types` (one schema per model; types are `z.infer`). Dexie tables are in `src/data/db.ts`; all access goes through `src/data/repositories`.

Conventions: ids are strings (`trip_x7k2…`), dates are `YYYY-MM-DD`, times are `HH:mm`, datetimes are ISO with offset, money is `{ amount, currency }` in major units (INR by default).

## Relationships

| Model | Key fields | Points to |
|---|---|---|
| User | `id` | — |
| Destination | `id` | — |
| Trip | `ownerId`, `destinationIds[]`, `publicTripId?`, `copiedFromPublicTripId?` | User, Destination, PublicTrip |
| ItineraryDay | `tripId`, `dayNumber`, `destinationId?` | Trip, Destination |
| ItineraryItem | `tripId`, `dayId`, `placeId?`, `bookingId?`, `position` | Trip, ItineraryDay, Place, Booking |
| Place / Restaurant | `destinationId` (Restaurant is a Place with `kind: 'restaurant'`) | Destination |
| Hotel | `destinationId` | Destination |
| Flight | — (catalog entry) | — |
| Booking | `tripId`, `type`, `refId?` | Trip, Hotel \| Flight \| Place |
| Memory | `tripId`, `authorId`, `dayId?`, `itemId?`, `mediaKey?` | Trip, User, ItineraryDay, ItineraryItem, blob storage |
| Story | `tripId`, `authorId`, `dayId?`, `slides[].memoryId?` | Trip, User, Memory |
| PublicTrip | `tripId?`, `ownerId`, `snapshot` | Trip (snapshot is a sanitised copy, not a live view) |
| SavedTrip | `userId`, `publicTripId?` \| `tripId?` | User, PublicTrip \| Trip |
| ChecklistItem | `tripId`, `autoRule?` | Trip (auto items resolve from Bookings) |
| Notification | `userId`, `tripId?` | User, Trip |
| AIConversation | `userId`, `tripId?` | User, Trip |
| AIMessage | `conversationId`, `actions[]` | AIConversation |
| TripCollaborator | `tripId`, `userId`, `role`, `status` | Trip, User |

```
User ─┬─ Trip ─┬─ ItineraryDay ── ItineraryItem ── Place ── Destination
      │        ├─ Booking ── Hotel | Flight
      │        ├─ Memory ── Story
      │        ├─ ChecklistItem
      │        ├─ TripCollaborator (owner / editor / viewer)
      │        └─ PublicTrip (sanitised snapshot) ── SavedTrip
      ├─ AIConversation ── AIMessage ── AIAction[]
      └─ Notification
```

## Decisions worth knowing

- **Item order:** items carry `dayId` + integer `position`; days do not hold item id lists. Moves rewrite positions of the affected days only.
- **Trip state:** only `draft | planning | ready | archived` are persisted. `upcoming | active | completed` are derived (`src/features/trips/tripState.ts`) from the trip's timezone and the clock service.
- **Bookings:** `mode: 'demo' | 'live'`. Nothing in the app can create `live`; the schema rejects a `demo` booking with status `confirmed`.
- **Public trips:** published as a snapshot with `notes`, `bookingId`, confirmation numbers and exact memory locations removed.
- **AI actions:** `AIAction` is a Zod discriminated union (`ADD_ACTIVITY`, `MOVE_ACTIVITY`, `REMOVE_ACTIVITY`, `REORDER_ITINERARY`, `CREATE_ITINERARY`, `SUGGEST_PLACES`, `FIND_RESTAURANTS`, `OPTIMIZE_ROUTE`). Model output is untrusted: `applyAIAction` validates it and applies it through the same repositories, with permission checks and an undo handle.
- **Permissions:** `can(role, action)` in `src/lib/permissions.ts`; repositories call `requireTripAccess` on every trip-scoped read/write.
