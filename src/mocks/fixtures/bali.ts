import { DEMO_USER_ID } from '@/data/actor'
import { estimateTravelMinutes, haversineKm } from '@/lib/geo'
import { placeholderImage } from '@/lib/placeholder'
import type { ChecklistItem, Destination, Flight, Hotel, ItemCategory, ItineraryDay, ItineraryItem, Place, Restaurant, Trip } from '@/types'

export const SEED_TS = '2026-09-20T10:00:00.000Z'
const ts = { createdAt: SEED_TS, updatedAt: SEED_TS }
const inr = (amount: number) => ({ amount, currency: 'INR' })
// Cover images carry no baked-in text: cards overlay their own titles, and a second label would collide.
const img = (id: string, _label: string) => placeholderImage(id, '', [16, 9])

export const BALI_TRIP_ID = 'trip-bali'

export const bali: Destination = {
  id: 'bali', name: 'Bali', country: 'Indonesia', region: 'Lesser Sunda Islands', location: { lat: -8.4095, lng: 115.1889 },
  timezone: 'Asia/Makassar', currency: 'IDR', heroImage: img('bali', 'Bali'),
  overview: 'An island of rice terraces, temples, surf beaches and some of Southeast Asia’s best food. Stay on the coast for sunsets, head inland to Ubud for culture and green.',
  bestTimeToVisit: 'April to October (dry season)', estimatedDailyBudget: inr(6500), tags: ['trending', 'beaches', 'food', 'international'],
  travelTips: [
    'Hire a driver for day trips — traffic makes self-drive tiring.',
    'Dress modestly and carry a sarong for temple visits.',
    'Carry small cash for warungs and parking; many small places are cash-only.',
    'Book sunset spots early on weekends.',
  ],
  ...ts,
}

type P = Omit<Place, 'kind' | 'createdAt' | 'updatedAt' | 'destinationId' | 'images' | 'tags'> & { tags?: string[] }
const place = (kind: Exclude<Place['kind'], 'restaurant'>, p: P): Place => ({
  ...p, kind, destinationId: 'bali', tags: p.tags ?? [], images: [img(p.id, p.name)], ...ts,
}) as Place
const restaurant = (p: Omit<Restaurant, 'kind' | 'destinationId' | 'images' | 'createdAt' | 'updatedAt' | 'tags'> & { tags?: string[] }): Restaurant => ({
  ...p, kind: 'restaurant', destinationId: 'bali', tags: p.tags ?? [], images: [img(p.id, p.name)], ...ts,
})

