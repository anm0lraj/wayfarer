// One-off curation of the demo's stock photography from Wikimedia Commons (free-licence images, so the demo can
// ship real photos without keys or paid APIs). Run `node scripts/curate-stock-photos.mjs` to regenerate
// src/lib/stock/photos.json. Commons licences (CC BY, CC BY-SA, CC0, public domain) all allow reuse; most require
// credit, which the app shows on /credits. The output is committed, so the app never calls the Commons API itself.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const UA = 'WayfarerDemo/1.0 (travel-app portfolio demo)'
const API = 'https://commons.wikimedia.org/w/api.php'

// Seed id (what the fixtures pass to img()) → search terms, tried in order.
const QUERIES = {
  // Destinations
  bali: ['Bali Pura Ulun Danu Bratan', 'Bali rice terraces sunrise'],
  goa: ['Goa Palolem beach palm trees', 'Goa beach India sunset'],
  japan: ['Fushimi Inari Taisha torii gates Kyoto', 'Kyoto Higashiyama pagoda'],
  paris: ['Eiffel Tower Paris sunset'],
  jaipur: ['Hawa Mahal Jaipur'],
  delhi: ['India Gate New Delhi'],
  udaipur: ['City Palace Udaipur Lake Pichola'],
  jodhpur: ['Mehrangarh Fort Jodhpur'],
  manali: ['Manali Himachal Pradesh snow mountains', 'Solang Valley Manali'],
  // Bali places
  'p-dps': ['Ngurah Rai International Airport terminal', 'Denpasar airport Bali'],
  'p-seminyak-village': ['Seminyak Bali street shops', 'Jalan Kayu Aya Seminyak'],
  'p-seminyak-beach': ['Seminyak Beach sunset', 'Seminyak beach Bali'],
  'p-uluwatu-temple': ['Pura Luhur Uluwatu temple cliff', 'Uluwatu Temple Bali'],
  'p-kecak': ['Kecak dance Uluwatu', 'Kecak fire dance Bali'],
  'p-jimbaran-bay': ['Jimbaran beach Bali', 'Jimbaran Bay sunset'],
  'p-tegallalang': ['Tegallalang rice terrace Ubud', 'Tegalalang rice terraces'],
  'p-tirta-empul': ['Tirta Empul temple Tampaksiring', 'Tirta Empul holy spring'],
  'p-monkey-forest': ['Ubud Monkey Forest Sanctuary', 'Sacred Monkey Forest Ubud'],
  'p-campuhan': ['Campuhan Ridge Walk Ubud', 'Campuhan Ubud'],
  'p-batu-bolong': ['Batu Bolong beach Canggu', 'Canggu beach Bali surf'],
  'p-tanah-lot': ['Tanah Lot temple sunset', 'Pura Tanah Lot'],
  'p-sanur-beach': ['Sanur beach Bali', 'Sanur beach sunrise'],
  'p-spa': ['Balinese massage spa', 'Bali spa treatment flowers'],
  'p-kuta-market': ['Bali souvenir market stalls', 'Sukawati art market Bali'],
  'p-sidemen': ['Sidemen Karangasem rice terraces', 'Sidemen valley Bali'],
  'p-tukad-cepung': ['Tukad Cepung waterfall', 'Bali waterfall cave'],
  'p-nyang-nyang': ['Nyang Nyang beach Uluwatu', 'Bali secluded beach cliffs'],
  // Bali food (generic dishes — the venues are fictional)
  'r-warung-sari': ['Nasi campur Bali', 'Indonesian nasi campur plate'],
  'r-pagi-kitchen': ['Smoothie bowl breakfast cafe', 'Breakfast cafe table fruit'],
  'r-jimbaran-grill': ['Jimbaran seafood grill dinner beach', 'Grilled seafood beach dinner'],
  'r-kayu-dinner': ['Sate lilit Bali satay', 'Indonesian satay grill'],
  'r-padi-hijau': ['Nasi goreng Indonesian fried rice', 'Gado-gado Indonesian salad'],
  'r-ubud-vegan': ['Vegan buddha bowl', 'Vegetarian bowl healthy food'],
  'r-canggu-cafe': ['Avocado toast brunch', 'Brunch cafe eggs toast'],
  'r-sanur-warung': ['Indonesian street food warung', 'Mie goreng Indonesian noodles'],
  // Goa
  'g-baga': ['Baga Beach Goa', 'Baga beach Goa evening'],
  'g-fort-aguada': ['Fort Aguada lighthouse Goa', 'Aguada Fort Goa'],
  'g-fontainhas': ['Fontainhas Panaji colourful houses', 'Fontainhas Latin Quarter Panjim'],
  'g-palolem': ['Palolem Beach Goa', 'Palolem beach South Goa'],
  'g-shack': ['Goan fish curry rice thali', 'Goa beach shack restaurant'],
  // Japan
  'j-senso-ji': ['Senso-ji Asakusa Kaminarimon', 'Senso-ji temple Tokyo'],
  'j-tsukiji': ['Tsukiji Outer Market Tokyo', 'Tsukiji market seafood'],
  'j-shibuya': ['Shibuya Crossing Tokyo night', 'Shibuya Scramble Crossing'],
  'j-meiji': ['Meiji Shrine torii Tokyo', 'Meiji Jingu'],
  'j-ramen': ['Ramen bowl Japan', 'Omoide Yokocho Shinjuku'],
  'j-teamlab': ['teamLab Planets Tokyo', 'teamLab digital art museum'],
  'j-yanaka': ['Yanaka Ginza shopping street Tokyo', 'Yanaka Tokyo old town'],
  'j-fushimi': ['Fushimi Inari Taisha senbon torii', 'Fushimi Inari Kyoto'],
  'j-nishiki': ['Nishiki Market Kyoto', 'Nishiki Market street Kyoto'],
  'j-kinkaku': ['Kinkaku-ji golden pavilion Kyoto', 'Kinkakuji Kyoto'],
  'j-arashiyama': ['Arashiyama bamboo grove Kyoto', 'Arashiyama Bamboo Forest'],
  'j-gion': ['Gion Kyoto Hanamikoji street', 'Gion district Kyoto'],
  'j-kaiseki': ['Kaiseki ryori Japanese dinner', 'Pontocho alley Kyoto'],
  // Hotels (generic properties — the hotels are fictional): exterior, room, pool
  'h-seminyak-garden1': ['Bali private villa pool garden', 'Balinese villa tropical garden'],
  'h-seminyak-garden2': ['Balinese villa bedroom', 'Bali villa bedroom canopy bed'],
  'h-seminyak-garden3': ['Villa swimming pool Bali', 'Bali villa pool palm'],
  'h-sunset-boutique1': ['Boutique hotel Bali entrance', 'Boutique hotel exterior tropical'],
  'h-sunset-boutique2': ['Hotel room bed interior boutique', 'Hotel bedroom modern'],
  'h-sunset-boutique3': ['Hotel rooftop pool', 'Hotel swimming pool sunset'],
  'h-kayu-homestay1': ['Balinese family compound house', 'Traditional Balinese house gate'],
  'h-kayu-homestay2': ['Bali guesthouse bedroom', 'Traditional bedroom Indonesia bamboo'],
  'h-kayu-homestay3': ['Bali guesthouse garden breakfast', 'Balinese homestay garden'],
  'h-coral-resort1': ['Beach resort Bali', 'Nusa Dua resort beach'],
  'h-coral-resort2': ['Resort hotel room sea view balcony', 'Hotel room ocean view'],
  'h-coral-resort3': ['Resort infinity pool ocean', 'Infinity pool Bali'],
  // Memories (the traveller's "own" Goa photos)
  'goa-1': ['Baga Beach sunset Goa', 'Goa beach sunset'],
  'goa-2': ['Goan thali fish curry', 'Goa seafood plate'],
  'goa-3': ['Fort Aguada Goa ramparts', 'Aguada lighthouse Goa'],
  'goa-4': ['Fontainhas Panjim street', 'Panaji old houses Goa'],
}

