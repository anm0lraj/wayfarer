// One-off curation of the card photos: for every seeded image id (destinations, places, restaurants, hotels, trip and
// public-trip covers, seeded memories) pick a freely licensed photo on Wikimedia Commons, self-host it as WebP at two
// widths in public/photos and record the credit in src/lib/photos/photos.json (shown on /credits).
//
//   node scripts/curate-photos.mjs                       pick and encode every id that has no photo yet (resumable)
//   node scripts/curate-photos.mjs --only a,b            redo these ids (e.g. after changing PINNED or a query)
//   node scripts/curate-photos.mjs --candidates a,b --out x.html [--per 8]   contact sheet of search candidates, to choose pins
//   node scripts/curate-photos.mjs --sheet x.html        contact sheet of the chosen photos, to review them
//   node scripts/curate-photos.mjs --reencode            re-encode the chosen photos from the cached downloads (no network)
//
// Node 18–22 fetch ignores HTTPS_PROXY; behind a proxy run with NODE_USE_ENV_PROXY=1 (Node 22.21+).
// Encoding uses Playwright's Chromium (canvas → WebP); set PW_EXECUTABLE to a Chromium binary if Playwright's own
// download is missing. Commons answers 429 without a descriptive User-Agent and rate-limits bursts, so requests are
// about a second apart and back off. Search ranking is not to be trusted blindly: review the sheet, then pin files.
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public/photos')
const JSON_PATH = join(ROOT, 'src/lib/photos/photos.json')
const CACHE = join(ROOT, '.cache/curate-photos') // downloaded thumbnails and API answers (not committed)
const API = 'https://commons.wikimedia.org/w/api.php'
// No email or personal data here: a descriptive agent is all Commons asks for.
const UA = 'WayfarerPhotoCurator/1.0 (open-source travel app demo; one-off curation script)'
const WIDTHS = [640, 1280]
// WebP quality per width: the large file carries most of the bytes, and at 1280 px a little less detail doesn't show.
const QUALITY = { 640: 0.55, 1280: Number(process.env.WEBP_QUALITY) || 0.4 }