export const baliPlaces: Place[] = [
  place('airport', { id: 'p-dps', name: 'Ngurah Rai International Airport', description: 'Bali’s international airport, 20–30 minutes from Seminyak.', location: { lat: -8.7467, lng: 115.1668 }, typicalDurationMin: 60 }),
  place('attraction', { id: 'p-seminyak-village', name: 'Seminyak Village Walk', description: 'Boutiques, cafés and galleries along Jalan Kayu Aya and Jalan Oberoi.', location: { lat: -8.6913, lng: 115.1682 }, rating: 4.4, typicalDurationMin: 120, tags: ['photography', 'shopping'], costEstimate: inr(0) }),
  place('attraction', { id: 'p-seminyak-beach', name: 'Seminyak Beach', description: 'Wide sandy beach with beach clubs and one of the island’s most reliable sunsets.', location: { lat: -8.6878, lng: 115.1584 }, rating: 4.6, typicalDurationMin: 150, tags: ['beaches', 'photography', 'sunset'], costEstimate: inr(0) }),
  place('attraction', { id: 'p-uluwatu-temple', name: 'Uluwatu Temple', description: 'Clifftop sea temple above the Indian Ocean. Watch for macaques and keep sunglasses secured.', location: { lat: -8.8291, lng: 115.0849 }, rating: 4.7, typicalDurationMin: 120, tags: ['culture', 'photography', 'history'], costEstimate: inr(1000), openingHours: '07:00–19:00' }),
  place('activity', { id: 'p-kecak', name: 'Kecak Fire Dance at Uluwatu', description: 'A sunset performance on the cliff amphitheatre — about an hour long.', location: { lat: -8.8296, lng: 115.0852 }, rating: 4.5, typicalDurationMin: 75, tags: ['culture', 'sunset'], costEstimate: inr(1200) }),
  place('attraction', { id: 'p-jimbaran-bay', name: 'Jimbaran Bay', description: 'Calm, curved bay with sunset seafood grills right on the sand.', location: { lat: -8.7900, lng: 115.1630 }, rating: 4.5, typicalDurationMin: 150, tags: ['beaches'], costEstimate: inr(0) }),
  place('attraction', { id: 'p-tegallalang', name: 'Tegallalang Rice Terraces', description: 'Layered rice terraces north of Ubud — go early for soft light and fewer crowds.', location: { lat: -8.4312, lng: 115.2793 }, rating: 4.5, typicalDurationMin: 90, tags: ['photography', 'nature'], costEstimate: inr(400) }),
  place('attraction', { id: 'p-tirta-empul', name: 'Tirta Empul Temple', description: 'Holy spring temple where visitors can take part in the purification ritual.', location: { lat: -8.4150, lng: 115.3153 }, rating: 4.6, typicalDurationMin: 90, tags: ['culture', 'history'], costEstimate: inr(500) }),
  place('attraction', { id: 'p-monkey-forest', name: 'Sacred Monkey Forest Sanctuary', description: 'Forest with temples and a few hundred long-tailed macaques, in the middle of Ubud.', location: { lat: -8.5188, lng: 115.2589 }, rating: 4.4, typicalDurationMin: 90, tags: ['nature', 'photography'], costEstimate: inr(900) }),
  place('viewpoint', { id: 'p-campuhan', name: 'Campuhan Ridge Walk', description: 'Easy ridge path with green valley views — best an hour before sunset.', location: { lat: -8.5006, lng: 115.2506 }, rating: 4.5, typicalDurationMin: 75, tags: ['nature', 'photography', 'sunset'], costEstimate: inr(0) }),
  place('attraction', { id: 'p-batu-bolong', name: 'Batu Bolong Beach, Canggu', description: 'Surf-school beach with laid-back cafés and black-sand sunsets.', location: { lat: -8.6592, lng: 115.1300 }, rating: 4.4, typicalDurationMin: 150, tags: ['beaches', 'adventure'], costEstimate: inr(1500) }),
  place('attraction', { id: 'p-tanah-lot', name: 'Tanah Lot', description: 'Sea temple on a rock outcrop — a classic Bali sunset stop.', location: { lat: -8.6212, lng: 115.0868 }, rating: 4.5, typicalDurationMin: 105, tags: ['photography', 'culture', 'sunset'], costEstimate: inr(600) }),
  place('attraction', { id: 'p-sanur-beach', name: 'Sanur Beach Promenade', description: 'Quiet, shallow beach with a long paved path — good for a slow last morning.', location: { lat: -8.6980, lng: 115.2640 }, rating: 4.4, typicalDurationMin: 120, tags: ['beaches'], costEstimate: inr(0) }),
  place('activity', { id: 'p-spa', name: 'Traditional Balinese Massage', description: 'A one-hour massage at a well-reviewed local spa, hotel pickup available.', location: { lat: -8.6935, lng: 115.1705 }, rating: 4.6, typicalDurationMin: 90, tags: ['relaxation'], costEstimate: inr(1800) }),
  place('shop', { id: 'p-kuta-market', name: 'Seminyak Souvenir Street', description: 'Batik, woodcarving and spices — bargain politely.', location: { lat: -8.6860, lng: 115.1700 }, rating: 4.1, typicalDurationMin: 90, tags: ['shopping'], costEstimate: inr(2000) }),
  place('hidden_gem', { id: 'p-sidemen', name: 'Sidemen Valley', description: 'Quiet terraced valley under Mount Agung — what Ubud was like before the crowds.', location: { lat: -8.4756, lng: 115.4472 }, rating: 4.7, typicalDurationMin: 150, tags: ['nature', 'photography'], costEstimate: inr(0) }),
  place('hidden_gem', { id: 'p-tukad-cepung', name: 'Tukad Cepung Waterfall', description: 'Waterfall inside a narrow cave canyon, with light beams around midday.', location: { lat: -8.4864, lng: 115.4256 }, rating: 4.6, typicalDurationMin: 90, tags: ['nature', 'photography', 'adventure'], costEstimate: inr(300) }),
  place('hidden_gem', { id: 'p-nyang-nyang', name: 'Nyang Nyang Beach', description: 'Long, empty cliff-backed beach in the far south — bring water and shade.', location: { lat: -8.8349, lng: 115.0961 }, rating: 4.5, typicalDurationMin: 120, tags: ['beaches'], costEstimate: inr(0) }),
  restaurant({ id: 'r-warung-sari', name: 'Warung Sari Rasa', description: 'Family-run warung serving nasi campur and sate lilit.', location: { lat: -8.6925, lng: 115.1690 }, rating: 4.5, priceLevel: 1, cuisines: ['Balinese'], dietary: ['vegetarian'], typicalDurationMin: 75, costEstimate: inr(900) }),
  restaurant({ id: 'r-pagi-kitchen', name: 'Pagi Kitchen', description: 'Light, bright breakfast café — smoothie bowls, eggs and strong coffee.', location: { lat: -8.6900, lng: 115.1665 }, rating: 4.4, priceLevel: 2, cuisines: ['Café'], dietary: ['vegetarian', 'vegan', 'gluten_free'], typicalDurationMin: 60, costEstimate: inr(800) }),
  restaurant({ id: 'r-jimbaran-grill', name: 'Jimbaran Grill House', description: 'Grilled catch of the day on the sand, priced by weight.', location: { lat: -8.7905, lng: 115.1625 }, rating: 4.3, priceLevel: 3, cuisines: ['Seafood'], dietary: [], typicalDurationMin: 90, costEstimate: inr(2200) }),
  restaurant({ id: 'r-kayu-dinner', name: 'Kayu Lantern', description: 'Wood-fired Indonesian small plates in a garden courtyard.', location: { lat: -8.6890, lng: 115.1680 }, rating: 4.6, priceLevel: 3, cuisines: ['Indonesian', 'Modern'], dietary: ['vegetarian', 'vegan'], typicalDurationMin: 90, costEstimate: inr(2500) }),
  restaurant({ id: 'r-padi-hijau', name: 'Warung Padi Hijau', description: 'Open-air Ubud warung over the rice fields; try the bebek betutu.', location: { lat: -8.5120, lng: 115.2610 }, rating: 4.5, priceLevel: 2, cuisines: ['Balinese'], dietary: ['vegetarian', 'halal'], typicalDurationMin: 75, costEstimate: inr(1100) }),
  restaurant({ id: 'r-ubud-vegan', name: 'Taru Plant Kitchen', description: 'Plant-based tasting menus using local produce.', location: { lat: -8.5075, lng: 115.2630 }, rating: 4.7, priceLevel: 3, cuisines: ['Vegan', 'Indonesian'], dietary: ['vegetarian', 'vegan', 'gluten_free'], typicalDurationMin: 90, costEstimate: inr(2400) }),
  restaurant({ id: 'r-canggu-cafe', name: 'Echo Brunch Club', description: 'Surfer café with big breakfasts, a short walk from the beach.', location: { lat: -8.6580, lng: 115.1310 }, rating: 4.3, priceLevel: 2, cuisines: ['Café', 'Brunch'], dietary: ['vegetarian', 'vegan'], typicalDurationMin: 60, costEstimate: inr(850) }),
  restaurant({ id: 'r-sanur-warung', name: 'Warung Pantai Sanur', description: 'Beachfront lunch spot with grilled fish and fresh juices.', location: { lat: -8.6990, lng: 115.2635 }, rating: 4.2, priceLevel: 1, cuisines: ['Balinese', 'Seafood'], dietary: ['halal'], typicalDurationMin: 75, costEstimate: inr(1000) }),
]

