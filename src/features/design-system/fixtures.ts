import { img } from '@/lib/photos'
import type { Destination, PublicTrip, Trip } from '@/types'

/** Realistic, typed sample records for the library's domain-card examples (the demo Bali trip and friends). */

const stamp = { createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-01T10:00:00.000Z' }

export const demoTrip: Trip = {
  id: 'ds-trip-bali',
  ownerId: 'ds-user',
  title: '5 Days in Bali',
  destinationIds: ['bali'],
  startDate: '2026-10-12',
  endDate: '2026-10-17',
  timezone: 'Asia/Makassar',
  travellers: { group: 'couple', count: 2 },
  budget: { tier: 'comfort', total: { amount: 60000, currency: 'INR' } },
  interests: ['food', 'beaches', 'photography'],
  planningStyle: 'hybrid',
  state: 'planning',
  coverImage: img('bali-cover'),
  visibility: 'private',
  offlineAvailable: false,
  ...stamp,
}

export const demoGoaTrip: Trip = { ...demoTrip, id: 'ds-trip-goa', title: 'Goa Long Weekend', destinationIds: ['goa'], startDate: '2026-11-20', endDate: '2026-11-23', coverImage: img('goa-cover'), timezone: 'Asia/Kolkata', state: 'ready' }

export const demoDestination: Destination = {
  id: 'bali',
  name: 'Bali',
  country: 'Indonesia',
  region: 'Lesser Sunda Islands',
  location: { lat: -8.4095, lng: 115.1889 },
  timezone: 'Asia/Makassar',
  currency: 'IDR',
  heroImage: img('bali'),
  overview: 'Temples, rice terraces and surf beaches.',
  bestTimeToVisit: 'April to October',
  estimatedDailyBudget: { amount: 4500, currency: 'INR' },
  tags: ['beaches', 'international'],
  travelTips: [],
  ...stamp,
}

export const demoPublicTrip: PublicTrip = {
  id: 'ds-pub-japan',
  slug: '7-days-in-japan-ds01',
  ownerId: 'ds-other',
  ownerName: 'Aiko',
  visibility: 'public',
  title: '7 Days in Japan — Food & Culture',
  description: 'Tokyo to Kyoto by train, eating all the way.',
  coverImage: img('pub-japan'),
  destinationIds: ['japan'],
  durationDays: 7,
  budgetRange: [{ amount: 120000, currency: 'INR' }, { amount: 160000, currency: 'INR' }],
  travelStyle: 'Food & culture',
  tips: [],
  snapshot: { days: [], items: [], places: [], memories: [] },
  likeCount: 214,
  saveCount: 1280,
  publishedAt: '2026-06-01T10:00:00.000Z',
}