/** id → Commons search. Hotels are fictional: generic, unbranded resort/villa/room photos from the region only. */
const QUERIES = {
  // destinations
  bali: 'Bali rice terraces landscape', goa: 'Goa beach palm trees', japan: 'Mount Fuji pagoda Chureito',
  paris: 'Eiffel Tower blue sky', jaipur: 'Hawa Mahal Jaipur', delhi: 'India Gate New Delhi', udaipur: 'Udaipur Lake Pichola City Palace',
  jodhpur: 'Mehrangarh Fort Jodhpur', manali: 'Manali Himachal',
  // Bali places
  'p-dps': 'Ngurah Rai International Airport terminal', 'p-seminyak-village': 'Seminyak street Bali', 'p-seminyak-beach': 'Seminyak beach',
  'p-uluwatu-temple': 'Pura Luhur Uluwatu', 'p-kecak': 'Kecak dance Uluwatu', 'p-jimbaran-bay': 'Jimbaran beach Bali',
  'p-tegallalang': 'Tegallalang rice terraces', 'p-tirta-empul': 'Tirta Empul', 'p-monkey-forest': 'Ubud Monkey Forest temple',
  'p-campuhan': 'Campuhan ridge walk Ubud', 'p-batu-bolong': 'Canggu beach Bali', 'p-tanah-lot': 'Tanah Lot temple',
  'p-sanur-beach': 'Sanur Beach', 'p-spa': 'Bali spa', 'p-kuta-market': 'Bali market stall',
  'p-sidemen': 'Mount Agung rice field', 'p-tukad-cepung': 'Tukad Cepung', 'p-nyang-nyang': 'Nyang Nyang',
  // Bali food: the dish or cuisine each place is known for
  'r-warung-sari': 'nasi campur', 'r-pagi-kitchen': 'smoothie bowl', 'r-jimbaran-grill': 'grilled seafood Bali',
  'r-kayu-dinner': 'sate lilit', 'r-padi-hijau': 'bebek betutu', 'r-ubud-vegan': 'gado-gado', 'r-canggu-cafe': 'brunch avocado toast eggs',
  'r-sanur-warung': 'ikan bakar',
  // hotels: 1 = outside, 2 = room, 3 = pool. Search mostly finds real named hotels, so these ask for generic scenes.
  'h-seminyak-garden1': 'Ubud villa', 'h-seminyak-garden2': 'Bed in hotel room', 'h-seminyak-garden3': 'swimming pool palm trees',
  'h-sunset-boutique1': 'Balinese house', 'h-sunset-boutique2': 'Bed in hotel room', 'h-sunset-boutique3': 'outdoor swimming pool tropical',
  'h-kayu-homestay1': 'Balinese Traditional House', 'h-kayu-homestay2': 'wooden bedroom bed', 'h-kayu-homestay3': 'swimming pool jungle',
  'h-coral-resort1': 'beach bungalows palm trees', 'h-coral-resort2': 'hotel room sea view', 'h-coral-resort3': 'infinity pool ocean',
  // trip covers and public trips
  'bali-cover': 'Padang Padang beach', 'goa-cover': 'Agonda beach', 'pub-japan': 'Kyoto street Yasaka pagoda', 'pub-bali': 'Ubud rice field Bali',
  'pub-goa': 'Anjuna beach Goa', 'pub-bali-budget': 'Bali beach boats', 'pub-tokyo-4': 'Tokyo Tower daytime', 'pub-goa-food': 'Goan fish curry',
  'pub-ubud-slow': 'Ubud Bali jungle', 'pub-kyoto-3': 'Kyoto temple autumn',
  // Goa and Japan places
  'g-baga': 'Baga beach Goa', 'g-fort-aguada': 'Fort Aguada Goa', 'g-fontainhas': 'Fontainhas Panaji', 'g-palolem': 'Palolem beach',
  'g-shack': 'beach shack Goa', 'j-senso-ji': 'Senso-ji Asakusa', 'j-tsukiji': 'Tsukiji sushi', 'j-shibuya': 'Shibuya crossing',
  'j-meiji': 'Meiji Shrine torii', 'j-ramen': 'tonkotsu ramen', 'j-yanaka': 'Yanaka Ginza',
  'j-fushimi': 'Fushimi Inari torii', 'j-nishiki': 'Nishiki Market Kyoto', 'j-kinkaku': 'Kinkaku-ji', 'j-arashiyama': 'Arashiyama bamboo grove',
  'j-gion': 'Hanamikoji Gion', 'j-kaiseki': 'kaiseki ryori',
  // No j-teamlab: its photos show the artworks themselves (still under copyright, and Japan has no freedom of panorama
  // for art), or else a plain warehouse. It keeps its illustration.
  // seeded memories (Goa trip)
  'goa-1': 'Baga beach sunset Goa', 'goa-2': 'fish thali', 'goa-3': 'Aguada lighthouse', 'goa-4': 'Panaji Latin quarter houses',
}

