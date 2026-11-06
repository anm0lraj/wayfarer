/**
 * Generated, licence-free illustrations: the default image for every destination, place, hotel and trip. A seed picks a
 * scene (coast, temple, terraces, mountains, city, food, hotel) and one of a few curated palettes, so the same place
 * always looks the same, any new place gets a card with no asset to source and no credit to give, and the whole app
 * shares one art direction: soft light, layered depth, quiet silhouettes. The traveller's own photos replace these
 * wherever they exist (trip cover, memories).
 */
function hash(s: string): number {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Small seeded random generator, so a seed always draws the same hills. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Scene = 'coast' | 'temple' | 'shrine' | 'fort' | 'terraces' | 'mountains' | 'city' | 'food' | 'hotel'

/**
 * First match wins, so the more specific scenes come first. The seed is usually an id (`p-uluwatu-temple`, `delhi`,
 * `h-coral-resort1`); seeded memories also pass their caption, so "Fish thali" draws food and "Painted houses" a town.
 */
const KEYWORDS: Array<[Scene, RegExp]> = [
  ['food', /^(r-|g-shack|j-ramen|j-tsukiji|j-nishiki|j-kaiseki)|restaurant|cafe|warung|thali|food|dinner|lunch|breakfast/],
  ['hotel', /^h-|hotel|villa|resort|homestay/],
  ['shrine', /senso|fushimi|meiji|kinkaku|gion|torii|shrine|kyoto|pagoda/],
  ['coast', /aguada|lighthouse/],
  ['fort', /delhi|jaipur|jodhpur|udaipur|agra|rajasthan|fort|palace/],
  ['terraces', /tegallalang|sidemen|campuhan|monkey|tukad|ubud|terrace|rice/],
  ['temple', /temple|uluwatu|tirta|tanah|kecak|pura/],
  ['mountains', /^japan$|pub-japan|manali|himalaya|mountain|arashiyama|valley/],
  ['city', /paris|tokyo|shibuya|market|village|fontainhas|yanaka|teamlab|city|houses|town|street/],
  ['coast', /bali|beach|bay|goa|sanur|seminyak|jimbaran|batu|palolem|baga|coast|cover|sunset|lighthouse/],
]

export function sceneFor(seed: string, h = 0): Scene {
  const s = seed.toLowerCase()
  for (const [scene, re] of KEYWORDS) if (re.test(s)) return scene
  return (['coast', 'mountains', 'city', 'terraces'] as const)[h % 4]!
}

// ---------- colour ----------

const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number]
/** Blend two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${f(ar, br)}${f(ag, bg)}${f(ab, bb)}`
}

interface Palette {
  /** Sky from the top to the horizon. */
  sky: [string, string, string]
  sun: string
  /** Darkest silhouette colour. */
  ink: string
  /** Warm accent used for lights, flowers and food. */
  accent: string
}

const GOLDEN: Palette = { sky: ['#2a3a6b', '#e58a6c', '#ffd592'], sun: '#fff1d0', ink: '#1c2236', accent: '#ffb347' }
const ROSE: Palette = { sky: ['#3b2d62', '#d6628f', '#ffb98f'], sun: '#ffe8d9', ink: '#2a2040', accent: '#ff8fa3' }
const DAWN: Palette = { sky: ['#1f5062', '#62b5aa', '#f7e4b5'], sun: '#fffbe6', ink: '#13313a', accent: '#f4a259' }
const BLUE: Palette = { sky: ['#0f1a3f', '#3d5ba8', '#f1aa8b'], sun: '#ffe9d0', ink: '#0b1230', accent: '#ffc46b' }
const NOON: Palette = { sky: ['#1b6ca8', '#5bb8da', '#fde9c3'], sun: '#fffdf2', ink: '#0f3a4a', accent: '#ff9f68' }
const SAGE: Palette = { sky: ['#47666a', '#a8c2a6', '#f6e9c9'], sun: '#fffaf0', ink: '#22382f', accent: '#e9b872' }
const DUSK: Palette = { sky: ['#1d2b4f', '#7a5c8f', '#e9a17a'], sun: '#ffe2c4', ink: '#151a2e', accent: '#ffb86b' }
const SAND: Palette = { sky: ['#5b7fa6', '#e9b98a', '#fbe6c2'], sun: '#fff6e0', ink: '#3a2a26', accent: '#e07a3f' }

const PALETTES: Record<Scene, Palette[]> = {
  coast: [GOLDEN, ROSE, NOON, DAWN, DUSK],
  temple: [GOLDEN, ROSE, BLUE, DUSK],
  shrine: [DAWN, SAGE, ROSE, DUSK],
  fort: [SAND, GOLDEN, DUSK, ROSE],
  terraces: [DAWN, SAGE, GOLDEN, NOON],
  mountains: [BLUE, SAGE, DAWN, ROSE],
  city: [ROSE, BLUE, GOLDEN, DUSK],
  food: [GOLDEN, ROSE, DAWN, SAGE],
  hotel: [BLUE, ROSE, GOLDEN, NOON, DUSK],
}

// ---------- drawing helpers ----------

interface Ctx {
  w: number
  ht: number
  r: () => number
  p: Palette
  h: number
  /** Sun x position. */
  sx: number
  /** The lower-cased seed, for scenes with keyword-chosen variants. */
  seed: string
}

/** Lamp-light yellow for windows and lanterns, whatever the sky palette. */
const WARM = '#ffc86b'

const n = (x: number) => Math.round(x * 10) / 10

/** Sky gradient, a soft sun with glow, and a few thin clouds. */
function sky(c: Ctx, sunY: number): string {
  const { w, ht, p, sx, r } = c
  const clouds = [0.16, 0.27, 0.36]
    .map((y, i) => `<ellipse cx="${n(w * (0.15 + r() * 0.7))}" cy="${n(ht * (y + r() * 0.04))}" rx="${n(w * (0.12 + i * 0.04 + r() * 0.06))}" ry="${n(ht * 0.012)}" fill="${p.sky[2]}" opacity="${0.2 + i * 0.05}"/>`)
    .join('')
  return (
    `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".58" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[2]}"/></linearGradient>` +
    `<radialGradient id="gl"><stop offset="0" stop-color="${p.sun}" stop-opacity=".95"/><stop offset=".3" stop-color="${p.sun}" stop-opacity=".4"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="${w}" height="${ht}" fill="url(#sk)"/>${clouds}` +
    `<circle cx="${n(sx)}" cy="${n(sunY)}" r="${n(ht * 0.6)}" fill="url(#gl)"/><circle cx="${n(sx)}" cy="${n(sunY)}" r="${n(ht * 0.055)}" fill="${p.sun}"/>`
  )
}

/** Colour of layer i of count, from hazy and far (0) to dark and near (count - 1). */
function layerColor(c: Ctx, i: number, count: number, tint = c.p.sky[1]): string {
  const t = count > 1 ? i / (count - 1) : 1
  return mix(mix(tint, c.p.ink, 0.22 + 0.72 * t), c.p.sky[2], (1 - t) * 0.5)
}

/** A rolling ridge (smooth curve) filled to the bottom edge. */
function hills(c: Ctx, base: number, amp: number, count: number, fill: string, opacity = 1): string {
  const { w, ht, r } = c
  const pts = Array.from({ length: count + 1 }, (_, i) => [(i * w) / count, ht * base - r() * amp * ht] as const)
  let d = `M0 ${ht} L0 ${n(pts[0]![1])}`
  for (let i = 1; i <= count; i++) {
    const [x0, y0] = pts[i - 1]!
    const [x1, y1] = pts[i]!
    const cx = (x0 + x1) / 2
    d += ` C${n(cx)} ${n(y0)} ${n(cx)} ${n(y1)} ${n(x1)} ${n(y1)}`
  }
  return `<path d="${d} L${w} ${ht}Z" fill="${fill}" opacity="${opacity}"/>`
}

