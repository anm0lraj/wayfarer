import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { AuthGuard } from './layouts/AuthGuard'
import { HydrateFallback } from './layouts/HydrateFallback'
import { PublicLayout } from './layouts/PublicLayout'
import { RouteError } from './layouts/RouteError'
import { TripWorkspaceLayout } from './layouts/TripWorkspaceLayout'
import { NotFound, SignIn } from './routes/misc'

/** Lazy route helper: loads the module only when the route is visited (code-splitting per feature). */
const lazyNamed = <M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string): RouteObject['lazy'] =>
  async () => ({ Component: (await load())[name] as React.ComponentType })
const lazyDefault = (load: () => Promise<{ default: React.ComponentType }>): RouteObject['lazy'] =>
  async () => ({ Component: (await load()).default })

const explore = () => import('@/features/explore/routes')
const trips = () => import('@/features/trips/routes')
const itinerary = () => import('@/features/itinerary/routes')
const bookings = () => import('@/features/bookings/routes')
const memories = () => import('@/features/memories/routes')
const publicTrips = () => import('@/features/public-trips/routes')
const legal = () => import('@/features/legal/routes')

/**
 * Every spec §40 screen has a real URL here. Static segments (e.g. /trips/new, /explore/itineraries) are
 * ranked above dynamic ones (:tripId, :destinationId) by React Router.
 */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    HydrateFallback,
    children: [
      // Visible without signing in. No app shell, no app-state dependencies (SSR-friendly).
      {
        element: <PublicLayout />,
        children: [
          { path: 't/:publicSlug', lazy: lazyNamed(publicTrips, 'PublicTripPage') },
          { path: 'signin', element: <SignIn /> },
          { path: 'privacy', lazy: lazyNamed(legal, 'PrivacyPage') },
          { path: 'terms', lazy: lazyNamed(legal, 'TermsPage') },
        ],
      },
      // Explore is browsable when signed out; the shell and nav still apply.
      {
        element: <AppShell />,
        children: [
          { path: 'explore', lazy: lazyNamed(explore, 'Explore') },
          { path: 'explore/itineraries', lazy: lazyNamed(explore, 'PublicFeed') },
          { path: 'explore/:destinationId', lazy: lazyNamed(explore, 'DestinationDetails') },
          {
            element: <AuthGuard />,
            children: [
              { index: true, lazy: lazyDefault(() => import('@/features/home/routes')) },
              { path: 'trips', lazy: lazyNamed(trips, 'TripsList') },
              { path: 'trips/new/:step?', lazy: lazyNamed(trips, 'CreateTrip') },
              {
                path: 'trips/:tripId',
                element: <TripWorkspaceLayout />,
                children: [
                  { index: true, lazy: lazyNamed(trips, 'TripOverview') },
                  // /itinerary, /itinerary/day/:n, /itinerary/day/:n/add and /itinerary/items/:id all render one view.
                  { path: 'itinerary/*', lazy: lazyNamed(itinerary, 'Itinerary') },
                  { path: 'map', lazy: lazyDefault(() => import('@/features/map/routes')) },
                  { path: 'bookings', lazy: lazyNamed(bookings, 'BookingOverview') },
                  { path: 'bookings/hotels', lazy: lazyNamed(bookings, 'HotelSearch') },
                  { path: 'bookings/hotels/:hotelId', lazy: lazyNamed(bookings, 'HotelDetails') },
                  { path: 'bookings/flights', lazy: lazyNamed(bookings, 'FlightSearch') },
                  { path: 'checklist', lazy: lazyNamed(trips, 'TripChecklist') },
                  { path: 'memories', lazy: lazyNamed(memories, 'MemoriesTimeline') },
                  { path: 'memories/new', lazy: lazyNamed(memories, 'AddMemory') },
                  { path: 'stories/new', lazy: lazyNamed(memories, 'StoryCreator') },
                  { path: 'stories/:storyId', lazy: lazyNamed(memories, 'StoryView') },
                  { path: 'stories/:storyId/edit', lazy: lazyNamed(memories, 'StoryCreator') },
                  { path: 'share', lazy: lazyNamed(trips, 'ShareTrip') },
                ],
              },
              // Full-screen experiences without the workspace tabs.
              { path: 'trips/:tripId/live', lazy: lazyDefault(() => import('@/features/live-trip/routes')) },
              { path: 'trips/:tripId/ai/:conversationId?', lazy: lazyDefault(() => import('@/features/ai/routes')) },
              { path: 'ai/:conversationId?', lazy: lazyDefault(() => import('@/features/ai/routes')) },
              { path: 'saved', lazy: lazyNamed(publicTrips, 'SavedTrips') },
              { path: 'profile', lazy: lazyDefault(() => import('@/features/profile/routes')) },
              { path: 'profile/:tab', lazy: lazyDefault(() => import('@/features/profile/routes')) },
              { path: 'settings', lazy: lazyDefault(() => import('@/features/settings/routes')) },
              { path: 'settings/:section', lazy: lazyDefault(() => import('@/features/settings/routes')) },
              { path: 'notifications', lazy: lazyDefault(() => import('@/features/notifications/routes')) },
              ...(import.meta.env.DEV ? [{ path: '_design', lazy: lazyDefault(() => import('./routes/DesignGallery')) }] : []),
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
      // Onboarding is its own centred card, outside the shell.
      { path: 'onboarding/:step?', lazy: lazyNamed(() => import('@/features/onboarding/routes'), 'Onboarding') },
    ],
  },
]

export const createRouter = () => createBrowserRouter(routes)