/** Hand-picked files for ids that search gets wrong (exact Commons titles, with "File:"). */
const PINNED = {
  jodhpur: 'File:Mehrangarh Fort 2, Jodhpur, Rajasthan, India.jpg', // search: a hazy, washed-out city panorama
  manali: 'File:Snow Rohtang Range Manali May24 A7CR 00128.jpg', // search: a dark mountain road
  paris: 'File:Eiffel Tower in 2022 05.jpg', // search: a night shot
  delhi: 'File:India Gate, New Delhi by Shagil Kannur 6.jpg', // search: a stage in front of the gate
  'p-kecak': 'File:Kecak fire dance at sunset.jpg', // the wide view, not close-ups of performers
  'p-sanur-beach': 'File:Morning in Sanur Beach, Bali.jpg', // search: a statue near the beach
  'p-tirta-empul': 'File:Pura Tirta Empul Bali 20120828b.jpg', // the spouts, not bathers
  'p-uluwatu-temple': 'File:Kuta Bali Indonesia Pura-Luhur-Uluwatu-03.jpg', // the temple on its cliff
  'p-nyang-nyang': 'File:Nyangnyangbeach.jpg', // search: a dark sunset, then a Senegalese festival of the same name
  'p-tukad-cepung': 'File:Tukad Cepung Waterfall (52462237566).jpg', // portrait only; the centre crop keeps the falls
  'p-spa': 'File:Mansion Resort and Spa in Bali - 31.jpg', // garden carvings and frangipani; search: spa resorts in Malaysia
  'p-kuta-market': 'File:Bali fruit stall 2.JPG',
  'r-warung-sari': 'File:Nasi campur, Ubud, Indonesia.jpg',
  'r-pagi-kitchen': 'File:Green smoothie bowl with berries and seeds.jpg',
  'r-jimbaran-grill': 'File:Ikan kakap bakar madu.JPG', // grilled snapper; search: a chilli relish
  'r-kayu-dinner': 'File:Nasi Campur Ayam Bali.jpg', // with sate lilit
  'r-padi-hijau': 'File:Bebek tutu.jpg',
  'r-ubud-vegan': 'File:Gado-gado - Bali 2025-09-25.jpg',
  'r-canggu-cafe': 'File:NOT avocado on toast with fried egg - Black Mocha 2025-08-12.jpg',
  'r-sanur-warung': 'File:Gurame bakar kecap 2.JPG',
  'h-kayu-homestay1': 'File:Balinese Traditional House.jpg',
  'h-kayu-homestay2': 'File:Bed in hotel room 4.jpg',
  'h-sunset-boutique2': 'File:Bed in hotel room 2.jpg',
  'goa-1': 'File:Baga beach sun set view with aura.jpg',
  'goa-2': 'File:Fish Curry Rice Thali (25910628531).jpg', // search: an Assamese thali
  'goa-3': 'File:Aguada sunset.jpg',
  'goa-4': 'File:Streets of Fontainhas, Panaji (02).jpg',
  'bali-cover': 'File:Sunset, Kuta, Bali, Indonesia, 20220825 1755 0879.jpg',
  'goa-cover': 'File:Mandrem Beach at sunset 2, Mandrem, Goa, India.jpg',
  'pub-japan': 'File:Yasaka-dori early morning with street lanterns and the Tower of Yasaka (Hokan-ji Temple), Kyoto, Japan.jpg',
  'pub-bali': 'File:Rice fields, Bedulu near Ubud, Bali, Indonesia, 20220824 1039 0665.jpg',
  'pub-goa': 'File:Anjuna Beach 25012016.jpg',
  'pub-bali-budget': 'File:Jerman Beach, Kuta, Bali, Indonesia, 20220825 1329 0831.jpg',
  'pub-tokyo-4': 'File:Tokyo Tower, Minato City.jpg',
  'pub-goa-food': 'File:Goan typical meal -- fish, curry and rice.jpg',
  'pub-ubud-slow': 'File:500px photo (137035547).jpeg', // search: a named hotel
  'pub-kyoto-3': 'File:Kiyomizu-dera, Kyoto, November 2016 -01.jpg',
  'g-baga': 'File:Baga Beach-Goa India-Andres Larin.jpg',
  'g-fort-aguada': 'File:Fort Aguada, Goa, India.jpg', // search: a resort from above
  'g-fontainhas': 'File:Streets of Fontainhas, Panaji (03).jpg',
  'g-palolem': 'File:Palolem Beach, South Goa.jpg',
  'g-shack': 'File:Sunloungers at Palolem beach.jpg', // shack loungers; search: named shacks and their signs
  'j-senso-ji': 'File:Senso-ji Temple @ Asakusa (13824517393).jpg',
  'j-tsukiji': 'File:Tsukiji Outer Market -06.jpg',
  'j-shibuya': 'File:Tokyo Shibuya Scramble Crossing 2018-10-09.jpg',
  'j-ramen': 'File:Tonkotsu ramen in Tokyo.jpg',
  'j-yanaka': 'File:Yanaka Ginza 2.jpg',
  'j-fushimi': 'File:Torii path with lantern at Fushimi Inari Taisha Shrine, Kyoto, Japan.jpg',
  'j-nishiki': 'File:Tsukemono shop by collinox in Nishiki Ichiba, Kyoto.jpg',
  'j-kinkaku': 'File:Water reflection of Kinkaku-ji Temple a sunny day, Kyoto, Japan.jpg',
  'j-arashiyama': 'File:Bamboo Forest, Arashiyama, Kyoto, Japan.jpg',
  'j-kaiseki': 'File:IMG-2023-12-2-kaisekifuuteishoku.jpg',
  'j-meiji': 'File:Meiji Shrine Minami-tamagaki-torii 2023-01-26.jpg', // search: the baseball stadium
  'j-gion': 'File:JP 日本 Japan 京都 Kyoto Higashiyama-ku Gion 花見小路通 Hanamikoji Dori 10am morning June 2026 N13P 21.jpg',
  // Hotels: generic scenes whose files don't name a real hotel.
  'h-seminyak-garden3': 'File:Swimming Pool in a hotel in Tamil Nadu 03.jpg',
  'h-sunset-boutique1': 'File:Balinese Traditional House Shrines 1452.jpg',
  'h-kayu-homestay3': 'File:Sigiriya resort5.jpg',
  'h-coral-resort1': 'File:-bali resort. Tanning at the beach (6288105043).jpg',
  'h-coral-resort3': 'File:Endless Water (Unsplash).jpg',
  'h-seminyak-garden1': 'File:Downtown Ubud Bali Indonesia - panoramio (26).jpg',
  'h-seminyak-garden2': 'File:Bed in hotel room 5.jpg',
  'h-sunset-boutique3': 'File:GX-213 - Tropical palms sway beside a serene pool leading to a white villa with a curved staircase under clear blue skies.jpg',
  'h-coral-resort2': 'File:Bed in hotel room 3.jpg',
}