/** A soft band of mist across the scene. */
function mist(c: Ctx, y: number, height: number, opacity = 0.35): string {
  return `<rect y="${n(c.ht * y)}" width="${c.w}" height="${n(c.ht * height)}" fill="url(#mist)" opacity="${opacity}"/>`
}
const mistDef = (c: Ctx) => `<defs><linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.p.sky[2]}" stop-opacity="0"/><stop offset=".5" stop-color="${c.p.sky[2]}" stop-opacity=".9"/><stop offset="1" stop-color="${c.p.sky[2]}" stop-opacity="0"/></linearGradient></defs>`

/** A palm tree silhouette: curved trunk and drooping fronds. */
function palm(x: number, y: number, height: number, lean: number, col: string): string {
  const tx = x + lean
  const ty = y - height
  const len = height * 0.52
  const fronds = [-172, -148, -122, -92, -62, -34, -8]
    .map((deg) => {
      const a = (deg * Math.PI) / 180
      const tipX = tx + Math.cos(a) * len
      const tipY = ty + Math.sin(a) * len + len * 0.38
      const cx = tx + Math.cos(a) * len * 0.55
      const cy = ty + Math.sin(a) * len * 0.55 - len * 0.2
      return `<path d="M${n(tx)} ${n(ty)} Q${n(cx)} ${n(cy)} ${n(tipX)} ${n(tipY)} Q${n(cx)} ${n(cy + len * 0.2)} ${n(tx)} ${n(ty)}Z" fill="${col}"/>`
    })
    .join('')
  return `<path d="M${n(x)} ${n(y)} Q${n(x + lean * 0.15)} ${n(y - height * 0.6)} ${n(tx)} ${n(ty)}" stroke="${col}" stroke-width="${n(height * 0.032)}" stroke-linecap="round" fill="none"/>${fronds}`
}

/** A stack of small lit windows on a building. */
function windows(c: Ctx, x: number, y: number, bw: number, bh: number, cols: number, rows: number): string {
  const out: string[] = []
  const cw = bw / cols
  const rh = bh / rows
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++)
      if (c.r() > 0.55) out.push(`<rect x="${n(x + i * cw + cw * 0.25)}" y="${n(y + j * rh + rh * 0.25)}" width="${n(cw * 0.5)}" height="${n(rh * 0.5)}" rx="${n(cw * 0.08)}" fill="${WARM}" opacity="${n(0.55 + c.r() * 0.45)}"/>`)
  return out.join('')
}

// ---------- scenes ----------

/** A Balinese-style outrigger boat pulled up on the sand. */
function boat(x: number, y: number, s: number, hull: string, trim: string): string {
  return `<path d="M${n(x - s)} ${n(y)} Q${n(x)} ${n(y + s * 0.28)} ${n(x + s)} ${n(y)} L${n(x + s * 1.15)} ${n(y - s * 0.12)} L${n(x + s * 0.85)} ${n(y - s * 0.02)} L${n(x - s * 0.85)} ${n(y - s * 0.02)} L${n(x - s * 1.15)} ${n(y - s * 0.12)}Z" fill="${hull}"/>` +
    `<path d="M${n(x - s)} ${n(y - s * 0.02)} L${n(x + s)} ${n(y - s * 0.02)}" stroke="${trim}" stroke-width="${n(s * 0.05)}"/>` +
    `<path d="M${n(x - s * 0.9)} ${n(y + s * 0.18)} L${n(x + s * 0.9)} ${n(y + s * 0.18)}" stroke="${hull}" stroke-width="${n(s * 0.03)}"/>`
}

function coast(c: Ctx): string {
  const { w, ht, p, r, sx, h, seed } = c
  // Palm beaches and rocky headlands with boats; known places get the right one, others alternate by id.
  const cliffs = /^goa$|uluwatu|nyang|cliff|aguada|lighthouse|jimbaran|batu/.test(seed) || (!/seminyak|sanur|palolem|baga|kuta|beach/.test(seed) && (h >> 6) % 2 === 1)
  const lighthouse = /aguada|lighthouse/.test(seed)
  const hz = ht * 0.6
  const refl = Array.from({ length: 9 }, (_, i) => {
    const rw = w * (0.02 + i * 0.012 + r() * 0.01)
    return `<rect x="${n(sx - rw / 2)}" y="${n(hz + ht * (0.015 + i * 0.03))}" width="${n(rw)}" height="${n(ht * 0.008)}" rx="${n(ht * 0.004)}" fill="${p.sun}" opacity="${n(0.6 - i * 0.055)}"/>`
  }).join('')
  const swell = Array.from({ length: 5 }, (_, i) => {
    const y = hz + ht * (0.07 + i * 0.05)
    return `<path d="M0 ${n(y)} Q${n(w * 0.25)} ${n(y - ht * 0.012)} ${n(w * 0.5)} ${n(y)} T${w} ${n(y)}" stroke="#fff" stroke-opacity="${n(0.28 - i * 0.04)}" stroke-width="${n(ht * 0.004)}" fill="none"/>`
  }).join('')
  const side = r() > 0.5
  const px = side ? w * 0.13 : w * 0.87
  const sail = `<path d="M${n(w * 0.68)} ${n(hz - ht * 0.005)} L${n(w * 0.68)} ${n(hz - ht * 0.07)} L${n(w * 0.7)} ${n(hz - ht * 0.005)}Z" fill="${p.sun}" opacity=".85"/>`
  return (
    sky(c, hz - ht * 0.02) +
    `<path d="M${side ? w : 0} ${n(hz)} Q${n(w * (side ? 0.8 : 0.2))} ${n(hz - ht * 0.14)} ${n(w * (side ? 0.55 : 0.45))} ${n(hz)}Z" fill="${mix(p.sky[1], p.ink, 0.35)}" opacity=".7"/>` +
    `<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(p.sky[2], p.sky[1], 0.5)}"/><stop offset="1" stop-color="${mix(p.sky[0], p.ink, 0.55)}"/></linearGradient></defs>` +
    `<rect y="${n(hz)}" width="${w}" height="${n(ht - hz)}" fill="url(#sea)"/>${refl}${swell}${sail}` +
    `<path d="M0 ${ht} L0 ${n(ht * 0.84)} Q${n(w * 0.3)} ${n(ht * 0.78)} ${n(w * 0.62)} ${n(ht * 0.86)} T${w} ${n(ht * 0.83)} L${w} ${ht}Z" fill="${mix('#f4dcb4', p.sky[2], 0.35)}"/>` +
    `<path d="M0 ${n(ht * 0.84)} Q${n(w * 0.3)} ${n(ht * 0.78)} ${n(w * 0.62)} ${n(ht * 0.86)} T${w} ${n(ht * 0.83)}" stroke="#fff" stroke-opacity=".7" stroke-width="${n(ht * 0.006)}" fill="none"/>` +
    (cliffs
      ? `<path d="M${side ? 0 : w} ${n(ht * 0.86)} L${side ? 0 : w} ${n(ht * 0.3)} Q${n(side ? w * 0.12 : w * 0.88)} ${n(ht * 0.26)} ${n(side ? w * 0.2 : w * 0.8)} ${n(ht * 0.42)} L${n(side ? w * 0.24 : w * 0.76)} ${n(ht * 0.6)} Q${n(side ? w * 0.3 : w * 0.7)} ${n(ht * 0.66)} ${n(side ? w * 0.27 : w * 0.73)} ${n(ht * 0.74)}Z" fill="${p.ink}"/>` +
        `<path d="M${side ? 0 : w} ${n(ht * 0.3)} Q${n(side ? w * 0.12 : w * 0.88)} ${n(ht * 0.26)} ${n(side ? w * 0.2 : w * 0.8)} ${n(ht * 0.42)}" stroke="${mix(p.ink, '#4e8a46', 0.45)}" stroke-width="${n(ht * 0.03)}" fill="none"/>` +
        (lighthouse
          ? `<rect x="${n(side ? w * 0.1 : w * 0.87)}" y="${n(ht * 0.12)}" width="${n(w * 0.03)}" height="${n(ht * 0.16)}" fill="#f2ede4"/><rect x="${n(side ? w * 0.1 : w * 0.87)}" y="${n(ht * 0.17)}" width="${n(w * 0.03)}" height="${n(ht * 0.025)}" fill="${mix('#c0432e', p.ink, 0.2)}"/><rect x="${n(side ? w * 0.095 : w * 0.865)}" y="${n(ht * 0.095)}" width="${n(w * 0.04)}" height="${n(ht * 0.03)}" fill="${WARM}"/>`
          : '') +
        boat(w * 0.55, ht * 0.9, ht * 0.11, mix(p.ink, p.sky[1], 0.2), p.accent) + boat(w * 0.78, ht * 0.93, ht * 0.08, mix(p.ink, p.sky[0], 0.3), '#fff')
      : palm(px, ht * 1.02, ht * 0.62, side ? ht * 0.1 : -ht * 0.1, p.ink) +
        palm(px + (side ? w * 0.07 : -w * 0.07), ht * 1.02, ht * 0.4, side ? ht * 0.05 : -ht * 0.05, mix(p.ink, p.sky[1], 0.15)))
  )
}