// Broader fallbacks, tried after the specific queries above, for subjects Commons has few good photos of.
const FALLBACKS = {
  'p-seminyak-village': ['Seminyak Bali', 'Bali boutique shopping street', 'Jalan Oberoi Seminyak', 'Kuta Bali street'],
  'p-batu-bolong': ['Canggu Bali beach', 'Echo Beach Canggu', 'Berawa beach Bali', 'Bali surfers beach'],
  'p-spa': ['Spa massage Bali', 'Massage therapy tropical spa', 'Balinese massage'],
  'p-kuta-market': ['Bali market', 'Ubud art market', 'Indonesian market souvenirs', 'Bali handicraft shop'],
  'r-pagi-kitchen': ['Breakfast table cafe', 'Smoothie bowl', 'Fruit breakfast', 'Cafe breakfast pancakes'],
  'h-seminyak-garden1': ['Bali villa', 'Balinese villa pool', 'Tropical villa Bali exterior'],
  'h-kayu-homestay3': ['Bali guesthouse', 'Balinese homestay', 'Bali garden breakfast terrace'],
}
Object.assign(FALLBACKS, {
  goa: ['Anjuna beach Goa', 'Vagator beach Goa', 'Goa beach palm trees sunset'],
  manali: ['Manali Himachal Pradesh Rohtang', 'Himachal Pradesh Beas river valley', 'Manali snow peaks Himalaya'],
  'p-tirta-empul': ['Tirta Empul Bali', 'Tampaksiring temple Bali'],
  'p-sanur-beach': ['Sanur Bali beach boats', 'Sanur beach jukung'],
  'r-jimbaran-grill': ['Jimbaran seafood', 'Grilled fish Bali', 'Seafood barbecue Indonesia'],
  'h-sunset-boutique1': ['Boutique hotel Ubud', 'Hotel lobby tropical', 'Hotel facade Bali'],
  'h-sunset-boutique2': ['Hotel room', 'Hotel bedroom double bed', 'Bedroom interior hotel'],
  'h-kayu-homestay2': ['Homestay bedroom', 'Guesthouse bedroom simple', 'Bali hotel room traditional'],
  'h-seminyak-garden1': ['Villa private pool Indonesia', 'Tropical resort villa garden', 'Ubud villa rice field'],
  'p-spa': ['Massage', 'Spa treatment hot stones', 'Thai massage spa'],
})
for (const [key, terms] of Object.entries(FALLBACKS)) QUERIES[key] = [...(QUERIES[key] ?? []), ...terms]

