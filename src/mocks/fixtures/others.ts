import { DEMO_USER_ID } from '@/data/actor'
import { estimateTravelMinutes, haversineKm } from '@/lib/geo'
import { placeholderImage } from '@/lib/placeholder'
import { photoUrl } from '@/lib/stock'
import { SEED_TS } from './bali'
import type {
  ChecklistItem, Destination, ItemCategory, ItineraryDay, ItineraryItem, Memory, Money, Notification, Place, PublicTrip, Story, Trip, User,
} from '@/types'

const ts = { createdAt: SEED_TS, updatedAt: SEED_TS }
const inr = (amount: number) => ({ amount, currency: 'INR' })
const img = (id: string, label: string) => photoUrl(id, label)

export const demoUser: User = {
  id: DEMO_USER_ID, name: 'Anmol', email: 'demo@wayfarer.test', homeLocation: 'Mumbai, India', bio: 'Slow-travel enthusiast. Food first, photos second.',
  avatarUrl: placeholderImage('anmol', 'A', [1, 1]),
  preferences: { travelStyle: 'Relaxed', budgetRange: 'comfort', interests: ['food', 'beaches', 'photography'], preferredDestinations: ['Bali', 'Japan', 'Goa'], typicalDurationDays: 5, accommodation: 'villa', companions: 'couple' },
  settings: { theme: 'system', notificationPrefs: { trip_countdown: true, checkin_reminder: true, weather_alert: true, next_activity: true, free_time: false, busy_day: true } },
  onboardingCompleted: true, ...ts,
}

const dest = (d: Omit<Destination, 'heroImage' | 'createdAt' | 'updatedAt'>): Destination => ({ ...d, heroImage: img(d.id, d.name), ...ts })