function temple(c: Ctx): string {
  const { w, ht, p, r } = c
  const cx = w * (0.46 + r() * 0.08)
  const base = ht * 0.84
  const gap = ht * 0.09
  const half = ht * 0.22
  const top = ht * 0.4
  const steps = 6
  const sh = (base - top) / steps
  const gateHalf = (dir: 1 | -1) => {
    const x0 = cx + dir * gap
    const pts: Array<[number, number]> = [[x0, base], [x0, top]]
    for (let i = 0; i < steps; i++) {
      const x = x0 + dir * ((half * (i + 1)) / steps)
      pts.push([x, top + i * sh], [x, top + (i + 1) * sh])
    }
    pts.push([x0 + dir * half, base])
    return `<polygon points="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="${p.ink}"/>` +
      `<rect x="${n(x0 + dir * ht * 0.012 - ht * 0.02)}" y="${n(top - ht * 0.06)}" width="${n(ht * 0.04)}" height="${n(ht * 0.06)}" fill="${p.ink}"/>`
  }
  const meru = (x: number, s: number, col: string) =>
    [0, 1, 2, 3].map((i) => `<polygon points="${n(x - s * (1 - i * 0.2))},${n(base - ht * 0.2 - i * s * 0.55)} ${n(x + s * (1 - i * 0.2))},${n(base - ht * 0.2 - i * s * 0.55)} ${n(x + s * (0.78 - i * 0.2))},${n(base - ht * 0.2 - i * s * 0.55 - s * 0.45)} ${n(x - s * (0.78 - i * 0.2))},${n(base - ht * 0.2 - i * s * 0.55 - s * 0.45)}" fill="${col}"/>`).join('') +
    `<rect x="${n(x - s * 0.5)}" y="${n(base - ht * 0.2)}" width="${n(s)}" height="${n(ht * 0.2)}" fill="${col}"/>`
  const stairs = Array.from({ length: 7 }, (_, i) => `<rect x="${n(cx - gap - i * 3)}" y="${n(base + i * ht * 0.02)}" width="${n(gap * 2 + i * 6)}" height="${n(ht * 0.012)}" fill="${p.sky[2]}" opacity="${n(0.5 - i * 0.05)}"/>`).join('')
  return (
    mistDef(c) + sky(c, ht * 0.44) +
    hills(c, 0.7, 0.1, 5, layerColor(c, 0, 3), 0.9) + mist(c, 0.55, 0.2) +
    hills(c, 0.8, 0.08, 6, layerColor(c, 1, 3)) +
    meru(cx - ht * 0.5, ht * 0.07, mix(p.sky[1], p.ink, 0.5)) + meru(cx + ht * 0.55, ht * 0.06, mix(p.sky[1], p.ink, 0.5)) +
    `<rect x="${n(cx - gap)}" y="${n(top + ht * 0.12)}" width="${n(gap * 2)}" height="${n(base - top - ht * 0.12)}" fill="${p.sky[2]}" opacity=".35"/>` +
    gateHalf(-1) + gateHalf(1) +
    `<rect y="${n(base)}" width="${w}" height="${n(ht - base)}" fill="${mix(p.ink, p.sky[1], 0.12)}"/>${stairs}` +
    palm(w * 0.06, ht * 1.02, ht * 0.7, ht * 0.08, p.ink) + palm(w * 0.95, ht * 1.02, ht * 0.5, -ht * 0.06, p.ink)
  )
}

/** Japanese shrine: layered hills, a pagoda and a vermilion torii in front. */
function shrine(c: Ctx): string {
  const { w, ht, p, r } = c
  const red = mix('#c8402a', p.ink, 0.12)
  const tx = w * (0.62 + r() * 0.12)
  const tw = ht * 0.42
  const top = ht * 0.42
  const base = ht * 0.86
  const torii =
    `<path d="M${n(tx - tw * 0.72)} ${n(top + ht * 0.02)} Q${n(tx)} ${n(top - ht * 0.03)} ${n(tx + tw * 0.72)} ${n(top + ht * 0.02)} L${n(tx + tw * 0.68)} ${n(top + ht * 0.055)} Q${n(tx)} ${n(top + ht * 0.02)} ${n(tx - tw * 0.68)} ${n(top + ht * 0.055)}Z" fill="${p.ink}"/>` +
    `<rect x="${n(tx - tw * 0.6)}" y="${n(top + ht * 0.05)}" width="${n(tw * 1.2)}" height="${n(ht * 0.03)}" fill="${red}"/>` +
    `<rect x="${n(tx - tw * 0.56)}" y="${n(top + ht * 0.13)}" width="${n(tw * 1.12)}" height="${n(ht * 0.025)}" fill="${red}"/>` +
    [-1, 1].map((d) => `<rect x="${n(tx + d * tw * 0.4 - ht * 0.018)}" y="${n(top + ht * 0.05)}" width="${n(ht * 0.036)}" height="${n(base - top - ht * 0.05)}" fill="${red}"/><rect x="${n(tx + d * tw * 0.4 - ht * 0.025)}" y="${n(base - ht * 0.03)}" width="${n(ht * 0.05)}" height="${n(ht * 0.03)}" fill="${p.ink}"/>`).join('')
  const px = w * (0.2 + r() * 0.1)
  const tiers = 5
  const col = layerColor(c, 1, 3, p.sky[0])
  const pagoda = Array.from({ length: tiers }, (_, i) => {
    const y = ht * 0.74 - i * ht * 0.085
    const half = ht * (0.13 - i * 0.017)
    return `<rect x="${n(px - half * 0.55)}" y="${n(y - ht * 0.05)}" width="${n(half * 1.1)}" height="${n(ht * 0.05)}" fill="${col}"/>` +
      `<path d="M${n(px - half * 1.15)} ${n(y - ht * 0.045)} Q${n(px - half * 0.6)} ${n(y - ht * 0.06)} ${n(px)} ${n(y - ht * 0.085)} Q${n(px + half * 0.6)} ${n(y - ht * 0.06)} ${n(px + half * 1.15)} ${n(y - ht * 0.045)}Z" fill="${col}"/>`
  }).join('') + `<rect x="${n(px - ht * 0.004)}" y="${n(ht * 0.74 - tiers * ht * 0.085 - ht * 0.09)}" width="${n(ht * 0.008)}" height="${n(ht * 0.1)}" fill="${col}"/>`
  const blossom = Array.from({ length: 14 }, () => `<circle cx="${n(w * (0.02 + r() * 0.14))}" cy="${n(ht * (0.1 + r() * 0.3))}" r="${n(ht * (0.025 + r() * 0.03))}" fill="${mix('#f6b8c8', p.sky[2], 0.3)}" opacity=".85"/>`).join('')
  return (
    mistDef(c) + sky(c, ht * 0.36) +
    hills(c, 0.6, 0.12, 4, layerColor(c, 0, 3), 0.9) + mist(c, 0.5, 0.2, 0.5) + pagoda +
    hills(c, 0.84, 0.05, 6, layerColor(c, 2, 3)) +
    `<rect y="${n(base)}" width="${w}" height="${n(ht - base)}" fill="${p.ink}"/>` + torii +
    `<path d="M0 0 Q${n(w * 0.08)} ${n(ht * 0.2)} ${n(w * 0.16)} ${n(ht * 0.32)}" stroke="${p.ink}" stroke-width="${n(ht * 0.02)}" fill="none"/>` + blossom
  )
}