// Seeds that reuse another seed's photo.
const ALIASES = {
  'bali-cover': 'bali', 'goa-cover': 'goa',
  'pub-japan': 'j-fushimi', 'pub-bali': 'p-tanah-lot', 'pub-goa': 'g-palolem', 'pub-bali-budget': 'p-batu-bolong',
  'pub-tokyo-4': 'j-shibuya', 'pub-goa-food': 'g-shack', 'pub-ubud-slow': 'p-campuhan', 'pub-kyoto-3': 'j-kinkaku',
}

const BAD_TITLE = /\b(map|logo|flag|diagram|plan|coat of arms|locator|signage|poster|stamp|icon|svg|chart|screenshot|drawing|painting|illustration|engraving|postcard|lithograph|stub|performer|portrait|selfie|statue|drummer|bus|tour|club|visit|restaurant room|Mississippi|MS|wedding|protest|demonstration)\b/i
const OK_LICENSE = /^(CC0|Public domain|PD|CC[ -]BY(-SA)?[ -]\d)/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const strip = (html = '') => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim()
const pathFor = (title) => {
  const name = title.replace(/^File:/, '').replace(/ /g, '_')
  const h = createHash('md5').update(name).digest('hex')
  return `${h[0]}/${h.slice(0, 2)}/${name}`
}