export const otherDestinations: Destination[] = [
  dest({ id: 'goa', name: 'Goa', country: 'India', region: 'Konkan coast', location: { lat: 15.2993, lng: 74.124 }, timezone: 'Asia/Kolkata', currency: 'INR',
    overview: 'Beaches, Portuguese-era old towns, seafood shacks and a laid-back pace.', bestTimeToVisit: 'November to February', estimatedDailyBudget: inr(4500),
    tags: ['weekend', 'beaches', 'budget', 'food'], travelTips: ['Rent a scooter only with a valid licence and helmet.', 'North Goa is lively; South Goa is quieter.'] }),
  dest({ id: 'japan', name: 'Japan', country: 'Japan', region: 'Honshu', location: { lat: 35.6762, lng: 139.6503 }, timezone: 'Asia/Tokyo', currency: 'JPY',
    overview: 'Neon cities, quiet temples, exceptional food and trains that run to the minute.', bestTimeToVisit: 'March–May and October–November', estimatedDailyBudget: inr(11000),
    tags: ['trending', 'food', 'international'], travelTips: ['Get an IC card (Suica/ICOCA) for transit.', 'Carry some cash — many small places don’t take cards.'] }),
  dest({ id: 'paris', name: 'Paris', country: 'France', location: { lat: 48.8566, lng: 2.3522 }, timezone: 'Europe/Paris', currency: 'EUR',
    overview: 'Museums, cafés, river walks and neighbourhoods best explored on foot.', bestTimeToVisit: 'April–June and September–October', estimatedDailyBudget: inr(14000),
    tags: ['international'], travelTips: ['Book major museums online.', 'Validate your metro ticket every ride.'] }),
  dest({ id: 'jaipur', name: 'Jaipur', country: 'India', region: 'Rajasthan', location: { lat: 26.9124, lng: 75.7873 }, timezone: 'Asia/Kolkata', currency: 'INR',
    overview: 'The Pink City: forts, palaces, bazaars and rich Rajasthani food.', bestTimeToVisit: 'October to March', estimatedDailyBudget: inr(4000),
    tags: ['weekend', 'budget', 'trending'], travelTips: ['Start fort visits early to beat heat and crowds.'] }),
  dest({ id: 'delhi', name: 'Delhi', country: 'India', region: 'National Capital Territory', location: { lat: 28.6139, lng: 77.209 }, timezone: 'Asia/Kolkata', currency: 'INR',
    overview: 'Mughal monuments, lively bazaars and some of India’s best street food, all linked by a good metro.', bestTimeToVisit: 'October to March', estimatedDailyBudget: inr(4200),
    tags: ['weekend', 'food', 'budget'], travelTips: ['Use the metro to beat traffic.', 'Visit monuments early — afternoons are hot and busy.'] }),
  dest({ id: 'udaipur', name: 'Udaipur', country: 'India', region: 'Rajasthan', location: { lat: 24.5854, lng: 73.7125 }, timezone: 'Asia/Kolkata', currency: 'INR',
    overview: 'The City of Lakes: palaces on the water, winding old-town lanes and rooftop sunsets.', bestTimeToVisit: 'September to March', estimatedDailyBudget: inr(4500),
    tags: ['weekend', 'trending'], travelTips: ['Book lake-view rooftops ahead for sunset.'] }),
  dest({ id: 'jodhpur', name: 'Jodhpur', country: 'India', region: 'Rajasthan', location: { lat: 26.2389, lng: 73.0243 }, timezone: 'Asia/Kolkata', currency: 'INR',
    overview: 'The Blue City, under the huge Mehrangarh Fort — spice markets, step-wells and desert light.', bestTimeToVisit: 'October to March', estimatedDailyBudget: inr(3800),
    tags: ['budget', 'weekend'], travelTips: ['Go up to Mehrangarh by the east entrance to avoid queues.'] }),
  dest({ id: 'manali', name: 'Manali', country: 'India', region: 'Himachal Pradesh', location: { lat: 32.2396, lng: 77.1887 }, timezone: 'Asia/Kolkata', currency: 'INR',
    overview: 'Himalayan valleys, river rafting and snow within reach.', bestTimeToVisit: 'March–June (green) or December–February (snow)', estimatedDailyBudget: inr(3800),
    tags: ['mountains', 'adventure', 'budget'], travelTips: ['Roads can close in heavy snow — keep a buffer day.'] }),
]

function mk(destinationId: string, kind: Place['kind'], id: string, name: string, lat: number, lng: number, description: string, tags: string[] = [], cost = 0): Place {
  const base = { id, destinationId, name, description, location: { lat, lng }, images: [img(id, name)], rating: 4.5, tags, typicalDurationMin: 90, costEstimate: inr(cost), ...ts }
  return kind === 'restaurant'
    ? { ...base, kind, priceLevel: 2, cuisines: ['Local'], dietary: [] }
    : ({ ...base, kind } as Place)
}