/** Rajput fort or palace: crenellated walls and bastions, a palace block with domed chhatris; some stand on a lake. */
function fort(c: Ctx): string {
  const { w, ht, p, r, seed, h } = c
  const lake = /udaipur|lake|palace/.test(seed)
  // Delhi and Agra's red sandstone, Jaipur's pink; Amber and Mehrangarh sit high on rock, Jodhpur's above blue houses.
  const tint = /delhi|agra|red/.test(seed) ? '#b4523a' : /jaipur|pink/.test(seed) ? '#e0927a' : p.accent
  const stone = mix(tint, p.ink, 0.35)
  const hill = /jodhpur|jaipur|amber|mehrangarh|hill/.test(seed) || (!lake && h % 3 === 1)
  const shade = mix(stone, p.ink, 0.35)
  const base = lake ? ht * 0.72 : hill ? ht * 0.6 : ht * 0.78
  const wallTop = base - ht * 0.16
  const x0 = w * (0.12 + r() * 0.08)
  const x1 = w * (0.82 + r() * 0.06)
  const merlons = (a: number, b: number, y: number) => {
    let out = ''
    for (let x = a; x < b; x += ht * 0.035) out += `<rect x="${n(x)}" y="${n(y - ht * 0.02)}" width="${n(ht * 0.02)}" height="${n(ht * 0.02)}" fill="${shade}"/>`
    return out
  }
  const bastion = (x: number) => `<path d="M${n(x - ht * 0.06)} ${n(base)} L${n(x - ht * 0.05)} ${n(wallTop - ht * 0.03)} L${n(x + ht * 0.05)} ${n(wallTop - ht * 0.03)} L${n(x + ht * 0.06)} ${n(base)}Z" fill="${shade}"/>` + merlons(x - ht * 0.05, x + ht * 0.05, wallTop - ht * 0.03)
  const dome = (x: number, y: number, s: number) =>
    `<rect x="${n(x - s)}" y="${n(y)}" width="${n(s * 2)}" height="${n(s * 0.9)}" fill="${stone}"/><rect x="${n(x - s * 0.7)}" y="${n(y + s * 0.2)}" width="${n(s * 0.35)}" height="${n(s * 0.7)}" fill="${shade}"/><rect x="${n(x + s * 0.35)}" y="${n(y + s * 0.2)}" width="${n(s * 0.35)}" height="${n(s * 0.7)}" fill="${shade}"/>` +
    `<path d="M${n(x - s * 1.1)} ${n(y)} Q${n(x - s * 1.05)} ${n(y - s * 1.2)} ${n(x)} ${n(y - s * 1.35)} Q${n(x + s * 1.05)} ${n(y - s * 1.2)} ${n(x + s * 1.1)} ${n(y)}Z" fill="${stone}"/><rect x="${n(x - s * 0.06)}" y="${n(y - s * 1.7)}" width="${n(s * 0.12)}" height="${n(s * 0.4)}" fill="${stone}"/>`
  const px = w * (0.38 + r() * 0.12)
  const pw = w * 0.3
  const pTop = wallTop - ht * 0.2
  const arches = Array.from({ length: 6 }, (_, i) => {
    const ax = px + pw * (0.08 + i * 0.15)
    return `<path d="M${n(ax)} ${n(pTop + ht * 0.13)} L${n(ax)} ${n(pTop + ht * 0.08)} Q${n(ax + pw * 0.04)} ${n(pTop + ht * 0.045)} ${n(ax + pw * 0.08)} ${n(pTop + ht * 0.08)} L${n(ax + pw * 0.08)} ${n(pTop + ht * 0.13)}Z" fill="${WARM}" opacity="${n(0.55 + r() * 0.4)}"/>`
  }).join('')
  const water = lake
    ? `<defs><linearGradient id="lk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(p.sky[2], p.sky[1], 0.4)}"/><stop offset="1" stop-color="${mix(p.sky[0], p.ink, 0.5)}"/></linearGradient></defs><rect y="${n(base)}" width="${w}" height="${n(ht - base)}" fill="url(#lk)"/>` +
      `<rect x="${n(px)}" y="${n(base)}" width="${n(pw)}" height="${n((base - pTop) * 0.6)}" fill="${stone}" opacity=".22"/>` +
      Array.from({ length: 6 }, (_, i) => `<rect x="${n(w * (0.1 + r() * 0.7))}" y="${n(base + ht * (0.04 + i * 0.035))}" width="${n(w * (0.05 + r() * 0.12))}" height="${n(ht * 0.005)}" fill="#fff" opacity=".3"/>`).join('')
    : hill
      ? `<path d="M0 ${ht} L0 ${n(base + ht * 0.12)} Q${n(w * 0.1)} ${n(base + ht * 0.02)} ${n(w * 0.25)} ${n(base)} L${n(w * 0.8)} ${n(base - ht * 0.01)} Q${n(w * 0.92)} ${n(base + ht * 0.04)} ${w} ${n(base + ht * 0.14)} L${w} ${ht}Z" fill="${mix(p.ink, stone, 0.3)}"/>` +
        Array.from({ length: /jodhpur|blue/.test(seed) ? 26 : 0 }, () => { const bx = r() * w; const bw = w * (0.025 + r() * 0.03); const bh = ht * (0.04 + r() * 0.05); return `<rect x="${n(bx)}" y="${n(ht - ht * 0.16 - bh + r() * ht * 0.1)}" width="${n(bw)}" height="${n(bh + ht * 0.2)}" fill="${mix('#4f86c6', p.ink, 0.25 + r() * 0.3)}"/>` }).join('')
      : `<path d="M0 ${ht} L0 ${n(base + ht * 0.02)} Q${n(w * 0.3)} ${n(base - ht * 0.03)} ${n(w * 0.55)} ${n(base + ht * 0.01)} T${w} ${n(base)} L${w} ${ht}Z" fill="${mix(p.ink, stone, 0.25)}"/>` +
        // A gateway arch in the wall for forts on flat ground.
        `<path d="M${n(x0 + (x1 - x0) * 0.22)} ${n(base)} L${n(x0 + (x1 - x0) * 0.22)} ${n(wallTop + ht * 0.06)} Q${n(x0 + (x1 - x0) * 0.25)} ${n(wallTop + ht * 0.01)} ${n(x0 + (x1 - x0) * 0.28)} ${n(wallTop + ht * 0.06)} L${n(x0 + (x1 - x0) * 0.28)} ${n(base)}Z" fill="${mix(p.ink, '#000000', 0.2)}"/>`
  return (
    sky(c, ht * 0.42) + hills(c, 0.66, 0.08, 5, layerColor(c, 0, 3), 0.85) +
    `<rect x="${n(x0)}" y="${n(wallTop)}" width="${n(x1 - x0)}" height="${n(base - wallTop)}" fill="${shade}"/>` + merlons(x0, x1, wallTop) +
    bastion(x0) + bastion(x1) + bastion((x0 + x1) / 2 + w * 0.17) +
    `<rect x="${n(px)}" y="${n(pTop)}" width="${n(pw)}" height="${n(wallTop - pTop + ht * 0.02)}" fill="${stone}"/>` + arches +
    dome(px + pw * 0.12, pTop - ht * 0.03, ht * 0.035) + dome(px + pw * 0.5, pTop - ht * 0.045, ht * 0.05) + dome(px + pw * 0.88, pTop - ht * 0.03, ht * 0.035) +
    water
  )
}