async function search(term, attempt = 0) {
  const p = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: `${term} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '20',
    prop: 'imageinfo', iiprop: 'size|mime|extmetadata|url', iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|ImageDescription|Credit',
  })
  const res = await fetch(`${API}?${p}`, { headers: { 'User-Agent': UA } })
  if (res.status === 429 && attempt < 6) {
    // Commons rate-limits anonymous clients; back off and retry rather than failing the item.
    const wait = Number(res.headers.get('retry-after')) * 1000 || 8000 * (attempt + 1)
    console.log(`  (rate limited; waiting ${Math.round(wait / 1000)}s)`)
    await sleep(wait)
    return search(term, attempt + 1)
  }
  if (!res.ok) throw new Error(`Commons ${res.status}`)
  const json = await res.json()
  return (json.query?.pages ?? []).sort((a, b) => a.index - b.index)
}

function acceptable(page, used) {
  const info = page.imageinfo?.[0]
  if (!info || info.mime !== 'image/jpeg' || BAD_TITLE.test(page.title) || used.has(page.title)) return null
  const { width, height } = info
  const ratio = width / height
  if (width < 1600 || height < 1000 || ratio < 1.25 || ratio > 1.9) return null
  const meta = info.extmetadata ?? {}
  const license = strip(meta.LicenseShortName?.value)
  if (!OK_LICENSE.test(license)) return null
  return {
    title: page.title.replace(/^File:/, ''), path: pathFor(page.title), width, height, license,
    licenseUrl: meta.LicenseUrl?.value ?? '', author: strip(meta.Artist?.value) || 'Unknown', page: info.descriptionurl,
  }
}

// Photos chosen by eye (after the search picks looked wrong on a contact sheet). These always win over search.
const PINNED = {
  goa: 'Cola Beach Bay South Goa Jan19 DSC06186.jpg',
  'p-spa': 'Lounge at the Spa at Silver Legacy - 2021-11-14 - Sarah Stierch 01.jpg',
  'h-seminyak-garden1': 'Le Meridien Nirwana Bali Villa private pool (3031083843).jpg',
  'h-kayu-homestay2': 'Ibis Styles Benoa room (11267203584).jpg',
}

async function fetchByTitle(title, attempt = 0) {
  const p = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', titles: `File:${title}`,
    prop: 'imageinfo', iiprop: 'size|mime|extmetadata|url', iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist',
  })
  const res = await fetch(`${API}?${p}`, { headers: { 'User-Agent': UA } })
  if (res.status === 429 && attempt < 6) { await sleep(10000 * (attempt + 1)); return fetchByTitle(title, attempt + 1) }
  if (!res.ok) throw new Error(`Commons ${res.status}`)
  return (await res.json()).query?.pages?.[0]
}

// Resumable: keep what an earlier run already found (delete src/lib/stock/photos.json to start over).
const OUT = new URL('../src/lib/stock/photos.json', import.meta.url)
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).photos : {}
const used = new Set(Object.values(out).map((p) => 'File:' + p.title))
const missing = []
for (const [key, title] of Object.entries(PINNED)) {
  const page = await fetchByTitle(title)
  const pinned = page && acceptable(page, new Set())
  if (!pinned) { console.log(`!! pinned photo for ${key} is not usable: ${title}`); continue }
  out[key] = pinned
  used.add('File:' + pinned.title)
  console.log(`pin  ${key.padEnd(20)} ${pinned.title}  [${pinned.license}]`)
  await sleep(1500)
}
for (const [key, terms] of Object.entries(QUERIES)) {
  if (out[key]) continue
  let found = null
  for (const term of terms) {
    try {
      for (const page of await search(term)) {
        found = acceptable(page, used)
        if (found) break
      }
    } catch (e) { console.error(`  ! ${key} "${term}": ${e.message}`) }
    await sleep(1500)
    if (found) break
  }
  if (found) {
    used.add('File:' + found.title)
    out[key] = found
    console.log(`ok   ${key.padEnd(20)} ${found.title}  [${found.license}]`)
    save() // after every hit, so an interruption loses nothing
  } else { missing.push(key); console.log(`MISS ${key}`) }
}
save()
const stillMissing = Object.keys(QUERIES).filter((k) => !out[k])
console.log(`\n${Object.keys(out).length} found, ${stillMissing.length} missing: ${stillMissing.join(', ') || '-'}`)

function save() {
  writeFileSync(OUT, JSON.stringify({ photos: out, aliases: ALIASES }, null, 1) + '\n')
}