export const otherPlaces: Place[] = [
  // Goa
  mk('goa', 'attraction', 'g-baga', 'Baga Beach', 15.5553, 73.7517, 'Lively beach with water sports and shacks.', ['beaches'], 500),
  mk('goa', 'attraction', 'g-fort-aguada', 'Fort Aguada', 15.4929, 73.7737, 'Seventeenth-century Portuguese fort with sea views.', ['history', 'photography'], 50),
  mk('goa', 'attraction', 'g-fontainhas', 'Fontainhas Latin Quarter', 15.4966, 73.8301, 'Painted houses and quiet lanes in Panjim.', ['culture', 'photography']),
  mk('goa', 'attraction', 'g-palolem', 'Palolem Beach', 15.0100, 74.0232, 'Crescent beach in South Goa, calm and scenic.', ['beaches']),
  mk('goa', 'restaurant', 'g-shack', 'Beach Shack Thalassa', 15.5560, 73.7520, 'Seafood thalis on the sand.', ['seafood'], 700),
  // Japan: Tokyo
  mk('japan', 'attraction', 'j-senso-ji', 'Senso-ji Temple', 35.7148, 139.7967, 'Tokyo’s oldest temple, in Asakusa.', ['culture', 'history'], 0),
  mk('japan', 'restaurant', 'j-tsukiji', 'Tsukiji Outer Market', 35.6655, 139.7707, 'Street-food stalls and sushi counters.', ['food'], 2500),
  mk('japan', 'attraction', 'j-shibuya', 'Shibuya Crossing', 35.6595, 139.7005, 'The world’s busiest pedestrian scramble.', ['photography'], 0),
  mk('japan', 'attraction', 'j-meiji', 'Meiji Jingu', 35.6764, 139.6993, 'Forested shrine in the middle of Tokyo.', ['culture', 'nature'], 0),
  mk('japan', 'restaurant', 'j-ramen', 'Shinjuku Ramen Alley', 35.6938, 139.7034, 'Tiny counters, rich tonkotsu and shoyu broths.', ['food'], 1100),
  mk('japan', 'attraction', 'j-teamlab', 'teamLab Planets', 35.6490, 139.7894, 'Immersive digital art museum.', ['culture'], 3200),
  mk('japan', 'attraction', 'j-yanaka', 'Yanaka Old Town', 35.7279, 139.7660, 'Low-rise streets and old shops.', ['photography', 'history'], 0),
  // Japan: Kyoto
  mk('japan', 'attraction', 'j-fushimi', 'Fushimi Inari Taisha', 34.9671, 135.7727, 'Thousands of vermilion torii gates up the hill.', ['photography', 'culture'], 0),
  mk('japan', 'restaurant', 'j-nishiki', 'Nishiki Market', 35.0050, 135.7649, 'Kyoto’s kitchen: pickles, tofu and skewers.', ['food'], 1800),
  mk('japan', 'attraction', 'j-kinkaku', 'Kinkaku-ji', 35.0394, 135.7292, 'The Golden Pavilion beside a mirror pond.', ['culture', 'photography'], 500),
  mk('japan', 'attraction', 'j-arashiyama', 'Arashiyama Bamboo Grove', 35.0094, 135.6668, 'Walk through towering bamboo.', ['nature', 'photography'], 0),
  mk('japan', 'attraction', 'j-gion', 'Gion District', 35.0037, 135.7756, 'Teahouses and evening geisha district.', ['culture', 'history'], 0),
  mk('japan', 'restaurant', 'j-kaiseki', 'Kaiseki Dinner in Pontocho', 35.0053, 135.7714, 'Seasonal multi-course dinner.', ['food'], 7500),
]

/** Compact itinerary generator: each day lists place ids, scheduled at fixed slots. */
const SLOTS = ['10:00', '13:00', '16:00', '19:00']
function snapshot(prefix: string, tripId: string, dayPlans: Array<{ title: string; places: string[] }>, source: Place[]) {
  const byId = new Map(source.map((p) => [p.id, p]))
  const days: ItineraryDay[] = []
  const items: Omit<ItineraryItem, 'notes' | 'bookingId'>[] = []
  dayPlans.forEach((d, di) => {
    const dayId = `${prefix}-day-${di + 1}`
    days.push({ id: dayId, tripId, dayNumber: di + 1, date: `2026-01-${String(di + 1).padStart(2, '0')}`, title: d.title })
    let prev: Place | undefined
    d.places.forEach((pid, pi) => {
      const p = byId.get(pid)!
      const km = prev ? Math.round(haversineKm(prev.location, p.location) * 10) / 10 : undefined
      prev = p
      const category: ItemCategory = p.kind === 'restaurant' ? 'food' : 'sightseeing'
      items.push({
        id: `${prefix}-item-${di + 1}-${pi + 1}`, tripId, dayId, position: pi, startTime: SLOTS[pi] ?? '19:00', durationMin: p.typicalDurationMin ?? 90, title: p.name,
        description: p.description, category, placeId: p.id, estimatedCost: p.costEstimate, distanceFromPrevKm: km,
        travelTimeFromPrevMin: km === undefined ? undefined : estimateTravelMinutes(km), image: p.images[0], status: 'upcoming', source: 'user', ...ts,
      })
    })
  })
  return { days, items, places: [...new Set(dayPlans.flatMap((d) => d.places))].map((id) => byId.get(id)!), memories: [] as PublicTrip['snapshot']['memories'] }
}