function terraces(c: Ctx): string {
  const { w, ht, p, r } = c
  const greens = ['#2f5f3d', '#47803f', '#7fa947', '#b9c862']
  const bands = Array.from({ length: 6 }, (_, i) => {
    const y = ht * (0.5 + i * 0.085)
    const amp = ht * (0.03 + i * 0.012)
    const ph = r() * 6
    const top: string[] = []
    for (let k = 0; k <= 8; k++) top.push(`${n((k * w) / 8)},${n(y - Math.sin(k * 0.9 + ph) * amp)}`)
    const edge = top.join(' L')
    const col = mix(greens[i % 4]!, p.sky[2], (5 - i) * 0.06)
    const pond = r() > 0.4 ? `<ellipse cx="${n(w * (0.2 + r() * 0.6))}" cy="${n(y + ht * 0.03)}" rx="${n(w * 0.12)}" ry="${n(ht * 0.012)}" fill="${p.sky[1]}" opacity=".55"/>` : ''
    return `<path d="M0 ${ht} L${edge} L${w} ${ht}Z" fill="${col}"/><path d="M${edge}" stroke="${mix(col, '#fff', 0.35)}" stroke-width="${n(ht * 0.006)}" fill="none" opacity=".8"/>${pond}`
  }).join('')
  return (
    mistDef(c) + sky(c, ht * 0.4) +
    `<path d="M0 ${n(ht * 0.55)} L${n(w * 0.3)} ${n(ht * 0.4)} L${n(w * 0.42)} ${n(ht * 0.44)} L${n(w * 0.66)} ${n(ht * 0.3)} L${n(w * 0.9)} ${n(ht * 0.5)} L${w} ${n(ht * 0.46)} L${w} ${n(ht * 0.6)} L0 ${n(ht * 0.6)}Z" fill="${layerColor(c, 0, 3)}"/>` +
    mist(c, 0.42, 0.18, 0.45) + bands +
    palm(w * 0.9, ht * 0.98, ht * 0.62, -ht * 0.07, p.ink) + palm(w * 0.8, ht * 1.0, ht * 0.42, -ht * 0.04, mix(p.ink, '#2f5f3d', 0.3))
  )
}

function mountains(c: Ctx): string {
  const { w, ht, p, r } = c
  const peak = (x: number, y: number, bw: number, col: string, snow: boolean) => {
    const j = (k: number) => n(ht * (r() - 0.5) * 0.025 * k)
    const left = `${n(x - bw)},${ht}`
    const body = `<polygon points="${left} ${n(x - bw * 0.4)},${n(y + ht * 0.2 + Number(j(1)))} ${n(x - bw * 0.15)},${n(y + ht * 0.06)} ${n(x)},${n(y)} ${n(x + bw * 0.22)},${n(y + ht * 0.09)} ${n(x + bw * 0.5)},${n(y + ht * 0.24)} ${n(x + bw)},${ht}" fill="${col}"/>`
    const cap = snow
      ? `<polygon points="${n(x - bw * 0.19)},${n(y + ht * 0.09)} ${n(x - bw * 0.15)},${n(y + ht * 0.06)} ${n(x)},${n(y)} ${n(x + bw * 0.22)},${n(y + ht * 0.09)} ${n(x + bw * 0.12)},${n(y + ht * 0.125)} ${n(x + bw * 0.04)},${n(y + ht * 0.095)} ${n(x - bw * 0.04)},${n(y + ht * 0.14)} ${n(x - bw * 0.1)},${n(y + ht * 0.1)}" fill="#fff" opacity=".93"/>`
      : ''
    return body + cap
  }
  const pine = (x: number, y: number, s: number) =>
    [0, 1, 2].map((i) => `<polygon points="${n(x)},${n(y - s * (1.1 - i * 0.05) - i * s * 0.45 + s * 0.4)} ${n(x - s * (0.34 + i * 0.1))},${n(y - i * s * 0.45 + s * 0.4)} ${n(x + s * (0.34 + i * 0.1))},${n(y - i * s * 0.45 + s * 0.4)}" fill="${p.ink}"/>`).join('') +
    `<rect x="${n(x - s * 0.04)}" y="${n(y + s * 0.4)}" width="${n(s * 0.08)}" height="${n(s * 0.25)}" fill="${p.ink}"/>`
  const m1 = r()
  return (
    mistDef(c) + sky(c, ht * 0.38) +
    peak(w * (0.7 + m1 * 0.08), ht * 0.22, w * 0.34, layerColor(c, 0, 3), true) +
    peak(w * 0.3, ht * 0.32, w * 0.38, layerColor(c, 1, 3), true) +
    mist(c, 0.5, 0.2, 0.55) +
    hills(c, 0.72, 0.1, 5, layerColor(c, 2, 3)) +
    `<defs><linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(p.sky[2], p.sky[1], 0.4)}"/><stop offset="1" stop-color="${mix(p.sky[0], p.ink, 0.5)}"/></linearGradient></defs>` +
    `<rect y="${n(ht * 0.8)}" width="${w}" height="${n(ht * 0.2)}" fill="url(#lake)"/>` +
    `<path d="M0 ${ht} L0 ${n(ht * 0.86)} Q${n(w * 0.25)} ${n(ht * 0.8)} ${n(w * 0.5)} ${n(ht * 0.9)} T${w} ${n(ht * 0.88)} L${w} ${ht}Z" fill="${p.ink}"/>` +
    pine(w * 0.07, ht * 0.84, ht * 0.2) + pine(w * 0.13, ht * 0.9, ht * 0.14) + pine(w * 0.93, ht * 0.85, ht * 0.22) + pine(w * 0.86, ht * 0.92, ht * 0.13)
  )
}