const OK_LICENCE = /^(cc0|public domain|pd\b|pd-|cc[- ]by(-sa)?[- ]\d)/i
const BAD_LICENCE = /\b(nc|nd)\b|non-?commercial|no ?deriv|fair use/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const strip = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
let last = 0

/**
 * GET with a request every two seconds at most, and exponential back-off on 429/5xx (honours Retry-After, up to ten
 * minutes: retrying sooner only extends the block). `patient: false` gives up on the first 429, for thumbnails that have
 * another size to try.
 */
async function get(url, as = 'json', { patient = true } = {}) {
  for (let attempt = 0; ; attempt++) {
    const wait = last + 2000 - Date.now()
    if (wait > 0) await sleep(wait)
    last = Date.now()
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
    if (res.ok) return as === 'json' ? res.json() : Buffer.from(await res.arrayBuffer())
    if ((res.status === 429 || res.status >= 500) && attempt < 6 && patient) {
      const after = Number(res.headers.get('retry-after')) || 0
      const ms = Math.min(Math.max(after * 1000, 2000 * 2 ** attempt), 600_000)
      console.warn(`  ${res.status}, retrying in ${Math.round(ms / 1000)} s`)
      await sleep(ms)
      continue
    }
    throw Object.assign(new Error(`${res.status} for ${url}`), { status: res.status })
  }
}

const IIPROP = 'iiprop=url|size|mime|extmetadata&iiurlwidth=1280&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl|UsageTerms|ObjectName|Categories|NonFree|Restrictions'

function cached(name, fn) {
  const file = join(CACHE, name.replace(/[^\w.-]+/g, '_').slice(0, 150) + '.json')
  if (existsSync(file)) return Promise.resolve(JSON.parse(readFileSync(file, 'utf8')))
  return fn().then((v) => (writeFileSync(file, JSON.stringify(v)), v))
}

const pagesOf = (json) => Object.values(json?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))

async function search(query) {
  const url = `${API}?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=30&gsrsearch=${encodeURIComponent(query + ' filetype:bitmap')}&prop=imageinfo&${IIPROP}`
  return pagesOf(await cached(`search ${query}`, () => get(url)))
}

async function fileInfo(title) {
  const url = `${API}?action=query&format=json&titles=${encodeURIComponent(title)}&prop=imageinfo&${IIPROP}`
  const page = pagesOf(await cached(`file ${title}`, () => get(url)))[0]
  if (!page?.imageinfo) throw new Error(`No such file: ${title}`)
  return page
}