export const baliHotels: Hotel[] = [
  hotel('h-seminyak-garden', 'Seminyak Garden Villas', 'Villa', 4.7, 412, 5200, 1.2, ['Pool', 'Breakfast', 'Wi-Fi', 'Airport transfer', 'Air conditioning'], { lat: -8.6921, lng: 115.1672 }),
  hotel('h-sunset-boutique', 'Sunset Boutique Hotel', 'Hotel', 4.4, 861, 3800, 0.6, ['Pool', 'Breakfast', 'Wi-Fi', 'Spa'], { lat: -8.6870, lng: 115.1649 }),
  hotel('h-kayu-homestay', 'Kayu Homestay', 'Homestay', 4.5, 238, 2100, 1.8, ['Breakfast', 'Wi-Fi', 'Scooter rental'], { lat: -8.6972, lng: 115.1701 }),
  hotel('h-coral-resort', 'Coral Bay Resort', 'Resort', 4.8, 1204, 9400, 2.4, ['Pool', 'Beach access', 'Breakfast', 'Kids club', 'Spa', 'Gym'], { lat: -8.7102, lng: 115.1698 }),
]

function hotel(id: string, name: string, type: string, rating: number, reviews: number, price: number, km: number, amenities: string[], location: Hotel['location']): Hotel {
  return {
    id, destinationId: 'bali', name, location, address: 'Seminyak, Kuta, Badung Regency, Bali', images: [img(id + '1', name), img(id + '2', 'Room'), img(id + '3', 'Pool')],
    rating, reviewCount: reviews, pricePerNight: inr(price), propertyType: type, amenities, distanceFromCenterKm: km,
    rooms: [
      { id: id + '-std', name: 'Standard room', sleeps: 2, pricePerNight: inr(price) },
      { id: id + '-dlx', name: 'Deluxe room', sleeps: 3, pricePerNight: inr(Math.round(price * 1.35)) },
    ],
    reviews: [
      { author: 'Meera K.', rating: 5, text: 'Quiet, spotless and the staff arranged our driver for Ubud.', date: '2026-08-14' },
      { author: 'Daniel R.', rating: 4, text: 'Great location. Breakfast was good; the road outside can be noisy in the evening.', date: '2026-07-02' },
    ],
    ...ts,
  }
}