function city(c: Ctx): string {
  const { w, ht, p, r } = c
  const row = (i: number, count: number, minH: number, maxH: number, y: number, lit: boolean) => {
    const col = layerColor(c, i, 3, p.sky[0])
    let x = -w * 0.02
    let out = ''
    while (x < w) {
      const bw = w * (0.04 + r() * 0.05)
      const bh = ht * (minH + r() * (maxH - minH))
      out += `<rect x="${n(x)}" y="${n(y - bh)}" width="${n(bw)}" height="${n(bh + ht)}" fill="${col}"/>`
      if (lit) out += windows(c, x + bw * 0.1, y - bh + ht * 0.02, bw * 0.8, bh - ht * 0.03, 3, Math.max(2, Math.round(bh / (ht * 0.05))))
      x += bw + w * 0.004
    }
    return count ? out : ''
  }
  const dx = w * (0.4 + r() * 0.2)
  const landmark = r() > 0.5
    ? `<path d="M${n(dx - ht * 0.12)} ${n(ht * 0.72)} Q${n(dx)} ${n(ht * 0.34)} ${n(dx + ht * 0.12)} ${n(ht * 0.72)}Z" fill="${layerColor(c, 1, 3, p.sky[0])}"/><rect x="${n(dx - ht * 0.004)}" y="${n(ht * 0.27)}" width="${n(ht * 0.008)}" height="${n(ht * 0.1)}" fill="${layerColor(c, 1, 3, p.sky[0])}"/>`
    : `<polygon points="${n(dx - ht * 0.03)},${n(ht * 0.74)} ${n(dx)},${n(ht * 0.22)} ${n(dx + ht * 0.03)},${n(ht * 0.74)}" fill="${layerColor(c, 1, 3, p.sky[0])}"/>`
  return (
    sky(c, ht * 0.5) +
    row(0, 1, 0.1, 0.22, ht * 0.74, false) + landmark + row(1, 1, 0.12, 0.3, ht * 0.8, true) + row(2, 1, 0.1, 0.26, ht * 0.9, true) +
    `<defs><linearGradient id="riv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(p.sky[1], p.ink, 0.4)}"/><stop offset="1" stop-color="${p.ink}"/></linearGradient></defs>` +
    `<rect y="${n(ht * 0.9)}" width="${w}" height="${n(ht * 0.1)}" fill="url(#riv)"/>` +
    Array.from({ length: 10 }, () => `<rect x="${n(r() * w)}" y="${n(ht * (0.92 + r() * 0.06))}" width="${n(w * (0.02 + r() * 0.04))}" height="${n(ht * 0.006)}" rx="${n(ht * 0.003)}" fill="${p.accent}" opacity=".55"/>`).join('')
  )
}

function food(c: Ctx): string {
  const { w, ht, p, r, h } = c
  const cx = w * 0.5
  const cy = ht * 0.5
  const R = ht * 0.36
  const broth = ['#d98b3a', '#b5532e', '#e0b04f', '#8aa04c'][h % 4]!
  const ing = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + r()
    const d = R * (0.2 + r() * 0.45)
    const x = cx + Math.cos(a) * d
    const y = cy + Math.sin(a) * d
    const col = [p.accent, '#7aa33f', '#f2e7d0', '#c0432e'][i % 4]!
    return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(ht * (0.025 + r() * 0.02))}" fill="${col}"/><circle cx="${n(x - ht * 0.006)}" cy="${n(y - ht * 0.006)}" r="${n(ht * 0.008)}" fill="#fff" opacity=".4"/>`
  }).join('')
  const noodles = Array.from({ length: 5 }, (_, i) => `<path d="M${n(cx - R * 0.6)} ${n(cy - R * 0.25 + i * R * 0.13)} q${n(R * 0.3)} ${n(-R * 0.18)} ${n(R * 0.6)} 0 t${n(R * 0.6)} 0" stroke="#f3dca0" stroke-width="${n(ht * 0.012)}" stroke-linecap="round" fill="none" opacity=".9"/>`).join('')
  const leaf = (x: number, y: number, rot: number, s: number) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(s)}" ry="${n(s * 0.45)}" transform="rotate(${rot} ${n(x)} ${n(y)})" fill="#4e8a46"/><path d="M${n(x - s)} ${n(y)} L${n(x + s)} ${n(y)}" transform="rotate(${rot} ${n(x)} ${n(y)})" stroke="#2f5f3d" stroke-width="${n(s * 0.06)}"/>`
  return (
    `<defs><radialGradient id="tb" cx=".5" cy=".4" r=".85"><stop offset="0" stop-color="${mix(p.ink, p.sky[1], 0.3)}"/><stop offset="1" stop-color="${mix(p.ink, '#000000', 0.35)}"/></radialGradient>` +
    `<radialGradient id="bw" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#dcd2c0"/></radialGradient></defs>` +
    `<rect width="${w}" height="${ht}" fill="url(#tb)"/>` +
    Array.from({ length: 6 }, (_, i) => `<rect y="${n((i * ht) / 6)}" width="${w}" height="${n(ht * 0.004)}" fill="#000" opacity=".16"/>`).join('') +
    leaf(w * 0.13, ht * 0.2, -35, ht * 0.11) + leaf(w * 0.16, ht * 0.3, 20, ht * 0.08) +
    `<circle cx="${n(w * 0.84)}" cy="${n(ht * 0.28)}" r="${n(ht * 0.12)}" fill="url(#bw)" opacity=".95"/><circle cx="${n(w * 0.84)}" cy="${n(ht * 0.28)}" r="${n(ht * 0.075)}" fill="${mix(broth, '#ffffff', 0.15)}"/>` +
    `<rect x="${n(w * 0.7)}" y="${n(ht * 0.78)}" width="${n(ht * 0.62)}" height="${n(ht * 0.022)}" rx="${n(ht * 0.011)}" transform="rotate(-14 ${n(w * 0.7)} ${n(ht * 0.78)})" fill="#e7c98f"/>` +
    `<rect x="${n(w * 0.7)}" y="${n(ht * 0.84)}" width="${n(ht * 0.62)}" height="${n(ht * 0.022)}" rx="${n(ht * 0.011)}" transform="rotate(-14 ${n(w * 0.7)} ${n(ht * 0.84)})" fill="#d9b574"/>` +
    `<circle cx="${n(cx + ht * 0.02)}" cy="${n(cy + ht * 0.03)}" r="${n(R * 1.04)}" fill="#000" opacity=".28"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R)}" fill="url(#bw)"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 0.86)}" fill="none" stroke="#c9bda5" stroke-width="${n(ht * 0.004)}"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 0.78)}" fill="${broth}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 0.78)}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="${n(ht * 0.012)}"/>` +
    noodles + ing
  )
}