export function buildPublicTrips(allPlaces: Place[]): PublicTrip[] {
  const japan = snapshot('jp', 'pub-trip-japan', [
    { title: 'Asakusa & Tsukiji', places: ['j-senso-ji', 'j-tsukiji', 'j-yanaka'] },
    { title: 'Shibuya & Harajuku', places: ['j-meiji', 'j-shibuya', 'j-ramen'] },
    { title: 'Art & the bay', places: ['j-teamlab', 'j-ramen'] },
    { title: 'Tokyo free day', places: ['j-yanaka', 'j-tsukiji'] },
    { title: 'Kyoto: Fushimi & Nishiki', places: ['j-fushimi', 'j-nishiki', 'j-gion'] },
    { title: 'Kyoto: temples & bamboo', places: ['j-kinkaku', 'j-arashiyama', 'j-kaiseki'] },
    { title: 'Last Kyoto morning', places: ['j-nishiki', 'j-gion'] },
  ], allPlaces)
  const bali4 = snapshot('b4', 'pub-trip-bali', [
    { title: 'Seminyak sunset', places: ['p-seminyak-village', 'p-seminyak-beach', 'r-kayu-dinner'] },
    { title: 'Ubud day', places: ['p-tegallalang', 'p-tirta-empul', 'r-padi-hijau', 'p-campuhan'] },
    { title: 'Uluwatu', places: ['p-uluwatu-temple', 'r-jimbaran-grill', 'p-kecak'] },
    { title: 'Slow last day', places: ['p-sanur-beach', 'p-spa'] },
  ], allPlaces)
  const goa = snapshot('go', 'pub-trip-goa', [
    { title: 'North Goa beaches', places: ['g-baga', 'g-shack', 'g-fort-aguada'] },
    { title: 'Old Goa & Panjim', places: ['g-fontainhas'] },
    { title: 'South Goa', places: ['g-palolem'] },
  ], allPlaces)
  const base = { visibility: 'public' as const, likeCount: 0, publishedAt: '2026-08-01T08:00:00.000Z' }
  return [
    { id: 'pub-japan', slug: '7-days-in-japan-food-culture-k7p2', ownerId: 'user-aiko', ownerName: 'Aiko Tanaka', title: '7 Days in Japan — Food & Culture',
      description: 'Four days in Tokyo and three in Kyoto, built around markets, small restaurants and temples with fewer crowds.', coverImage: img('pub-japan', '7 Days in Japan'),
      destinationIds: ['japan'], durationDays: 7, budgetRange: [inr(110000), inr(140000)], travelStyle: 'Foodie', tips: ['Buy a Suica card at the airport.', 'Reserve kaiseki dinners a month ahead.'],
      snapshot: japan, saveCount: 1280, ...base, likeCount: 942 },
    { id: 'pub-bali', slug: '4-days-in-bali-couple-trip-m3x9', ownerId: 'user-rohan', ownerName: 'Rohan & Isha', title: '4 Days in Bali — Couple Trip',
      description: 'A romantic mix of beach sunsets, Ubud rice terraces and slow evenings.', coverImage: img('pub-bali', '4 Days in Bali'),
      destinationIds: ['bali'], durationDays: 4, budgetRange: [inr(55000), inr(75000)], travelStyle: 'Couple', tips: ['Book a driver for the Ubud day.', 'Reserve Kecak seats in advance.'],
      snapshot: bali4, saveCount: 864, ...base, likeCount: 610 },
    { id: 'pub-goa', slug: '3-day-goa-budget-trip-q8d4', ownerId: 'user-sara', ownerName: 'Sara Mathew', title: '3-Day Goa Budget Trip',
      description: 'Hostels, beach shacks and a scooter: Goa under ₹12,000.', coverImage: img('pub-goa', '3-Day Goa'),
      destinationIds: ['goa'], durationDays: 3, budgetRange: [inr(9000), inr(12000)], travelStyle: 'Budget', tips: ['Travel off-season (Sept–Oct) for lower prices.', 'Wear a helmet on scooters.'],
      snapshot: goa, saveCount: 502, ...base, likeCount: 377 },
    ...([
      ['pub-bali-budget', '5-days-in-bali-on-a-budget-t4w6', 'user-meera', 'Meera K.', '5 Days in Bali on a Budget', 'Homestays, warung lunches and a scooter: all of Bali under ₹40,000.', 'bali', bali4, 5, [34000, 42000], 'Budget', ['Eat at warungs — meals from ₹200.', 'Rent a scooter only if you have a licence.'], 731, 498, '2026-07-20T08:00:00.000Z'],
      ['pub-tokyo-4', '4-days-in-tokyo-first-timers-p2n8', 'user-dev', 'Dev Malhotra', '4 Days in Tokyo — First Timers', 'The big hits without the burnout: shrines, ramen, Shibuya at night.', 'japan', japan, 4, [70000, 90000], 'First time', ['Get a Suica card and add it to your phone wallet.'], 655, 431, '2026-07-02T08:00:00.000Z'],
      ['pub-goa-food', 'goa-food-weekend-r6c1', 'user-neha', 'Neha & Karan', 'Goa Food Weekend', 'Fish thali, bebinca and the best sundowner shacks across two days.', 'goa', goa, 2, [14000, 19000], 'Foodie', ['Lunch is early at shacks — go by 1pm.'], 318, 244, '2026-06-18T08:00:00.000Z'],
      ['pub-ubud-slow', 'slow-days-in-ubud-h9j3', 'user-ana', 'Ana Ferreira', 'Slow Days in Ubud', 'Rice terraces at sunrise, yoga, and no alarms.', 'bali', bali4, 3, [38000, 52000], 'Slow travel', ['Go to Tegallalang before 8am to beat the crowds.'], 292, 201, '2026-06-01T08:00:00.000Z'],
      ['pub-kyoto-3', '3-days-in-kyoto-temples-v5b7', 'user-hiro', 'Hiro Sato', '3 Days in Kyoto — Temples & Tea', 'Fushimi at dawn, Arashiyama in the afternoon, kaiseki to finish.', 'japan', japan, 3, [60000, 78000], 'Culture', ['Reserve kaiseki dinners well in advance.'], 244, 187, '2026-05-14T08:00:00.000Z'],
    ] as const).map(([id, slug, ownerId, ownerName, title, description, dest, snap, durationDays, range, travelStyle, tips, saveCount, likeCount, publishedAt]) => ({
      id, slug, ownerId, ownerName, title, description, coverImage: img(id, title), destinationIds: [dest], durationDays, budgetRange: [inr(range[0]), inr(range[1])] as [Money, Money],
      travelStyle, tips: [...tips], snapshot: snap, ...base, saveCount, likeCount, publishedAt,
    })),
  ]
}