const bom = { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj Intl' }
const dps = { code: 'DPS', city: 'Bali', name: 'Ngurah Rai International' }
export const baliFlights: Flight[] = [
  { id: 'f-out-1', airline: 'Singapore Airlines', flightNumber: 'SQ 423', from: bom, to: dps, departAt: '2026-10-11T22:40:00+05:30', arriveAt: '2026-10-12T09:30:00+08:00', durationMin: 500, stops: 1, price: inr(21400), cabin: 'economy' },
  { id: 'f-out-2', airline: 'Malaysia Airlines', flightNumber: 'MH 191', from: bom, to: dps, departAt: '2026-10-11T23:55:00+05:30', arriveAt: '2026-10-12T11:45:00+08:00', durationMin: 530, stops: 1, price: inr(18200), cabin: 'economy' },
  { id: 'f-out-3', airline: 'IndiGo', flightNumber: '6E 1049', from: bom, to: dps, departAt: '2026-10-12T02:10:00+05:30', arriveAt: '2026-10-12T13:20:00+08:00', durationMin: 580, stops: 1, price: inr(15900), cabin: 'economy' },
  { id: 'f-ret-1', airline: 'Singapore Airlines', flightNumber: 'SQ 938', from: dps, to: bom, departAt: '2026-10-16T23:50:00+08:00', arriveAt: '2026-10-17T07:10:00+05:30', durationMin: 590, stops: 1, price: inr(20800), cabin: 'economy' },
  { id: 'f-ret-2', airline: 'IndiGo', flightNumber: '6E 1050', from: dps, to: bom, departAt: '2026-10-16T21:15:00+08:00', arriveAt: '2026-10-17T06:00:00+05:30', durationMin: 615, stops: 1, price: inr(16700), cabin: 'economy' },
]

export const baliTrip: Trip = {
  id: BALI_TRIP_ID, ownerId: DEMO_USER_ID, title: '5 Days in Bali', destinationIds: ['bali'], startDate: '2026-10-12', endDate: '2026-10-16',
  timezone: 'Asia/Makassar', travellers: { group: 'couple', count: 2 }, budget: { tier: 'comfort', total: inr(60000) },
  interests: ['food', 'beaches', 'photography'], planningStyle: 'hybrid', state: 'planning', coverImage: img('bali-cover', '5 Days in Bali'),
  visibility: 'private', offlineAvailable: false, ...ts,
}

export const baliDays: ItineraryDay[] = [
  [1, '2026-10-12', 'Arrival & Seminyak'],
  [2, '2026-10-13', 'Uluwatu & the south coast'],
  [3, '2026-10-14', 'Ubud: terraces & temples'],
  [4, '2026-10-15', 'Canggu surf & Tanah Lot sunset'],
  [5, '2026-10-16', 'Slow morning & departure'],
].map(([n, date, title]) => ({ id: `day-${n}`, tripId: BALI_TRIP_ID, dayNumber: n as number, date: date as string, title: title as string, destinationId: 'bali' }))

type Slot = [day: number, time: string, dur: number, title: string, cat: ItemCategory, placeId: string, cost: number]
const plan: Slot[] = [
  [1, '09:30', 45, 'Arrive at Ngurah Rai Airport', 'transport', 'p-dps', 0],
  [1, '11:00', 60, 'Hotel check-in, Seminyak', 'lodging', 'p-seminyak-village', 0],
  [1, '13:00', 75, 'Lunch at Warung Sari Rasa', 'food', 'r-warung-sari', 900],
  [1, '15:00', 120, 'Seminyak village walk', 'sightseeing', 'p-seminyak-village', 0],
  [1, '18:30', 90, 'Sunset at Seminyak Beach', 'sunset', 'p-seminyak-beach', 0],
  [1, '20:30', 90, 'Dinner at Kayu Lantern', 'food', 'r-kayu-dinner', 2500],
  [2, '08:00', 60, 'Breakfast at Pagi Kitchen', 'food', 'r-pagi-kitchen', 800], // early: Uluwatu is ~50 min away
  [2, '10:00', 120, 'Uluwatu Temple', 'sightseeing', 'p-uluwatu-temple', 1000],
  [2, '13:00', 90, 'Seafood lunch at Jimbaran Grill House', 'food', 'r-jimbaran-grill', 2200],
  [2, '15:00', 150, 'Jimbaran Bay beach time', 'beach', 'p-jimbaran-bay', 0],
  [2, '18:30', 75, 'Kecak fire dance at Uluwatu', 'activity', 'p-kecak', 1200],
  [3, '08:30', 90, 'Tegallalang Rice Terraces', 'sightseeing', 'p-tegallalang', 400],
  [3, '10:30', 90, 'Tirta Empul Temple', 'sightseeing', 'p-tirta-empul', 500],
  [3, '13:00', 75, 'Lunch at Warung Padi Hijau', 'food', 'r-padi-hijau', 1100],
  [3, '15:00', 90, 'Sacred Monkey Forest', 'sightseeing', 'p-monkey-forest', 900],
  [3, '17:30', 75, 'Campuhan Ridge Walk at golden hour', 'sunset', 'p-campuhan', 0],
  [3, '19:30', 90, 'Dinner at Taru Plant Kitchen', 'food', 'r-ubud-vegan', 2400],
  [4, '09:00', 60, 'Brunch at Echo Brunch Club', 'food', 'r-canggu-cafe', 850],
  [4, '10:30', 150, 'Surf lesson at Batu Bolong', 'activity', 'p-batu-bolong', 1500],
  [4, '13:30', 90, 'Lunch near the beach', 'food', 'r-canggu-cafe', 900],
  [4, '16:30', 105, 'Sunset at Tanah Lot', 'sunset', 'p-tanah-lot', 600],
  [5, '09:00', 120, 'Slow morning on Sanur Beach', 'beach', 'p-sanur-beach', 0],
  [5, '11:30', 90, 'Balinese massage', 'activity', 'p-spa', 1800],
  [5, '13:30', 75, 'Lunch at Warung Pantai Sanur', 'food', 'r-sanur-warung', 1000],
  [5, '15:30', 90, 'Souvenir shopping', 'shopping', 'p-kuta-market', 2000],
  [5, '18:00', 60, 'Transfer to airport', 'transport', 'p-dps', 700],
]

const placeById = new Map(baliPlaces.map((p) => [p.id, p]))
export const baliItems: ItineraryItem[] = (() => {
  const counters: Record<number, number> = {}
  const last: Record<number, Place | undefined> = {}
  return plan.map(([day, time, dur, title, category, placeId, cost]) => {
    const position = (counters[day] = (counters[day] ?? -1) + 1)
    const p = placeById.get(placeId)!
    const prev = last[day]
    const km = prev ? Math.round(haversineKm(prev.location, p.location) * 10) / 10 : undefined
    last[day] = p
    return {
      id: `item-d${day}-${position + 1}`, tripId: BALI_TRIP_ID, dayId: `day-${day}`, position, startTime: time, durationMin: dur, title,
      description: p.description, category, placeId, estimatedCost: cost ? inr(cost) : undefined, distanceFromPrevKm: km,
      travelTimeFromPrevMin: km === undefined ? undefined : estimateTravelMinutes(km), image: p.images[0], status: 'upcoming', source: 'template', ...ts,
    } satisfies ItineraryItem
  })
})()

export const baliChecklist: ChecklistItem[] = [
  ['Flight booked', 'flight_booked'], ['Hotel booked', 'hotel_booked'], ['Activities booked', 'activities_booked'],
  ['Passport (valid 6+ months)'], ['Visa on arrival (IDR 500,000 each)'], ['Travel insurance'], ['Currency / forex card'], ['Packing list'],
].map(([label, autoRule], i) => ({
  id: `chk-bali-${i + 1}`, tripId: BALI_TRIP_ID, label: label as string, type: autoRule ? 'auto' : 'custom', autoRule: autoRule as ChecklistItem['autoRule'], done: false,
}))