function villa(c: Ctx): string {
  const { w, ht, p, r } = c
  const bx = w * (0.14 + r() * 0.1)
  const bw = w * 0.52
  const by = ht * 0.46
  const roofH = ht * 0.16
  const glass = (x: number, y: number, gw: number, gh: number) => `<rect x="${n(x)}" y="${n(y)}" width="${n(gw)}" height="${n(gh)}" rx="${n(ht * 0.004)}" fill="${WARM}" opacity=".92"/>`
  const panes = [0, 1, 2, 3].map((i) => glass(bx + bw * (0.07 + i * 0.23), by + ht * 0.07, bw * 0.17, ht * 0.15)).join('')
  const wing = `<rect x="${n(bx + bw)}" y="${n(by + ht * 0.07)}" width="${n(w * 0.16)}" height="${n(ht * 0.2)}" fill="${mix(p.ink, p.sky[1], 0.1)}"/><polygon points="${n(bx + bw - ht * 0.02)},${n(by + ht * 0.07)} ${n(bx + bw + w * 0.16 + ht * 0.02)},${n(by + ht * 0.07)} ${n(bx + bw + w * 0.13)},${n(by - ht * 0.03)} ${n(bx + bw + w * 0.04)},${n(by - ht * 0.03)}" fill="${mix(p.ink, '#000000', 0.2)}"/>` + glass(bx + bw + w * 0.03, by + ht * 0.12, w * 0.1, ht * 0.1)
  const poolTop = ht * 0.74
  const refl = [0, 1, 2, 3].map((i) => `<rect x="${n(bx + bw * (0.07 + i * 0.23))}" y="${n(poolTop + ht * 0.03)}" width="${n(bw * 0.17)}" height="${n(ht * 0.13)}" rx="${n(ht * 0.004)}" fill="${WARM}" opacity=".28"/>`).join('')
  const lounger = (x: number) => `<rect x="${n(x)}" y="${n(ht * 0.715)}" width="${n(w * 0.055)}" height="${n(ht * 0.016)}" rx="${n(ht * 0.006)}" fill="${p.sky[2]}" opacity=".85"/>`
  return (
    sky(c, ht * 0.5) + hills(c, 0.62, 0.07, 6, layerColor(c, 0, 3)) +
    `<rect x="${n(bx)}" y="${n(by)}" width="${n(bw)}" height="${n(ht * 0.27)}" fill="${p.ink}"/>` +
    `<path d="M${n(bx - w * 0.03)} ${n(by + ht * 0.01)} Q${n(bx + bw * 0.5)} ${n(by - roofH * 1.15)} ${n(bx + bw + w * 0.03)} ${n(by + ht * 0.01)}Z" fill="${mix(p.ink, '#000000', 0.25)}"/>` +
    panes + wing +
    `<rect y="${n(ht * 0.73)}" width="${w}" height="${n(ht * 0.27)}" fill="${mix(p.ink, p.sky[1], 0.16)}"/>` + lounger(w * 0.72) + lounger(w * 0.8) +
    `<defs><linearGradient id="pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix('#38b6c9', p.sky[2], 0.25)}"/><stop offset="1" stop-color="${mix('#126a86', p.ink, 0.35)}"/></linearGradient></defs>` +
    `<rect x="${n(w * 0.06)}" y="${n(poolTop)}" width="${n(w * 0.88)}" height="${n(ht * 0.2)}" rx="${n(ht * 0.03)}" fill="url(#pl)"/>${refl}` +
    `<rect x="${n(w * 0.06)}" y="${n(poolTop)}" width="${n(w * 0.88)}" height="${n(ht * 0.014)}" rx="${n(ht * 0.007)}" fill="#fff" opacity=".35"/>` +
    palm(w * 0.05, ht * 0.74, ht * 0.5, ht * 0.07, p.ink) + palm(w * 0.96, ht * 0.74, ht * 0.4, -ht * 0.05, p.ink) +
    `<circle cx="${n(bx - w * 0.01)}" cy="${n(by + ht * 0.2)}" r="${n(ht * 0.03)}" fill="${WARM}" opacity=".5"/>`
  )
}

/** A modern block of rooms with lit balconies, above a long pool. */
function tower(c: Ctx): string {
  const { w, ht, p, r } = c
  const bx = w * (0.3 + r() * 0.2)
  const bw = w * 0.34
  const top = ht * 0.16
  const floors = 7
  const fh = (ht * 0.6 - top) / floors
  const rows = Array.from({ length: floors }, (_, i) => {
    const y = top + i * fh
    return `<rect x="${n(bx - w * 0.01)}" y="${n(y + fh * 0.82)}" width="${n(bw + w * 0.02)}" height="${n(fh * 0.12)}" fill="${mix(p.sky[2], p.ink, 0.35)}"/>` +
      Array.from({ length: 5 }, (_, k) => (r() > 0.35 ? `<rect x="${n(bx + bw * (0.05 + k * 0.19))}" y="${n(y + fh * 0.2)}" width="${n(bw * 0.13)}" height="${n(fh * 0.55)}" fill="${WARM}" opacity="${n(0.5 + r() * 0.45)}"/>` : '')).join('')
  }).join('')
  return (
    sky(c, ht * 0.3) + hills(c, 0.64, 0.06, 6, layerColor(c, 0, 3)) +
    `<rect x="${n(bx)}" y="${n(top)}" width="${n(bw)}" height="${n(ht * 0.62 - top)}" fill="${p.ink}"/>` + rows +
    `<rect x="${n(bx - w * 0.015)}" y="${n(top - ht * 0.02)}" width="${n(bw + w * 0.03)}" height="${n(ht * 0.02)}" fill="${mix(p.ink, '#000000', 0.3)}"/>` +
    `<rect y="${n(ht * 0.62)}" width="${w}" height="${n(ht * 0.38)}" fill="${mix(p.ink, p.sky[1], 0.18)}"/>` +
    `<defs><linearGradient id="pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix('#38b6c9', p.sky[2], 0.2)}"/><stop offset="1" stop-color="${mix('#126a86', p.ink, 0.3)}"/></linearGradient></defs>` +
    `<path d="M0 ${n(ht * 0.72)} L${w} ${n(ht * 0.68)} L${w} ${n(ht * 0.9)} L0 ${n(ht * 0.95)}Z" fill="url(#pl)"/>` +
    `<path d="M0 ${n(ht * 0.72)} L${w} ${n(ht * 0.68)}" stroke="#fff" stroke-opacity=".45" stroke-width="${n(ht * 0.008)}"/>` +
    palm(w * 0.12, ht * 0.72, ht * 0.52, ht * 0.06, p.ink) + palm(w * 0.9, ht * 0.7, ht * 0.46, -ht * 0.05, p.ink)
  )
}

/** Thatched bungalows on short stilts among palms: homestays and small lodges. */
function huts(c: Ctx): string {
  const { w, ht, p, r } = c
  const thatch = mix(p.accent, p.ink, 0.55)
  const hut = (x: number, s: number) =>
    `<rect x="${n(x - s * 0.55)}" y="${n(ht * 0.66 - s * 0.5)}" width="${n(s * 1.1)}" height="${n(s * 0.5)}" fill="${mix(p.ink, p.sky[1], 0.12)}"/>` +
    `<rect x="${n(x - s * 0.2)}" y="${n(ht * 0.66 - s * 0.38)}" width="${n(s * 0.4)}" height="${n(s * 0.26)}" fill="${WARM}" opacity=".85"/>` +
    `<path d="M${n(x - s * 0.85)} ${n(ht * 0.66 - s * 0.42)} L${n(x)} ${n(ht * 0.66 - s * 1.25)} L${n(x + s * 0.85)} ${n(ht * 0.66 - s * 0.42)}Z" fill="${thatch}"/>` +
    `<path d="M${n(x - s * 0.85)} ${n(ht * 0.66 - s * 0.42)} L${n(x + s * 0.85)} ${n(ht * 0.66 - s * 0.42)}" stroke="${mix(thatch, '#000000', 0.3)}" stroke-width="${n(s * 0.04)}"/>` +
    [-0.45, 0.45].map((d) => `<rect x="${n(x + d * s - s * 0.03)}" y="${n(ht * 0.66)}" width="${n(s * 0.06)}" height="${n(ht * 0.05)}" fill="${p.ink}"/>`).join('')
  const xs = [0.2, 0.42, 0.66, 0.86].map((x) => w * (x + (r() - 0.5) * 0.04))
  return (
    mistDef(c) + sky(c, ht * 0.4) + hills(c, 0.6, 0.1, 5, layerColor(c, 0, 3), 0.9) + mist(c, 0.5, 0.15, 0.4) +
    hills(c, 0.7, 0.04, 6, mix('#2f5f3d', p.ink, 0.35)) +
    palm(w * 0.32, ht * 0.72, ht * 0.62, ht * 0.05, p.ink) + palm(w * 0.56, ht * 0.72, ht * 0.5, -ht * 0.06, mix(p.ink, '#2f5f3d', 0.3)) +
    xs.map((x, i) => hut(x, ht * (0.16 - i * 0.01))).join('') +
    `<rect y="${n(ht * 0.71)}" width="${w}" height="${n(ht * 0.29)}" fill="${mix(p.ink, '#2f5f3d', 0.25)}"/>` +
    Array.from({ length: 7 }, (_, i) => `<circle cx="${n(w * (0.08 + i * 0.14))}" cy="${n(ht * 0.79)}" r="${n(ht * 0.012)}" fill="${WARM}" opacity=".7"/>`).join('') +
    palm(w * 0.04, ht * 1.02, ht * 0.7, ht * 0.08, p.ink) + palm(w * 0.97, ht * 1.02, ht * 0.56, -ht * 0.06, p.ink)
  )
}