/** Credit fields, or a reason the file can't be used. */
function describe(page) {
  const info = page.imageinfo?.[0]
  if (!info) return { reject: 'no image info' }
  const m = info.extmetadata ?? {}
  const licence = strip(m.LicenseShortName?.value)
  const author = strip(m.Artist?.value).replace(/^(\W+)/, '')
  if (m.NonFree?.value === 'true' || BAD_LICENCE.test(licence) || !OK_LICENCE.test(licence)) return { reject: `licence ${licence || '?'}` }
  if (!author) return { reject: 'no author' }
  if (!/jpeg|png/.test(info.mime)) return { reject: info.mime }
  let licenceUrl = m.LicenseUrl?.value
  if (!licenceUrl && /cc0/i.test(licence)) licenceUrl = 'https://creativecommons.org/publicdomain/zero/1.0/'
  if (!licenceUrl && /public domain|^pd/i.test(licence)) licenceUrl = 'https://commons.wikimedia.org/wiki/Commons:Copyright_tags#Public_domain'
  if (!licenceUrl) return { reject: 'no licence url' }
  return {
    file: page.title, title: strip(m.ObjectName?.value) || page.title.replace(/^File:/, '').replace(/\.\w+$/, ''), author: author.slice(0, 120), licence, licenceUrl,
    // Thumbnails are served from upload.wikimedia.org too (the API names thumb.wikimedia.org, which may be blocked).
    source: info.descriptionurl, thumb: (info.thumburl ?? info.url).replace('//thumb.wikimedia.org/', '//upload.wikimedia.org/').replace(/\?.*$/, '').replace(/\/\d+px-/, '/1280px-'), width: info.width, height: info.height,
    quality: /Quality images|Featured pictures|Valued images/.test(m.Categories?.value ?? ''),
  }
}

/** Search candidates that pass the licence and size rules, best first: big landscape files, Quality/Featured ones ahead. */
async function candidates(id, taken) {
  const pages = await search(QUERIES[id] ?? id)
  const ok = []
  pages.forEach((p, rank) => {
    const d = describe(p)
    if (d.reject || taken.has(d.file)) return
    if (d.width < 1600 || d.width / d.height < 1.25 || d.width / d.height > 2) return // landscape (not panoramic), at least 1600 px wide
    ok.push({ ...d, score: rank - (d.quality ? 6 : 0) })
  })
  return ok.sort((a, b) => a.score - b.score)
}