// ── A past, completed trip so Memories, Completed state and Publish flow have data. ──
export const GOA_TRIP_ID = 'trip-goa'
export const goaTrip: Trip = {
  id: GOA_TRIP_ID, ownerId: DEMO_USER_ID, title: 'Goa Weekend', destinationIds: ['goa'], startDate: '2026-03-06', endDate: '2026-03-08', timezone: 'Asia/Kolkata',
  travellers: { group: 'friends', count: 4 }, budget: { tier: 'economy', total: inr(24000) }, interests: ['beaches', 'food'], planningStyle: 'manual', state: 'ready',
  coverImage: img('goa-cover', 'Goa Weekend'), visibility: 'private', offlineAvailable: false, ...ts,
}
export const goaDays: ItineraryDay[] = [1, 2, 3].map((n) => ({ id: `goa-day-${n}`, tripId: GOA_TRIP_ID, dayNumber: n, date: `2026-03-0${5 + n}`, destinationId: 'goa' }))
const goaPlan: Array<[number, string, string, string]> = [
  [1, '15:00', 'g-baga', 'Baga Beach'], [1, '19:30', 'g-shack', 'Dinner at the beach shack'], [2, '10:00', 'g-fort-aguada', 'Fort Aguada'],
  [2, '16:00', 'g-fontainhas', 'Fontainhas walk'], [3, '10:00', 'g-palolem', 'Palolem Beach'],
]
export const goaItems: ItineraryItem[] = goaPlan.map(([d, time, pid, title], i) => {
  const p = otherPlaces.find((x) => x.id === pid)!
  return { id: `goa-item-${i + 1}`, tripId: GOA_TRIP_ID, dayId: `goa-day-${d}`, position: goaPlan.slice(0, i).filter((x) => x[0] === d).length, startTime: time, durationMin: 120, title, category: 'sightseeing', placeId: pid, image: p.images[0], status: 'completed', source: 'user', ...ts }
})
export const goaChecklist: ChecklistItem[] = ['Flight booked', 'Hotel booked', 'Packing list'].map((label, i) => ({ id: `chk-goa-${i}`, tripId: GOA_TRIP_ID, label, type: 'custom', done: true }))
export const goaMemories: Memory[] = [
  ['Sunset at Baga Beach', '2026-03-06T18:20:00+05:30', 'goa-day-1', 'goa-item-1'],
  ['Fish thali at the shack', '2026-03-06T20:05:00+05:30', 'goa-day-1', 'goa-item-2'],
  ['Fort Aguada lighthouse', '2026-03-07T11:15:00+05:30', 'goa-day-2', 'goa-item-3'],
  ['Painted houses, Fontainhas', '2026-03-07T16:40:00+05:30', 'goa-day-2', 'goa-item-4'],
].map(([caption, at, dayId, itemId], i) => ({
  id: `mem-goa-${i + 1}`, tripId: GOA_TRIP_ID, authorId: DEMO_USER_ID, kind: 'photo', caption, mediaKey: `seed:goa-${i + 1}:${caption}`, capturedAt: new Date(at!).toISOString(),
  dayId, itemId, uploadState: 'done', stripLocationOnPublic: true, ...ts,
}))