/** A beach resort: sea behind, a long low wing of rooms, umbrellas on the sand. */
function resort(c: Ctx): string {
  const { w, ht, p, r } = c
  const hz = ht * 0.5
  const wing = Array.from({ length: 2 }, (_, f) =>
    Array.from({ length: 9 }, (_, k) => (r() > 0.3 ? `<rect x="${n(w * (0.1 + k * 0.088))}" y="${n(ht * (0.55 + f * 0.07))}" width="${n(w * 0.05)}" height="${n(ht * 0.04)}" fill="${WARM}" opacity="${n(0.5 + r() * 0.45)}"/>` : '')).join('')).join('')
  const umbrella = (x: number, col: string) => `<path d="M${n(x - w * 0.045)} ${n(ht * 0.8)} Q${n(x)} ${n(ht * 0.73)} ${n(x + w * 0.045)} ${n(ht * 0.8)}Z" fill="${col}"/><rect x="${n(x - ht * 0.003)}" y="${n(ht * 0.79)}" width="${n(ht * 0.006)}" height="${n(ht * 0.09)}" fill="${p.ink}"/>`
  return (
    sky(c, hz - ht * 0.03) +
    `<rect y="${n(hz)}" width="${w}" height="${n(ht * 0.1)}" fill="${mix(p.sky[2], p.sky[1], 0.5)}"/>` +
    `<rect x="${n(w * 0.07)}" y="${n(ht * 0.52)}" width="${n(w * 0.84)}" height="${n(ht * 0.18)}" fill="${p.ink}"/>` +
    `<rect x="${n(w * 0.05)}" y="${n(ht * 0.5)}" width="${n(w * 0.88)}" height="${n(ht * 0.025)}" fill="${mix(p.ink, '#000000', 0.25)}"/>` + wing +
    `<rect y="${n(ht * 0.7)}" width="${w}" height="${n(ht * 0.3)}" fill="${mix('#f4dcb4', p.sky[2], 0.3)}"/>` +
    umbrella(w * 0.25, p.accent) + umbrella(w * 0.5, mix(p.accent, '#ffffff', 0.4)) + umbrella(w * 0.75, p.accent) +
    palm(w * 0.04, ht * 1.02, ht * 0.66, ht * 0.07, p.ink) + palm(w * 0.96, ht * 1.02, ht * 0.5, -ht * 0.06, p.ink)
  )
}

/** A room: bed, lamp, and a window onto the sky (the second photo in a hotel's gallery). */
function room(c: Ctx): string {
  const { w, ht, p } = c
  const wall = mix(p.sky[2], '#d9cbb3', 0.55)
  const wx = w * 0.52
  const ww = w * 0.38
  return (
    `<rect width="${w}" height="${ht}" fill="${wall}"/>` +
    `<svg x="${n(wx)}" y="${n(ht * 0.1)}" width="${n(ww)}" height="${n(ht * 0.48)}" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="xMidYMid slice">${sky(c, ht * 0.62)}${hills(c, 0.75, 0.08, 4, layerColor(c, 1, 3))}</svg>` +
    `<rect x="${n(wx)}" y="${n(ht * 0.1)}" width="${n(ww)}" height="${n(ht * 0.48)}" fill="none" stroke="${mix(wall, p.ink, 0.45)}" stroke-width="${n(ht * 0.015)}"/>` +
    `<rect x="${n(wx + ww / 2 - ht * 0.004)}" y="${n(ht * 0.1)}" width="${n(ht * 0.008)}" height="${n(ht * 0.48)}" fill="${mix(wall, p.ink, 0.45)}"/>` +
    `<rect y="${n(ht * 0.7)}" width="${w}" height="${n(ht * 0.3)}" fill="${mix(wall, p.ink, 0.35)}"/>` +
    `<rect x="${n(w * 0.06)}" y="${n(ht * 0.36)}" width="${n(w * 0.36)}" height="${n(ht * 0.26)}" rx="${n(ht * 0.02)}" fill="${mix(p.ink, wall, 0.25)}"/>` +
    `<rect x="${n(w * 0.04)}" y="${n(ht * 0.58)}" width="${n(w * 0.42)}" height="${n(ht * 0.2)}" rx="${n(ht * 0.02)}" fill="#f6f1e7"/>` +
    `<rect x="${n(w * 0.04)}" y="${n(ht * 0.66)}" width="${n(w * 0.42)}" height="${n(ht * 0.12)}" fill="${p.accent}" opacity=".75"/>` +
    `<rect x="${n(w * 0.08)}" y="${n(ht * 0.52)}" width="${n(w * 0.14)}" height="${n(ht * 0.08)}" rx="${n(ht * 0.03)}" fill="#fffaf0"/><rect x="${n(w * 0.27)}" y="${n(ht * 0.52)}" width="${n(w * 0.14)}" height="${n(ht * 0.08)}" rx="${n(ht * 0.03)}" fill="#fffaf0"/>` +
    `<circle cx="${n(w * 0.47)}" cy="${n(ht * 0.4)}" r="${n(ht * 0.12)}" fill="${WARM}" opacity=".25"/><path d="M${n(w * 0.45)} ${n(ht * 0.44)} L${n(w * 0.49)} ${n(ht * 0.44)} L${n(w * 0.485)} ${n(ht * 0.37)} L${n(w * 0.455)} ${n(ht * 0.37)}Z" fill="${WARM}"/>`
  )
}

/**
 * Hotels: the building follows the name (homestay → bungalows, resort → beach resort, boutique/hotel → a block,
 * villa/garden → a villa). A hotel's second gallery image (`…2`) is a room.
 */
function hotel(c: Ctx): string {
  const s = c.seed
  if (/^h-.*2$/.test(s)) return room(c)
  const draw = /homestay|bungalow|hut|lodge/.test(s) ? huts : /resort/.test(s) ? resort : /boutique|hotel|tower|inn/.test(s) ? tower : /villa|garden/.test(s) ? villa : [villa, tower, huts, resort][c.h % 4]!
  return draw(c)
}

const SCENES: Record<Scene, (c: Ctx) => string> = { coast, temple, shrine, fort, terraces, mountains, city, food, hotel }

export function placeholderImage(seed: string, label = '', ratio: [number, number] = [16, 9]): string {
  const h = hash(seed)
  const w = ratio[0] * 100
  const ht = ratio[1] * 100
  const kind = sceneFor(seed, h)
  const list = PALETTES[kind]
  const r = rng(Math.imul(h, 2654435761) ^ 0x9e3779b9)
  // The palette follows the hash (not the shared random stream) so ids that differ by one letter still land apart.
  const c: Ctx = { w, ht, r, p: list[(h >> 5) % list.length]!, h, sx: w * (0.3 + r() * 0.4), seed: seed.toLowerCase() }
  // Half the scenes are mirrored, so two of a kind next to each other don't line up the same way.
  const mirror = (h >> 2) % 2 === 1
  const text = label.replace(/[<>&"]/g, '')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="xMidYMid slice">` +
    (mirror ? `<g transform="translate(${w} 0) scale(-1 1)">${SCENES[kind](c)}</g>` : SCENES[kind](c)) +
    // A faint vignette keeps edges calm and gives text laid over the image something to sit on.
    `<defs><radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient></defs><rect width="${w}" height="${ht}" fill="url(#vg)"/>` +
    (text ? `<text x="${w * 0.06}" y="${ht * 0.92}" font-family="system-ui,sans-serif" font-size="${ht * 0.07}" font-weight="600" fill="white">${text}</text>` : '') +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