let browser
async function encoder() {
  browser ??= await chromium.launch({ executablePath: process.env.PW_EXECUTABLE || undefined, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  return page
}

/**
 * Download the 1280 px thumbnail once (kept in the cache, so --reencode needs no network). It is requested from Commons'
 * own thumb.php at a standard width: upload.wikimedia.org answers 429 for minutes at a time when new renders come from
 * a shared address. Requests stay a few seconds apart, and a 429 is waited out like any other.
 */
async function download(id, d) {
  const src = join(CACHE, `${id}.jpg`)
  const key = join(CACHE, `${id}.src`)
  if (existsSync(src) && existsSync(key) && readFileSync(key, 'utf8') === d.thumb) return
  await sleep(3000)
  writeFileSync(src, await get(`https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(d.file.replace(/^File:/, ''))}&w=1280`, 'buffer'))
  writeFileSync(key, d.thumb)
}

/** Crop the downloaded file to between 16:10 and 2:1 and write WebP at each width. Returns the size and bytes per width. */
async function encode(id) {
  const src = join(CACHE, `${id}.jpg`)
  const page = await encoder()
  const dataUrl = `data:image/jpeg;base64,${readFileSync(src).toString('base64')}`
  const out = await page.evaluate(async ({ dataUrl, widths, quality }) => { // (the browser sniffs PNG behind the JPEG label)
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0
    if (sw / sh > 2) { sw = sh * 2; sx = (img.naturalWidth - sw) / 2 }
    if (sw / sh < 1.6) { sh = sw / 1.6; sy = (img.naturalHeight - sh) / 2 }
    const res = []
    for (const w of widths) {
      const c = document.createElement('canvas')
      c.width = w
      c.height = Math.round((w * sh) / sw)
      const ctx = c.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
      const blob = await new Promise((r) => c.toBlob(r, 'image/webp', quality[w]))
      res.push({ w, h: c.height, data: [...new Uint8Array(await blob.arrayBuffer())] })
    }
    return res
  }, { dataUrl, widths: WIDTHS, quality: QUALITY })
  await page.close()
  for (const o of out) writeFileSync(join(OUT_DIR, `${id}-${o.w}.webp`), Buffer.from(o.data))
  return { w: out.at(-1).w, h: out.at(-1).h, bytes: out.map((o) => o.data.length) }
}

function sheetHtml(rows, heading) {
  const cell = (r) => `<figure><img src="${r.img}" loading="lazy"><figcaption><b>${r.id}</b><br>${r.title}<br><i>${r.licence} · ${r.width ?? ''}${r.note ? ' · ' + r.note : ''}</i></figcaption></figure>`
  return `<!doctype html><meta charset="utf-8"><title>${heading}</title><style>body{font:12px system-ui;margin:12px;background:#fff}h1{font-size:16px}
main{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}figure{margin:0}img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block;border-radius:4px}
figcaption{line-height:1.3;margin-top:3px;word-break:break-word}</style><h1>${heading}</h1><main>${rows.map(cell).join('')}</main>`
}

async function main() {
  const args = process.argv.slice(2)
  const flag = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] ?? '' }
  mkdirSync(CACHE, { recursive: true })
  mkdirSync(OUT_DIR, { recursive: true })
  mkdirSync(dirname(JSON_PATH), { recursive: true })
  const photos = existsSync(JSON_PATH) ? JSON.parse(readFileSync(JSON_PATH, 'utf8')) : {}

  if (flag('--sheet') !== undefined) {
    const rows = Object.entries(photos).map(([id, p]) => ({ id, img: `file://${join(OUT_DIR, `${id}-640.webp`)}`, title: p.title, licence: p.licence, width: p.width }))
    writeFileSync(flag('--sheet'), sheetHtml(rows, `Chosen photos (${rows.length})`))
    return console.log(`Wrote ${flag('--sheet')}`)
  }
  if (flag('--candidates') !== undefined) {
    // Small thumbnails are downloaded here (rate-limited) rather than hot-linked, so the sheet doesn't trip Commons' limits.
    const out = flag('--out') ?? join(CACHE, 'candidates.html')
    const rows = []
    for (const id of flag('--candidates').split(',')) {
      for (const d of (await candidates(id, new Set())).slice(0, Number(flag('--per')) || 8)) {
        const thumb = join(CACHE, 'thumbs', d.file.replace(/[^\w.-]+/g, '_') + '.jpg')
        mkdirSync(dirname(thumb), { recursive: true })
        try {
          if (!existsSync(thumb)) writeFileSync(thumb, await get(d.thumb.replace(/\/1280px-/, '/330px-'), 'buffer'))
        } catch (e) {
          console.warn(`${id}: ${e.message}`)
          continue
        }
        rows.push({ id, img: `file://${thumb}`, title: d.file, licence: d.licence, width: d.width, note: d.quality ? 'QI' : '' })
        writeFileSync(out, sheetHtml(rows, 'Candidates')) // after each one, so a slow run can be looked at part-way
      }
    }
    return console.log(`Wrote ${out}`)
  }

  if (args.includes('--reencode')) {
    // Re-encode every chosen photo from the cached download (after changing QUALITY or the crop).
    for (const id of Object.keys(photos)) {
      const enc = await encode(id)
      Object.assign(photos[id], { width: enc.w, height: enc.h })
      console.log(`${id}: ${enc.bytes.map((b) => Math.round(b / 1024) + ' KB').join(' / ')}`)
    }
    writeFileSync(JSON_PATH, JSON.stringify(sortKeys(photos), null, 2) + '\n')
    return browser?.close()
  }

  const only = flag('--only')?.split(',').filter(Boolean)
  const ids = only ?? Object.keys(QUERIES).filter((id) => !photos[id])
  for (const id of ids) {
    const taken = new Set(Object.entries(photos).filter(([k]) => k !== id).map(([, p]) => p.file))
    try {
      let d
      if (PINNED[id]) {
        d = describe(await fileInfo(PINNED[id]))
        if (d.reject) throw new Error(`pinned ${PINNED[id]}: ${d.reject}`)
        if (taken.has(d.file)) throw new Error(`pinned ${PINNED[id]} is already used by another id`)
      } else {
        d = (await candidates(id, taken))[0]
        if (!d) throw new Error('no usable search result: pin a file')
      }
      await download(id, d)
      const enc = await encode(id)
      photos[id] = {
        file: d.file, title: d.title, author: d.author, licence: d.licence, licenceUrl: d.licenceUrl, source: d.source, width: enc.w, height: enc.h,
      }
      writeFileSync(JSON_PATH, JSON.stringify(sortKeys(photos), null, 2) + '\n') // after each id, so a rerun resumes
      console.log(`${id}: ${d.file} (${d.licence}) ${enc.bytes.map((b) => Math.round(b / 1024) + ' KB').join(' / ')}`)
    } catch (e) {
      console.warn(`${id}: ${e.message}`)
    }
  }
  await browser?.close()
}

const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)))

await main()