export const goaStories: Story[] = [
  {
    id: 'story-goa-1', tripId: GOA_TRIP_ID, authorId: DEMO_USER_ID, title: 'Day 1 — Goa', dayId: 'goa-day-1', visibility: 'private', ...ts,
    slides: [
      { id: 'sl-1', memoryId: 'mem-goa-1', text: 'We made it.', sticker: '🌅', location: 'Baga Beach' },
      { id: 'sl-2', memoryId: 'mem-goa-2', text: 'Best fish thali. Ever.', sticker: '🍛', itemId: 'goa-item-2' },
    ],
  },
]

export const demoNotifications: Notification[] = [
  { id: 'ntf-1', userId: DEMO_USER_ID, type: 'trip_countdown', tripId: 'trip-bali', title: 'Your Bali trip starts soon', body: 'Finish your plan: add a hotel and flights.', deepLink: '/trips/trip-bali', scheduledFor: '2026-10-01T09:00:00.000Z' },
  { id: 'ntf-2', userId: DEMO_USER_ID, type: 'busy_day', tripId: 'trip-bali', title: 'Day 3 may be too busy', body: 'Five stops and 3 hours of driving. Want to trim it?', deepLink: '/trips/trip-bali/itinerary/day/3', scheduledFor: '2026-09-30T09:00:00.000Z' },
]
