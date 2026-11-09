/**
 * Generated, licence-free illustrations: the default image for every destination, place, hotel and trip. A seed picks a
 * scene (coast, temple, terraces, mountains, city, food, hotel) and one of a few curated palettes, so the same place
 * always looks the same, any new place gets a card with no asset to source and no credit to give, and the whole app
 * shares one art direction: a bright, flat travel poster (clear daytime skies, a bold sun, saturated greens and
 * turquoise water, crisp shapes, a bird or a boat for life). The traveller's own photos replace these wherever they
 * exist (trip cover, memories).
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
/** Blend two #rrggbb colours; t = 0 gives a, t = 1 gives b. Only blend colours of one hue family (or with white). */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${f(ar, br)}${f(ag, bg)}${f(ab, bb)}`
}
const lighten = (c: string, t: number) => mix(c, '#ffffff', t)
/** Darken towards a deep navy rather than black, so shade stays coloured and never goes muddy. */
const deepen = (c: string, t: number) => mix(c, '#0b1d5c', t)

interface Palette {
  /** Sky from the top to the horizon, always inside one hue family (a blend across the colour wheel goes grey). */
  sky: [string, string, string]
  sun: string
  /** Water from the horizon to the shore. */
  sea: [string, string]
  /** Distant hills and mountains. */
  far: string
  /** Foliage, light to deep. */
  green: [string, string, string]
  /** Deepest detail colour: rich, never black. */
  ink: string
  /** Bright pop for boats, umbrellas, cushions and food. */
  accent: string
  /** Window glass. */
  glass: string
  /** Golden hour: the sun sits low and clouds go warm. */
  low?: boolean
}

const CLEAR: Palette = { sky: ['#1f6bff', '#58a8ff', '#c6e8ff'], sun: '#ffc21a', sea: ['#1676e0', '#1fcfc8'], far: '#7fb0f2', green: ['#9adb55', '#35b45a', '#11784a'], ink: '#0b3c8c', accent: '#ff8a1c', glass: '#c4e6ff' }
const TURQ: Palette = { sky: ['#0a8be0', '#35c2ee', '#c8f5f2'], sun: '#ffd23f', sea: ['#0b74d0', '#22d6c6'], far: '#6cc2e2', green: ['#a8dd4c', '#3fba4f', '#0f7f4c'], ink: '#06467a', accent: '#ff6f3c', glass: '#d2f5ff' }
const AZURE: Palette = { sky: ['#1a50f0', '#5a8cff', '#d4e3ff'], sun: '#ff9f1c', sea: ['#1650d8', '#28b8ea'], far: '#8ba9f5', green: ['#a2dc5a', '#2fa75a', '#0e6e4e'], ink: '#0c2a7a', accent: '#ff9f1c', glass: '#cfe0ff' }
const MINT: Palette = { sky: ['#1597e5', '#56cfe3', '#e0fbee'], sun: '#ffcc33', sea: ['#0e86d6', '#3fe0c4'], far: '#7fd3c6', green: ['#bce65a', '#4cc25a', '#16875a'], ink: '#0a5266', accent: '#ff6b4a', glass: '#dafaf2' }
const GOLDEN: Palette = { sky: ['#ff6a2b', '#ffa040', '#ffe08a'], sun: '#fff5c8', sea: ['#1a6ad6', '#24bccb'], far: '#f08c55', green: ['#c4dc4a', '#56a83f', '#1d6e40'], ink: '#6b2410', accent: '#ffd23f', glass: '#ffe08a', low: true }

/** Mostly clear daytime skies; golden hour is the minority. */
const PALETTES: Record<Scene, Palette[]> = {
  coast: [TURQ, CLEAR, AZURE, MINT, GOLDEN],
  temple: [CLEAR, AZURE, TURQ, GOLDEN],
  shrine: [CLEAR, MINT, AZURE, TURQ],
  fort: [CLEAR, AZURE, TURQ, GOLDEN],
  terraces: [MINT, CLEAR, TURQ, AZURE],
  mountains: [CLEAR, AZURE, TURQ, MINT],
  city: [AZURE, CLEAR, TURQ, GOLDEN],
  food: [CLEAR, TURQ, MINT, AZURE, GOLDEN],
  hotel: [TURQ, CLEAR, AZURE, MINT, GOLDEN],
}

const SAND = '#ffd98c'
const WHITE = '#ffffff'
/** Lamp-light yellow for lanterns and lit windows at golden hour. */
const WARM = '#ffd36b'

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
  /** A fresh id for each gradient a scene defines. */
  uid: () => string
}

const n = (x: number) => Math.round(x * 10) / 10

/** A puffy cloud: a shaded underside, then the lit body slightly above it. */
function cloud(x: number, y: number, s: number, col: string, shade: string): string {
  return puff(x, y + s * 0.12, s, shade) + puff(x - s * 0.04, y, s * 0.96, col)
}
function puff(x: number, y: number, s: number, col: string): string {
  return `<g fill="${col}"><rect x="${n(x - s * 1.5)}" y="${n(y - s * 0.4)}" width="${n(s * 3)}" height="${n(s * 0.4)}" rx="${n(s * 0.2)}"/>` +
    `<circle cx="${n(x - s * 0.7)}" cy="${n(y - s * 0.4)}" r="${n(s * 0.45)}"/><circle cx="${n(x + s * 0.05)}" cy="${n(y - s * 0.6)}" r="${n(s * 0.65)}"/><circle cx="${n(x + s * 0.8)}" cy="${n(y - s * 0.35)}" r="${n(s * 0.4)}"/></g>`
}

/** A few gulls: small curved Vs. */
function birds(c: Ctx, x: number, y: number, count: number): string {
  const { ht, r, p } = c
  return Array.from({ length: count }, (_, i) => {
    const s = ht * (0.018 + r() * 0.012)
    const bx = x + i * ht * 0.06 + r() * ht * 0.03
    const by = y + (r() - 0.5) * ht * 0.06
    return `<path d="M${n(bx - s)} ${n(by)} Q${n(bx - s * 0.5)} ${n(by - s * 0.6)} ${n(bx)} ${n(by)} Q${n(bx + s * 0.5)} ${n(by - s * 0.6)} ${n(bx + s)} ${n(by)}" stroke="${p.ink}" stroke-width="${n(ht * 0.006)}" stroke-linecap="round" fill="none" opacity=".75"/>`
  }).join('')
}

/** Sky gradient, a bold sun with two soft rings, puffy clouds and (sometimes) birds. */
function sky(c: Ctx, sunY: number, opts: { clouds?: number; birds?: boolean } = {}): string {
  const { w, ht, p, sx, r } = c
  const y = p.low ? sunY + ht * 0.06 : sunY - ht * 0.12
  const R = ht * (p.low ? 0.09 : 0.065)
  const cloudCol = p.low ? '#fff4e0' : WHITE
  const cloudShade = p.low ? '#ffd3a8' : mix(p.sky[2], p.sky[1], 0.35)
  const clouds = Array.from({ length: opts.clouds ?? 2 }, (_, i) => {
    // Keep clouds off the sun: left or right of it, alternating.
    const side = i % 2 === 0 ? -1 : 1
    const cx = Math.min(w * 0.92, Math.max(w * 0.08, sx + side * w * (0.22 + r() * 0.18)))
    return cloud(cx, ht * (0.14 + r() * 0.16), ht * (0.05 + r() * 0.03), cloudCol, cloudShade)
  }).join('')
  return (
    `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".55" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[2]}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${ht}" fill="url(#sk)"/>` +
    // A soft bloom of light around a sun that is lit from its centre.
    `<defs><radialGradient id="bloom"><stop offset="0" stop-color="${p.sun}" stop-opacity=".7"/><stop offset=".35" stop-color="${p.sun}" stop-opacity=".25"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="disc" cx=".4" cy=".4"><stop offset="0" stop-color="${lighten(p.sun, 0.6)}"/><stop offset="1" stop-color="${p.sun}"/></radialGradient></defs>` +
    `<circle cx="${n(sx)}" cy="${n(y)}" r="${n(R * 5)}" fill="url(#bloom)"/><circle cx="${n(sx)}" cy="${n(y)}" r="${n(R)}" fill="url(#disc)"/>` +
    clouds + (opts.birds === false || r() < 0.35 ? '' : birds(c, w * (0.15 + r() * 0.5), ht * (0.12 + r() * 0.12), 2 + Math.floor(r() * 2)))
  )
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
  // Lit from above: lighter along the ridge, deeper towards the foot, with a thin rim of light on the crest.
  const id = c.uid()
  return vgrad(id, lighten(fill, 0.16), deepen(fill, 0.14)) +
    `<path d="${d} L${w} ${ht}Z" fill="url(#${id})" opacity="${opacity}"/><path d="${d.slice(d.indexOf('L0') + 1).replace(/^0 /, 'M0 ')}" stroke="${WHITE}" stroke-opacity=".35" stroke-width="${n(ht * 0.005)}" fill="none"/>`
}

/** Atmospheric perspective: the air thickens towards the horizon line at y. */
function haze(c: Ctx, y: number, depth = 0.14, strength = 0.55): string {
  const id = c.uid()
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.p.sky[2]}" stop-opacity="0"/><stop offset="1" stop-color="${c.p.sky[2]}" stop-opacity="${strength}"/></linearGradient></defs>` +
    `<rect y="${n(y - c.ht * depth)}" width="${c.w}" height="${n(c.ht * depth)}" fill="url(#${id})"/>`
}

/** A soft, blurred contact shadow on the ground. */
const shadow = (x: number, y: number, rx: number, ry: number, opacity = 0.22) =>
  `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="#0b1d5c" opacity="${opacity}" filter="url(#soft)"/>`

/** A face lit from the top left: [the gradient's definition, the fill that uses it]. */
function lit(c: Ctx, col: string): [string, string] {
  const id = c.uid()
  return [`<defs><linearGradient id="${id}" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${lighten(col, 0.2)}"/><stop offset="1" stop-color="${deepen(col, 0.08)}"/></linearGradient></defs>`, `url(#${id})`]
}

/** A vertical gradient fill, defined once under `id`. */
const vgrad = (id: string, top: string, bottom: string) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`

/** A palm tree: a curved trunk and two tones of drooping fronds. */
function palm(c: Ctx, x: number, y: number, height: number, lean: number): string {
  const { p } = c
  const tx = x + lean
  const ty = y - height
  const len = height * 0.52
  const fronds = [-172, -148, -122, -92, -62, -34, -8]
    .map((deg, i) => {
      const a = (deg * Math.PI) / 180
      const tipX = tx + Math.cos(a) * len
      const tipY = ty + Math.sin(a) * len + len * 0.38
      const cx = tx + Math.cos(a) * len * 0.55
      const cy = ty + Math.sin(a) * len * 0.55 - len * 0.2
      return `<path d="M${n(tx)} ${n(ty)} Q${n(cx)} ${n(cy)} ${n(tipX)} ${n(tipY)} Q${n(cx)} ${n(cy + len * 0.2)} ${n(tx)} ${n(ty)}Z" fill="${i % 2 ? p.green[1] : p.green[2]}"/>`
    })
    .join('')
  return shadow(x + height * 0.1, y, height * 0.2, height * 0.035) +
    `<path d="M${n(x)} ${n(y)} Q${n(x + lean * 0.15)} ${n(y - height * 0.6)} ${n(tx)} ${n(ty)}" stroke="#a8652f" stroke-width="${n(height * 0.035)}" stroke-linecap="round" fill="none"/>${fronds}` +
    `<circle cx="${n(tx - len * 0.05)}" cy="${n(ty + len * 0.08)}" r="${n(len * 0.06)}" fill="#8a4f22"/><circle cx="${n(tx + len * 0.07)}" cy="${n(ty + len * 0.07)}" r="${n(len * 0.06)}" fill="#8a4f22"/>`
}

/** A grid of window panes in the palette's glass, each with a light glint. */
function windows(c: Ctx, x: number, y: number, bw: number, bh: number, cols: number, rows: number, glass = c.p.glass): string {
  const out: string[] = []
  const cw = bw / cols
  const rh = bh / rows
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++)
      if (c.r() > 0.2) out.push(`<rect x="${n(x + i * cw + cw * 0.22)}" y="${n(y + j * rh + rh * 0.22)}" width="${n(cw * 0.56)}" height="${n(rh * 0.56)}" fill="${glass}"/>`)
  return out.join('')
}

/** A striped beach umbrella. */
function umbrella(c: Ctx, x: number, y: number, s: number, col: string): string {
  return `<rect x="${n(x - s * 0.03)}" y="${n(y - s * 0.75)}" width="${n(s * 0.06)}" height="${n(s * 0.8)}" fill="${c.p.ink}"/>` +
    `<path d="M${n(x - s)} ${n(y - s * 0.6)} Q${n(x)} ${n(y - s * 1.35)} ${n(x + s)} ${n(y - s * 0.6)}Z" fill="${col}"/>` +
    `<path d="M${n(x - s * 0.35)} ${n(y - s * 0.6)} Q${n(x - s * 0.15)} ${n(y - s * 1.2)} ${n(x)} ${n(y - s * 1.12)} Q${n(x + s * 0.15)} ${n(y - s * 1.2)} ${n(x + s * 0.35)} ${n(y - s * 0.6)}Z" fill="${WHITE}"/>`
}

// ---------- scenes ----------

/** A Balinese-style outrigger boat: white hull with a coloured stripe and a curled bow. */
function boat(x: number, y: number, s: number, stripe: string): string {
  return `<path d="M${n(x - s)} ${n(y)} Q${n(x)} ${n(y + s * 0.3)} ${n(x + s)} ${n(y)} L${n(x + s * 1.2)} ${n(y - s * 0.16)} L${n(x + s * 0.85)} ${n(y - s * 0.03)} L${n(x - s * 0.85)} ${n(y - s * 0.03)} L${n(x - s * 1.2)} ${n(y - s * 0.16)}Z" fill="${WHITE}"/>` +
    `<path d="M${n(x - s * 0.92)} ${n(y + s * 0.04)} Q${n(x)} ${n(y + s * 0.22)} ${n(x + s * 0.92)} ${n(y + s * 0.04)}" stroke="${stripe}" stroke-width="${n(s * 0.08)}" fill="none"/>` +
    `<path d="M${n(x - s * 0.9)} ${n(y + s * 0.26)} L${n(x + s * 0.9)} ${n(y + s * 0.26)}" stroke="#a8652f" stroke-width="${n(s * 0.04)}"/>`
}

function coast(c: Ctx): string {
  const { w, ht, p, r, sx, h, seed } = c
  // Palm beaches and rocky headlands with boats; known places get the right one, others alternate by id.
  const cliffs = /^goa$|uluwatu|nyang|cliff|aguada|lighthouse|jimbaran|batu/.test(seed) || (!/seminyak|sanur|palolem|baga|kuta|beach/.test(seed) && (h >> 6) % 2 === 1)
  const lighthouse = /aguada|lighthouse/.test(seed)
  const hz = ht * 0.56
  const side = r() > 0.5
  const L = (x: number) => (side ? x : w - x)
  const glitter = Array.from({ length: 7 }, (_, i) => {
    const rw = w * (0.03 + i * 0.012 + r() * 0.015)
    return `<rect x="${n(sx - rw / 2 + (r() - 0.5) * w * 0.04)}" y="${n(hz + ht * (0.02 + i * 0.03))}" width="${n(rw)}" height="${n(ht * 0.008)}" rx="${n(ht * 0.004)}" fill="${WHITE}" opacity="${n(0.75 - i * 0.07)}"/>`
  }).join('')
  const sail = (x: number) => `<path d="M${n(x)} ${n(hz - ht * 0.005)} L${n(x)} ${n(hz - ht * 0.08)} L${n(x + ht * 0.05)} ${n(hz - ht * 0.005)}Z" fill="${WHITE}"/><path d="M${n(x - ht * 0.02)} ${n(hz)} L${n(x + ht * 0.06)} ${n(hz)}" stroke="${p.ink}" stroke-width="${n(ht * 0.008)}"/>`
  const shore = `M0 ${n(ht * 0.8)} Q${n(w * 0.3)} ${n(ht * 0.74)} ${n(w * 0.62)} ${n(ht * 0.82)} T${w} ${n(ht * 0.79)}`
  const rock = lighthouse ? '#d9763a' : /uluwatu|nyang/.test(seed) ? '#f0d3a0' : '#e58a45'
  const [rockDef, rockFill] = lit(c, rock)
  const headland = rockDef +
    `<path d="M${L(0)} ${n(ht * 0.86)} L${L(0)} ${n(ht * 0.3)} Q${n(L(w * 0.12))} ${n(ht * 0.26)} ${n(L(w * 0.2))} ${n(ht * 0.4)} L${n(L(w * 0.25))} ${n(ht * 0.6)} Q${n(L(w * 0.31))} ${n(ht * 0.66)} ${n(L(w * 0.28))} ${n(ht * 0.76)}Z" fill="${rockFill}"/>` +
    `<path d="M${n(L(w * 0.16))} ${n(ht * 0.34)} L${n(L(w * 0.21))} ${n(ht * 0.42)} L${n(L(w * 0.26))} ${n(ht * 0.6)} Q${n(L(w * 0.32))} ${n(ht * 0.66)} ${n(L(w * 0.29))} ${n(ht * 0.76)} L${n(L(w * 0.18))} ${n(ht * 0.78)}Z" fill="${mix(rock, '#8c3f1c', 0.35)}"/>` +
    `<path d="M${L(0)} ${n(ht * 0.34)} L${L(0)} ${n(ht * 0.29)} Q${n(L(w * 0.12))} ${n(ht * 0.24)} ${n(L(w * 0.21))} ${n(ht * 0.38)} Q${n(L(w * 0.1))} ${n(ht * 0.33)} ${L(0)} ${n(ht * 0.34)}Z" fill="${p.green[1]}"/>` +
    (lighthouse
      ? `<path d="M${n(L(w * 0.09))} ${n(ht * 0.29)} L${n(L(w * 0.1))} ${n(ht * 0.12)} L${n(L(w * 0.13))} ${n(ht * 0.12)} L${n(L(w * 0.14))} ${n(ht * 0.29)}Z" fill="${WHITE}"/>` +
        `<rect x="${n(Math.min(L(w * 0.095), L(w * 0.135)))}" y="${n(ht * 0.18)}" width="${n(w * 0.04)}" height="${n(ht * 0.03)}" fill="#ff4b3a"/><rect x="${n(Math.min(L(w * 0.098), L(w * 0.132)))}" y="${n(ht * 0.24)}" width="${n(w * 0.034)}" height="${n(ht * 0.025)}" fill="#ff4b3a"/>` +
        `<rect x="${n(Math.min(L(w * 0.1), L(w * 0.13)))}" y="${n(ht * 0.085)}" width="${n(w * 0.03)}" height="${n(ht * 0.035)}" fill="${p.sun}"/><path d="M${n(Math.min(L(w * 0.095), L(w * 0.135)))} ${n(ht * 0.085)} L${n(L(w * 0.115))} ${n(ht * 0.05)} L${n(Math.max(L(w * 0.095), L(w * 0.135)))} ${n(ht * 0.085)}Z" fill="#ff4b3a"/>`
      : '')
  return (
    sky(c, hz, { clouds: 2 }) +
    `<path d="M${L(w)} ${n(hz)} Q${n(L(w * 0.82))} ${n(hz - ht * 0.1)} ${n(L(w * 0.6))} ${n(hz)}Z" fill="${p.far}"/>` + haze(c, hz, 0.12) +
    vgrad('sea', p.sea[0], p.sea[1]) + `<rect y="${n(hz)}" width="${w}" height="${n(ht - hz)}" fill="url(#sea)"/>` +
    // A bright line where the sea meets the sky, and the sun's path on the water.
    `<rect y="${n(hz)}" width="${w}" height="${n(ht * 0.006)}" fill="${WHITE}" opacity=".55"/>${glitter}` +
    Array.from({ length: 3 }, (_, i) => {
      const y = hz + ht * (0.06 + i * 0.045)
      return `<path d="M${n(w * (0.1 + i * 0.2))} ${n(y)} q${n(w * 0.03)} ${n(-ht * 0.012)} ${n(w * 0.06)} 0" stroke="${WHITE}" stroke-opacity=".55" stroke-width="${n(ht * 0.006)}" stroke-linecap="round" fill="none"/>`
    }).join('') +
    sail(side ? w * 0.66 : w * 0.3) +
    `<path d="M0 ${ht} L${shore.slice(1)} L${w} ${ht}Z" fill="${SAND}"/>` +
    `<path d="${shore}" stroke="${WHITE}" stroke-width="${n(ht * 0.014)}" fill="none"/>` +
    (cliffs
      ? headland + shadow(w * 0.57, ht * 0.93, ht * 0.13, ht * 0.02) + boat(w * 0.56, ht * 0.9, ht * 0.11, p.accent) + shadow(w * 0.81, ht * 0.96, ht * 0.1, ht * 0.016) + boat(w * 0.8, ht * 0.94, ht * 0.08, AZURE.sky[0])
      : shadow(side ? w * 0.64 : w * 0.4, ht * 0.95, ht * 0.11, ht * 0.02) + umbrella(c, side ? w * 0.62 : w * 0.38, ht * 0.95, ht * 0.11, p.accent) +
        shadow(side ? w * 0.85 : w * 0.17, ht * 0.92, ht * 0.1, ht * 0.016) + boat(side ? w * 0.84 : w * 0.16, ht * 0.9, ht * 0.08, AZURE.sky[0]) +
        palm(c, L(w * 0.12), ht * 1.02, ht * 0.66, side ? ht * 0.1 : -ht * 0.1) +
        palm(c, L(w * 0.2), ht * 1.02, ht * 0.44, side ? ht * 0.06 : -ht * 0.06))
  )
}

/** Balinese temple: a terracotta split gate (candi bentar) between tiered meru shrines, on a green lawn. */
function temple(c: Ctx): string {
  const { w, ht, p, r } = c
  const brick = '#e06a3c'
  const brickShade = '#b04826'
  const thatch = '#5a3424'
  const cx = w * (0.46 + r() * 0.08)
  const base = ht * 0.8
  const gap = ht * 0.08
  const half = ht * 0.22
  const top = ht * 0.36
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
    const poly = pts.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')
    // Inner face in shade gives the gate its depth; light ledges pick out each tier.
    return `<polygon points="${poly}" fill="${dir === 1 ? brickShade : brick}"/>` +
      `<rect x="${n(dir === 1 ? x0 : x0 - ht * 0.025)}" y="${n(top)}" width="${n(ht * 0.025)}" height="${n(base - top)}" fill="${dir === 1 ? brick : brickShade}"/>` +
      Array.from({ length: steps }, (_, i) => `<rect x="${n(dir === 1 ? x0 : x0 - (half * (i + 1)) / steps)}" y="${n(top + i * sh)}" width="${n((half * (i + 1)) / steps)}" height="${n(ht * 0.008)}" fill="#f6b38a"/>`).join('') +
      `<rect x="${n(x0 + dir * ht * 0.012 - ht * 0.02)}" y="${n(top - ht * 0.06)}" width="${n(ht * 0.04)}" height="${n(ht * 0.06)}" fill="${brick}"/>`
  }
  const meru = (x: number, s: number) =>
    `<rect x="${n(x - s * 0.5)}" y="${n(base - ht * 0.18)}" width="${n(s)}" height="${n(ht * 0.18)}" fill="${brick}"/>` +
    [0, 1, 2, 3].map((i) => `<polygon points="${n(x - s * (1 - i * 0.2))},${n(base - ht * 0.18 - i * s * 0.55)} ${n(x + s * (1 - i * 0.2))},${n(base - ht * 0.18 - i * s * 0.55)} ${n(x + s * (0.78 - i * 0.2))},${n(base - ht * 0.18 - i * s * 0.55 - s * 0.45)} ${n(x - s * (0.78 - i * 0.2))},${n(base - ht * 0.18 - i * s * 0.55 - s * 0.45)}" fill="${thatch}"/>`).join('')
  // A tall bamboo penjor bending over, with a hanging ornament.
  const penjor = (x: number, dir: 1 | -1) =>
    `<path d="M${n(x)} ${n(base)} Q${n(x)} ${n(ht * 0.2)} ${n(x + dir * w * 0.08)} ${n(ht * 0.16)}" stroke="#e9b949" stroke-width="${n(ht * 0.01)}" fill="none"/><circle cx="${n(x + dir * w * 0.08)}" cy="${n(ht * 0.22)}" r="${n(ht * 0.018)}" fill="${p.accent}"/>`
  const flowers = Array.from({ length: 8 }, () => `<circle cx="${n(w * r())}" cy="${n(ht * (0.86 + r() * 0.1))}" r="${n(ht * 0.012)}" fill="${r() > 0.5 ? '#ffffff' : '#ffd23f'}"/>`).join('')
  return (
    sky(c, ht * 0.44) +
    hills(c, 0.64, 0.1, 5, p.far) + haze(c, ht * 0.7, 0.16) +
    hills(c, 0.74, 0.06, 6, p.green[0]) +
    meru(cx - ht * 0.55, ht * 0.07) + meru(cx + ht * 0.6, ht * 0.06) +
    penjor(cx - gap - half - ht * 0.04, -1) +
    shadow(cx, base, half + gap, ht * 0.025, 0.3) + gateHalf(-1) + gateHalf(1) +
    `<rect y="${n(base)}" width="${w}" height="${n(ht - base)}" fill="${p.green[1]}"/>` +
    `<path d="M${n(cx - gap)} ${n(base)} L${n(cx + gap)} ${n(base)} L${n(cx + gap * 2.2)} ${ht} L${n(cx - gap * 2.2)} ${ht}Z" fill="#f2d3a6"/>` + flowers +
    palm(c, w * 0.06, ht * 1.02, ht * 0.7, ht * 0.08) + palm(c, w * 0.95, ht * 1.02, ht * 0.5, -ht * 0.06)
  )
}

/** Japanese shrine: green hills, a white-and-vermilion pagoda, cherry blossom and a vermilion torii in front. */
function shrine(c: Ctx): string {
  const { w, ht, p, r } = c
  const red = '#ff4a1f'
  const roof = '#1d4f6e'
  const tx = w * (0.62 + r() * 0.12)
  const tw = ht * 0.42
  const top = ht * 0.42
  const base = ht * 0.86
  const torii =
    `<path d="M${n(tx - tw * 0.72)} ${n(top + ht * 0.02)} Q${n(tx)} ${n(top - ht * 0.03)} ${n(tx + tw * 0.72)} ${n(top + ht * 0.02)} L${n(tx + tw * 0.68)} ${n(top + ht * 0.055)} Q${n(tx)} ${n(top + ht * 0.02)} ${n(tx - tw * 0.68)} ${n(top + ht * 0.055)}Z" fill="${p.ink}"/>` +
    `<rect x="${n(tx - tw * 0.6)}" y="${n(top + ht * 0.05)}" width="${n(tw * 1.2)}" height="${n(ht * 0.035)}" fill="${red}"/>` +
    `<rect x="${n(tx - tw * 0.56)}" y="${n(top + ht * 0.13)}" width="${n(tw * 1.12)}" height="${n(ht * 0.028)}" fill="${red}"/>` +
    `<rect x="${n(tx - ht * 0.012)}" y="${n(top + ht * 0.085)}" width="${n(ht * 0.024)}" height="${n(ht * 0.05)}" fill="${red}"/>` +
    [-1, 1].map((d) => `<rect x="${n(tx + d * tw * 0.4 - ht * 0.02)}" y="${n(top + ht * 0.05)}" width="${n(ht * 0.04)}" height="${n(base - top - ht * 0.05)}" fill="${red}"/><rect x="${n(tx + d * tw * 0.4 - ht * 0.027)}" y="${n(base - ht * 0.03)}" width="${n(ht * 0.054)}" height="${n(ht * 0.03)}" fill="${p.ink}"/>`).join('')
  const px = w * (0.2 + r() * 0.1)
  const tiers = 5
  const pagoda = Array.from({ length: tiers }, (_, i) => {
    const y = ht * 0.74 - i * ht * 0.085
    const half = ht * (0.13 - i * 0.017)
    return `<rect x="${n(px - half * 0.55)}" y="${n(y - ht * 0.05)}" width="${n(half * 1.1)}" height="${n(ht * 0.05)}" fill="${i % 2 ? WHITE : red}"/>` +
      `<path d="M${n(px - half * 1.15)} ${n(y - ht * 0.045)} Q${n(px - half * 0.6)} ${n(y - ht * 0.06)} ${n(px)} ${n(y - ht * 0.085)} Q${n(px + half * 0.6)} ${n(y - ht * 0.06)} ${n(px + half * 1.15)} ${n(y - ht * 0.045)}Z" fill="${roof}"/>`
  }).join('') + `<rect x="${n(px - ht * 0.005)}" y="${n(ht * 0.74 - tiers * ht * 0.085 - ht * 0.09)}" width="${n(ht * 0.01)}" height="${n(ht * 0.1)}" fill="${roof}"/>`
  const blossom = (bx: number, by: number, s: number) =>
    `<path d="M${n(bx)} ${n(by + s * 1.4)} Q${n(bx + s * 0.1)} ${n(by + s * 0.5)} ${n(bx)} ${n(by)}" stroke="#8a4f3a" stroke-width="${n(s * 0.14)}" fill="none"/>` +
    Array.from({ length: 7 }, () => `<circle cx="${n(bx + (r() - 0.5) * s * 1.6)}" cy="${n(by + (r() - 0.6) * s)}" r="${n(s * (0.35 + r() * 0.25))}" fill="${r() > 0.5 ? '#ffb3cb' : '#ff8fb4'}"/>`).join('')
  return (
    sky(c, ht * 0.36) +
    hills(c, 0.58, 0.12, 4, p.far) + haze(c, ht * 0.66, 0.16) +
    hills(c, 0.72, 0.06, 5, p.green[0]) + pagoda +
    hills(c, 0.84, 0.04, 6, p.green[1]) +
    `<rect y="${n(base)}" width="${w}" height="${n(ht - base)}" fill="#f2d3a6"/>` + torii +
    blossom(w * 0.06, ht * 0.62, ht * 0.12) + blossom(w * 0.42, ht * 0.72, ht * 0.08) + blossom(w * 0.96, ht * 0.66, ht * 0.1)
  )
}

/** A paper kite with a tail, for Rajasthan's skies. */
function kite(x: number, y: number, s: number, col: string): string {
  return `<polygon points="${n(x)},${n(y - s)} ${n(x + s * 0.7)},${n(y)} ${n(x)},${n(y + s)} ${n(x - s * 0.7)},${n(y)}" fill="${col}"/><path d="M${n(x)} ${n(y + s)} q${n(s * 0.4)} ${n(s * 0.8)} ${n(-s * 0.1)} ${n(s * 1.6)}" stroke="${col}" stroke-width="${n(s * 0.08)}" fill="none"/>`
}

/** Rajput fort or palace: crenellated walls and bastions, a palace block with domed chhatris; some stand on a lake. */
function fort(c: Ctx): string {
  const { w, ht, p, r, seed, h } = c
  const lake = /udaipur|lake|palace/.test(seed)
  // Delhi and Agra's red sandstone, Jaipur's pink, Udaipur's white marble, Jodhpur's ochre above blue houses.
  const stone = /delhi|agra|red/.test(seed) ? '#d04a2c' : /jaipur|pink/.test(seed) ? '#f08a6e' : lake ? '#fff4e2' : '#eba052'
  const shade = lake ? '#f2c890' : mix(stone, '#7a2a12', 0.3)
  const light = lighten(stone, 0.3)
  const [wallDef, wallFill] = lit(c, stone)
  const [rockDef, rockFill] = lit(c, '#e39a55')
  const [palaceDef, palaceFill] = lit(c, light)
  const hill = /jodhpur|jaipur|amber|mehrangarh|hill/.test(seed) || (!lake && h % 3 === 1)
  const blue = /jodhpur|blue/.test(seed)
  const base = lake ? ht * 0.72 : hill ? ht * 0.6 : ht * 0.78
  const wallTop = base - ht * 0.16
  const x0 = w * (0.12 + r() * 0.08)
  const x1 = w * (0.82 + r() * 0.06)
  const merlons = (a: number, b: number, y: number) => {
    let out = ''
    for (let x = a; x < b; x += ht * 0.035) out += `<rect x="${n(x)}" y="${n(y - ht * 0.02)}" width="${n(ht * 0.02)}" height="${n(ht * 0.02)}" fill="${shade}"/>`
    return out
  }
  const bastion = (x: number) => `<path d="M${n(x - ht * 0.06)} ${n(base)} L${n(x - ht * 0.05)} ${n(wallTop - ht * 0.03)} L${n(x + ht * 0.05)} ${n(wallTop - ht * 0.03)} L${n(x + ht * 0.06)} ${n(base)}Z" fill="${stone}"/><path d="M${n(x + ht * 0.01)} ${n(base)} L${n(x + ht * 0.01)} ${n(wallTop - ht * 0.03)} L${n(x + ht * 0.05)} ${n(wallTop - ht * 0.03)} L${n(x + ht * 0.06)} ${n(base)}Z" fill="${shade}"/>` + merlons(x - ht * 0.05, x + ht * 0.05, wallTop - ht * 0.03)
  const dome = (x: number, y: number, s: number) =>
    `<rect x="${n(x - s)}" y="${n(y)}" width="${n(s * 2)}" height="${n(s * 0.9)}" fill="${stone}"/><rect x="${n(x - s * 0.7)}" y="${n(y + s * 0.2)}" width="${n(s * 0.35)}" height="${n(s * 0.7)}" fill="${shade}"/><rect x="${n(x + s * 0.35)}" y="${n(y + s * 0.2)}" width="${n(s * 0.35)}" height="${n(s * 0.7)}" fill="${shade}"/>` +
    `<path d="M${n(x - s * 1.1)} ${n(y)} Q${n(x - s * 1.05)} ${n(y - s * 1.2)} ${n(x)} ${n(y - s * 1.35)} Q${n(x + s * 1.05)} ${n(y - s * 1.2)} ${n(x + s * 1.1)} ${n(y)}Z" fill="${light}"/><rect x="${n(x - s * 0.06)}" y="${n(y - s * 1.7)}" width="${n(s * 0.12)}" height="${n(s * 0.4)}" fill="${p.accent}"/>`
  const px = w * (0.38 + r() * 0.12)
  const pw = w * 0.3
  const pTop = wallTop - ht * 0.2
  const arches = Array.from({ length: 6 }, (_, i) => {
    const ax = px + pw * (0.08 + i * 0.15)
    return `<path d="M${n(ax)} ${n(pTop + ht * 0.13)} L${n(ax)} ${n(pTop + ht * 0.08)} Q${n(ax + pw * 0.04)} ${n(pTop + ht * 0.045)} ${n(ax + pw * 0.08)} ${n(pTop + ht * 0.08)} L${n(ax + pw * 0.08)} ${n(pTop + ht * 0.13)}Z" fill="${p.low ? WARM : shade}"/>`
  }).join('')
  const houses = Array.from({ length: blue ? 26 : 0 }, () => {
    const bx = r() * w
    const bw = w * (0.025 + r() * 0.03)
    const bh = ht * (0.04 + r() * 0.05)
    const col = ['#2f6bff', '#5a95ff', '#8fb8ff', '#3d7fe6'][Math.floor(r() * 4)]!
    return `<rect x="${n(bx)}" y="${n(ht - ht * 0.16 - bh + r() * ht * 0.1)}" width="${n(bw)}" height="${n(bh + ht * 0.2)}" fill="${col}"/>`
  }).join('')
  const ground = lake
    ? vgrad('lk', p.sea[1], p.sea[0]) + `<rect y="${n(base)}" width="${w}" height="${n(ht - base)}" fill="url(#lk)"/>` +
      `<rect x="${n(px)}" y="${n(base)}" width="${n(pw)}" height="${n((base - pTop) * 0.6)}" fill="${WHITE}" opacity=".3"/>` +
      Array.from({ length: 6 }, (_, i) => `<rect x="${n(w * (0.1 + r() * 0.7))}" y="${n(base + ht * (0.04 + i * 0.035))}" width="${n(w * (0.05 + r() * 0.12))}" height="${n(ht * 0.006)}" fill="${WHITE}" opacity=".5"/>`).join('') +
      boat(w * 0.25, ht * 0.9, ht * 0.06, p.accent)
    : hill
      ? `<path d="M0 ${ht} L0 ${n(base + ht * 0.12)} Q${n(w * 0.1)} ${n(base + ht * 0.02)} ${n(w * 0.25)} ${n(base)} L${n(w * 0.8)} ${n(base - ht * 0.01)} Q${n(w * 0.92)} ${n(base + ht * 0.04)} ${w} ${n(base + ht * 0.14)} L${w} ${ht}Z" fill="${rockFill}"/>` +
        `<path d="M${n(w * 0.45)} ${ht} L${n(w * 0.55)} ${n(base)} L${n(w * 0.8)} ${n(base - ht * 0.01)} Q${n(w * 0.92)} ${n(base + ht * 0.04)} ${w} ${n(base + ht * 0.14)} L${w} ${ht}Z" fill="#c4743c" opacity=".7"/>` + houses
      : `<path d="M0 ${ht} L0 ${n(base + ht * 0.02)} Q${n(w * 0.3)} ${n(base - ht * 0.03)} ${n(w * 0.55)} ${n(base + ht * 0.01)} T${w} ${n(base)} L${w} ${ht}Z" fill="${p.green[1]}"/>` +
        // A gateway arch in the wall for forts on flat ground.
        `<path d="M${n(x0 + (x1 - x0) * 0.22)} ${n(base)} L${n(x0 + (x1 - x0) * 0.22)} ${n(wallTop + ht * 0.06)} Q${n(x0 + (x1 - x0) * 0.25)} ${n(wallTop + ht * 0.01)} ${n(x0 + (x1 - x0) * 0.28)} ${n(wallTop + ht * 0.06)} L${n(x0 + (x1 - x0) * 0.28)} ${n(base)}Z" fill="${mix(shade, '#7a2a12', 0.4)}"/>`
  const kites = /jaipur|jodhpur|rajasthan/.test(seed) || h % 2 === 0
    ? kite(w * (0.12 + r() * 0.1), ht * 0.16, ht * 0.035, p.accent) + kite(w * (0.8 + r() * 0.1), ht * 0.1, ht * 0.028, '#ff4fa0')
    : ''
  return (
    sky(c, ht * 0.42, { clouds: 1 }) + hills(c, 0.62, 0.08, 5, p.far) + haze(c, ht * 0.66, 0.16) + kites +
    wallDef + palaceDef + rockDef +
    `<rect x="${n(x0)}" y="${n(wallTop)}" width="${n(x1 - x0)}" height="${n(base - wallTop)}" fill="${wallFill}"/>` +
    `<rect x="${n(x0)}" y="${n(base - ht * 0.03)}" width="${n(x1 - x0)}" height="${n(ht * 0.03)}" fill="${shade}"/>` + merlons(x0, x1, wallTop) +
    bastion(x0) + bastion(x1) + bastion((x0 + x1) / 2 + w * 0.17) +
    `<rect x="${n(px)}" y="${n(pTop)}" width="${n(pw)}" height="${n(wallTop - pTop + ht * 0.02)}" fill="${palaceFill}"/>` + arches +
    `<rect x="${n(px)}" y="${n(pTop + ht * 0.15)}" width="${n(pw)}" height="${n(ht * 0.012)}" fill="${shade}"/>` +
    dome(px + pw * 0.12, pTop - ht * 0.03, ht * 0.035) + dome(px + pw * 0.5, pTop - ht * 0.045, ht * 0.05) + dome(px + pw * 0.88, pTop - ht * 0.03, ht * 0.035) +
    ground
  )
}

/** Rice terraces: a blue volcano behind, stepped bands of vivid green with sky-blue water, palms and a hut. */
function terraces(c: Ctx): string {
  const { w, ht, p, r } = c
  const greens = ['#127a45', '#2fa84f', '#5cc94a', '#9be15d', '#c9f06b']
  const bands = Array.from({ length: 6 }, (_, i) => {
    const y = ht * (0.5 + i * 0.085)
    const amp = ht * (0.03 + i * 0.012)
    const ph = r() * 6
    const top: string[] = []
    for (let k = 0; k <= 8; k++) top.push(`${n((k * w) / 8)},${n(y - Math.sin(k * 0.9 + ph) * amp)}`)
    const edge = top.join(' L')
    const col = greens[(i + 2) % 5]!
    const pond = r() > 0.45 ? `<ellipse cx="${n(w * (0.2 + r() * 0.6))}" cy="${n(y + ht * 0.03)}" rx="${n(w * 0.12)}" ry="${n(ht * 0.012)}" fill="${p.sky[1]}" opacity=".8"/>` : ''
    return `<path d="M0 ${ht} L${edge} L${w} ${ht}Z" fill="${col}"/><path d="M${edge}" stroke="${lighten(col, 0.45)}" stroke-width="${n(ht * 0.007)}" fill="none"/>${pond}`
  }).join('')
  const vx = w * (0.4 + r() * 0.2)
  const volcano =
    `<path d="M${n(vx - w * 0.45)} ${n(ht * 0.56)} L${n(vx - w * 0.05)} ${n(ht * 0.22)} L${n(vx + w * 0.05)} ${n(ht * 0.22)} L${n(vx + w * 0.45)} ${n(ht * 0.56)}Z" fill="${p.far}"/>` +
    `<path d="M${n(vx)} ${n(ht * 0.22)} L${n(vx + w * 0.05)} ${n(ht * 0.22)} L${n(vx + w * 0.45)} ${n(ht * 0.56)} L${n(vx + w * 0.1)} ${n(ht * 0.56)}Z" fill="${deepen(p.far, 0.12)}"/>`
  const hut = (x: number, y: number, s: number) =>
    `<rect x="${n(x - s * 0.04)}" y="${n(y - s * 0.4)}" width="${n(s * 0.08)}" height="${n(s * 0.4)}" fill="#a8652f"/><rect x="${n(x + s * 0.5)}" y="${n(y - s * 0.4)}" width="${n(s * 0.08)}" height="${n(s * 0.4)}" fill="#a8652f"/>` +
    `<path d="M${n(x - s * 0.25)} ${n(y - s * 0.38)} L${n(x + s * 0.27)} ${n(y - s * 0.9)} L${n(x + s * 0.85)} ${n(y - s * 0.38)}Z" fill="#e8a640"/>`
  return (
    sky(c, ht * 0.36) + volcano + haze(c, ht * 0.56, 0.2) +
    hills(c, 0.52, 0.05, 6, mix(p.far, p.green[0], 0.5)) + bands +
    hut(w * (0.55 + r() * 0.15), ht * 0.72, ht * 0.14) +
    palm(c, w * 0.9, ht * 0.98, ht * 0.62, -ht * 0.07) + palm(c, w * 0.8, ht * 1.0, ht * 0.42, -ht * 0.04)
  )
}

function mountains(c: Ctx): string {
  const { w, ht, p, r, seed } = c
  // Two-tone faceted peaks: a lit face and a shaded face, like a poster print.
  const peak = (x: number, y: number, bw: number, col: string) => {
    const lit = lighten(col, 0.2)
    const dark = deepen(col, 0.15)
    const body = `<polygon points="${n(x - bw)},${ht} ${n(x)},${n(y)} ${n(x + bw)},${ht}" fill="${lit}"/><polygon points="${n(x)},${n(y)} ${n(x + bw)},${ht} ${n(x + bw * 0.15)},${ht}" fill="${dark}"/>`
    const sy = y + (ht - y) * 0.22
    const cap = `<polygon points="${n(x)},${n(y)} ${n(x - bw * 0.22)},${n(sy)} ${n(x - bw * 0.1)},${n(sy - ht * 0.02)} ${n(x)},${n(sy + ht * 0.02)} ${n(x + bw * 0.1)},${n(sy - ht * 0.015)} ${n(x + bw * 0.22)},${n(sy)}" fill="${WHITE}"/>` +
      `<polygon points="${n(x)},${n(y)} ${n(x + bw * 0.22)},${n(sy)} ${n(x + bw * 0.1)},${n(sy - ht * 0.015)} ${n(x + bw * 0.04)},${n(sy + ht * 0.005)}" fill="#d6e4ff"/>`
    return body + cap
  }
  const pine = (x: number, y: number, s: number, col: string) =>
    [0, 1, 2].map((i) => `<polygon points="${n(x)},${n(y - s * (1.1 - i * 0.05) - i * s * 0.45 + s * 0.4)} ${n(x - s * (0.34 + i * 0.1))},${n(y - i * s * 0.45 + s * 0.4)} ${n(x + s * (0.34 + i * 0.1))},${n(y - i * s * 0.45 + s * 0.4)}" fill="${col}"/>`).join('') +
    `<rect x="${n(x - s * 0.04)}" y="${n(y + s * 0.4)}" width="${n(s * 0.08)}" height="${n(s * 0.25)}" fill="#a8652f"/>`
  // Prayer flags strung between two poles in the Himalaya; a red bridge over the river at Arashiyama.
  const flags = /manali|himalaya/.test(seed) || (c.h >> 3) % 2 === 0
    ? (() => {
        const ax = w * 0.55
        const bx = w * 0.95
        const ay = ht * 0.62
        const cols = ['#1f6bff', WHITE, '#ff4b3a', '#35b45a', '#ffd23f']
        return `<path d="M${n(ax)} ${n(ay)} Q${n((ax + bx) / 2)} ${n(ay + ht * 0.08)} ${n(bx)} ${n(ay - ht * 0.02)}" stroke="${p.ink}" stroke-width="${n(ht * 0.004)}" fill="none"/>` +
          Array.from({ length: 10 }, (_, i) => {
            const t = (i + 0.5) / 10
            const x = ax + (bx - ax) * t
            const y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * (ay + ht * 0.08) + t ** 2 * (ay - ht * 0.02)
            return `<polygon points="${n(x - ht * 0.015)},${n(y)} ${n(x + ht * 0.015)},${n(y)} ${n(x)},${n(y + ht * 0.04)}" fill="${cols[i % 5]}"/>`
          }).join('')
      })()
    : ''
  const tent = `<polygon points="${n(w * 0.32)},${n(ht * 0.9)} ${n(w * 0.38)},${n(ht * 0.8)} ${n(w * 0.44)},${n(ht * 0.9)}" fill="${p.accent}"/><polygon points="${n(w * 0.37)},${n(ht * 0.9)} ${n(w * 0.38)},${n(ht * 0.84)} ${n(w * 0.39)},${n(ht * 0.9)}" fill="${deepen(p.accent, 0.3)}"/>`
  const m1 = r()
  const range = /japan|arashiyama/.test(seed) ? '#4f7fe8' : p.far
  return (
    sky(c, ht * 0.38) +
    peak(w * (0.68 + m1 * 0.1), ht * 0.16, w * 0.36, deepen(range, 0.05)) +
    peak(w * 0.28, ht * 0.28, w * 0.36, range) + haze(c, ht * 0.7, 0.22, 0.65) +
    hills(c, 0.68, 0.08, 5, p.green[0]) +
    vgrad('lake', p.sea[0], p.sea[1]) +
    `<rect y="${n(ht * 0.78)}" width="${w}" height="${n(ht * 0.22)}" fill="url(#lake)"/>` +
    `<path d="M0 ${ht} L0 ${n(ht * 0.86)} Q${n(w * 0.25)} ${n(ht * 0.8)} ${n(w * 0.5)} ${n(ht * 0.9)} T${w} ${n(ht * 0.88)} L${w} ${ht}Z" fill="${p.green[1]}"/>` +
    flags + tent +
    pine(w * 0.07, ht * 0.84, ht * 0.2, p.green[2]) + pine(w * 0.14, ht * 0.9, ht * 0.14, p.green[2]) + pine(w * 0.93, ht * 0.85, ht * 0.22, p.green[2]) + pine(w * 0.86, ht * 0.92, ht * 0.13, p.green[2])
  )
}

/** Bright facades for city blocks and painted houses. */
const FACADES = ['#ffffff', '#ffd166', '#ff8c61', '#5b8cff', '#3ec7c2', '#ffb5a7', '#f7f0e0']

function city(c: Ctx): string {
  const { w, ht, p, r, seed } = c
  const town = /village|fontainhas|houses|yanaka|town|street|market/.test(seed)
  const pick = () => FACADES[Math.floor(r() * FACADES.length)]!
  const far = (y: number) => {
    let x = -w * 0.02
    let out = ''
    while (x < w) {
      const bw = w * (0.05 + r() * 0.06)
      const bh = ht * (0.12 + r() * 0.2)
      out += `<rect x="${n(x)}" y="${n(y - bh)}" width="${n(bw)}" height="${n(bh + ht)}" fill="${lighten(p.far, 0.15 + r() * 0.15)}"/>`
      x += bw + w * 0.006
    }
    return out
  }
  const blocks = (y: number) => {
    let x = -w * 0.02
    let out = ''
    while (x < w) {
      const bw = w * (0.07 + r() * 0.06)
      const bh = ht * (0.14 + r() * 0.22)
      const col = pick()
      out += `<rect x="${n(x)}" y="${n(y - bh)}" width="${n(bw)}" height="${n(bh + ht)}" fill="${col}"/><rect x="${n(x + bw * 0.82)}" y="${n(y - bh)}" width="${n(bw * 0.18)}" height="${n(bh + ht)}" fill="${deepen(col, 0.12)}"/>` +
        windows(c, x + bw * 0.06, y - bh + ht * 0.02, bw * 0.72, bh - ht * 0.04, 3, Math.max(2, Math.round(bh / (ht * 0.06))), col === '#5b8cff' ? '#cfe0ff' : '#5aa9ff')
      x += bw + w * 0.006
    }
    return out
  }
  // Painted houses with red tiled roofs and an awning or two (Goa's Latin quarter, Yanaka, markets).
  const houses = (y: number) => {
    let x = -w * 0.02
    let out = ''
    while (x < w) {
      const bw = w * (0.11 + r() * 0.05)
      const bh = ht * (0.16 + r() * 0.08)
      const col = pick()
      out += `<rect x="${n(x)}" y="${n(y - bh)}" width="${n(bw)}" height="${n(bh + ht)}" fill="${col}"/>` +
        `<polygon points="${n(x - bw * 0.04)},${n(y - bh)} ${n(x + bw * 0.5)},${n(y - bh - ht * 0.07)} ${n(x + bw * 1.04)},${n(y - bh)}" fill="#e0552e"/>` +
        `<rect x="${n(x + bw * 0.4)}" y="${n(y - ht * 0.09)}" width="${n(bw * 0.2)}" height="${n(ht * 0.09)}" fill="${deepen(col, 0.25)}"/>` +
        [0.12, 0.68].map((k) => `<rect x="${n(x + bw * k)}" y="${n(y - bh + ht * 0.04)}" width="${n(bw * 0.2)}" height="${n(ht * 0.06)}" fill="${p.glass}"/><rect x="${n(x + bw * (k - 0.02))}" y="${n(y - bh + ht * 0.1)}" width="${n(bw * 0.24)}" height="${n(ht * 0.012)}" fill="${WHITE}"/>`).join('') +
        (r() > 0.5 ? `<path d="M${n(x + bw * 0.05)} ${n(y - ht * 0.1)} L${n(x + bw * 0.95)} ${n(y - ht * 0.1)} L${n(x + bw)} ${n(y - ht * 0.06)} L${n(x)} ${n(y - ht * 0.06)}Z" fill="${p.accent}"/>` : '')
      x += bw + w * 0.008
    }
    return out
  }
  const dx = w * (0.4 + r() * 0.2)
  const lm = /paris/.test(seed)
    ? // An iron lattice tower.
      `<path d="M${n(dx - ht * 0.13)} ${n(ht * 0.76)} Q${n(dx - ht * 0.03)} ${n(ht * 0.5)} ${n(dx - ht * 0.01)} ${n(ht * 0.14)} L${n(dx + ht * 0.01)} ${n(ht * 0.14)} Q${n(dx + ht * 0.03)} ${n(ht * 0.5)} ${n(dx + ht * 0.13)} ${n(ht * 0.76)} L${n(dx + ht * 0.07)} ${n(ht * 0.76)} Q${n(dx)} ${n(ht * 0.62)} ${n(dx - ht * 0.07)} ${n(ht * 0.76)}Z" fill="#9a5a34"/>` +
      `<rect x="${n(dx - ht * 0.07)}" y="${n(ht * 0.55)}" width="${n(ht * 0.14)}" height="${n(ht * 0.015)}" fill="#9a5a34"/><rect x="${n(dx - ht * 0.04)}" y="${n(ht * 0.38)}" width="${n(ht * 0.08)}" height="${n(ht * 0.012)}" fill="#9a5a34"/>`
    : /tokyo|shibuya|teamlab/.test(seed) || r() > 0.5
      ? // A red-and-white broadcast tower.
        `<polygon points="${n(dx - ht * 0.08)},${n(ht * 0.76)} ${n(dx - ht * 0.012)},${n(ht * 0.16)} ${n(dx + ht * 0.012)},${n(ht * 0.16)} ${n(dx + ht * 0.08)},${n(ht * 0.76)}" fill="#ff4a1f"/>` +
        [0.34, 0.5, 0.64].map((y) => `<rect x="${n(dx - ht * (0.02 + (y - 0.16) * 0.11))}" y="${n(ht * y)}" width="${n(ht * (0.04 + (y - 0.16) * 0.22))}" height="${n(ht * 0.025)}" fill="${WHITE}"/>`).join('') +
        `<rect x="${n(dx - ht * 0.004)}" y="${n(ht * 0.08)}" width="${n(ht * 0.008)}" height="${n(ht * 0.08)}" fill="#ff4a1f"/>`
      : `<path d="M${n(dx - ht * 0.12)} ${n(ht * 0.72)} Q${n(dx)} ${n(ht * 0.34)} ${n(dx + ht * 0.12)} ${n(ht * 0.72)}Z" fill="${lighten(p.far, 0.1)}"/><rect x="${n(dx - ht * 0.004)}" y="${n(ht * 0.27)}" width="${n(ht * 0.008)}" height="${n(ht * 0.1)}" fill="${lighten(p.far, 0.1)}"/>`
  return (
    sky(c, ht * 0.5) +
    far(ht * 0.72) + haze(c, ht * 0.74, 0.18) + (town ? '' : lm) + (town ? houses(ht * 0.86) : blocks(ht * 0.86)) +
    vgrad('riv', p.sea[0], p.sea[1]) +
    `<rect y="${n(ht * 0.86)}" width="${w}" height="${n(ht * 0.14)}" fill="url(#riv)"/>` +
    `<rect y="${n(ht * 0.86)}" width="${w}" height="${n(ht * 0.012)}" fill="${WHITE}" opacity=".7"/>` +
    Array.from({ length: 6 }, () => `<rect x="${n(r() * w)}" y="${n(ht * (0.9 + r() * 0.07))}" width="${n(w * (0.03 + r() * 0.05))}" height="${n(ht * 0.007)}" rx="${n(ht * 0.003)}" fill="${WHITE}" opacity=".6"/>`).join('') +
    (town ? '' : boat(w * (0.2 + r() * 0.5), ht * 0.95, ht * 0.06, p.accent))
  )
}

/** Tablecloth colours for food scenes. */
const TABLES = ['#1f6bff', '#22c2c9', '#ffcf3a', '#ff7a59', '#2fa75a']

function food(c: Ctx): string {
  const { w, ht, p, r, h, seed } = c
  const cx = w * 0.5
  const cy = ht * 0.5
  const R = ht * 0.36
  const table = TABLES[(h >> 4) % TABLES.length]!
  const stripe = lighten(table, 0.18)
  const cloth = vgrad('tb', table, deepen(table, 0.08)) + `<rect width="${w}" height="${ht}" fill="url(#tb)"/>` +
    Array.from({ length: 8 }, (_, i) => `<rect x="${n((i * w) / 8)}" width="${n(w / 16)}" height="${ht}" fill="${stripe}" opacity=".5"/>`).join('')
  const plate = (x: number, y: number, rad: number, rim = '#ffffff', well = '#f3f6fb') =>
    `<circle cx="${n(x + ht * 0.02)}" cy="${n(y + ht * 0.035)}" r="${n(rad)}" fill="#0b1d5c" opacity=".35" filter="url(#soft)"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(rad)}" fill="${rim}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(rad * 0.84)}" fill="${well}"/><path d="M${n(x - rad * 0.92)} ${n(y)} A${n(rad * 0.92)} ${n(rad * 0.92)} 0 0 1 ${n(x)} ${n(y - rad * 0.92)}" stroke="${WHITE}" stroke-width="${n(rad * 0.05)}" stroke-linecap="round" fill="none" opacity=".9"/>`
  const leaf = (x: number, y: number, rot: number, s: number) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(s)}" ry="${n(s * 0.45)}" transform="rotate(${rot} ${n(x)} ${n(y)})" fill="${p.green[1]}"/><path d="M${n(x - s)} ${n(y)} L${n(x + s)} ${n(y)}" transform="rotate(${rot} ${n(x)} ${n(y)})" stroke="${p.green[2]}" stroke-width="${n(s * 0.06)}"/>`
  const lime = (x: number, y: number, s: number) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(s)}" fill="#7ccf3a"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(s * 0.78)}" fill="#d9f59a"/>` +
    [0, 60, 120].map((a) => `<path d="M${n(x - s * 0.78)} ${n(y)} L${n(x + s * 0.78)} ${n(y)}" transform="rotate(${a} ${n(x)} ${n(y)})" stroke="#9fdc5a" stroke-width="${n(s * 0.08)}"/>`).join('')
  let dish: string
  if (/thali|fish|goa|g-shack/.test(seed)) {
    // A steel thali: rice in the middle, small bowls of curry, dal and greens around it.
    const bowls = ['#ffb020', '#e8452c', '#7cc244', '#ffd96b', '#ff7a2f'].map((col, i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      const x = cx + Math.cos(a) * R * 0.58
      const y = cy + Math.sin(a) * R * 0.58
      return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(R * 0.26)}" fill="#c9d2df"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(R * 0.2)}" fill="${col}"/>`
    }).join('')
    dish = plate(cx, cy, R, '#dde3ec', '#eef2f7') + bowls + `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(R * 0.24)}" ry="${n(R * 0.18)}" fill="${WHITE}"/>` +
      `<ellipse cx="${n(cx + R * 0.05)}" cy="${n(cy + R * 0.03)}" rx="${n(R * 0.1)}" ry="${n(R * 0.06)}" fill="#ff7a2f" transform="rotate(-25 ${n(cx)} ${n(cy)})"/>`
  } else if (/ramen|noodle/.test(seed) || (h >> 3) % 3 === 0) {
    // A noodle bowl: golden broth, noodles, a halved egg, greens and a sheet of nori.
    const noodles = Array.from({ length: 5 }, (_, i) => `<path d="M${n(cx - R * 0.55)} ${n(cy - R * 0.2 + i * R * 0.12)} q${n(R * 0.27)} ${n(-R * 0.16)} ${n(R * 0.55)} 0 t${n(R * 0.55)} 0" stroke="#ffe08a" stroke-width="${n(ht * 0.013)}" stroke-linecap="round" fill="none"/>`).join('')
    dish = plate(cx, cy, R, WHITE, '#f2a33a') + `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 0.84)}" fill="none" stroke="${p.accent}" stroke-width="${n(R * 0.05)}" stroke-dasharray="${n(R * 0.12)} ${n(R * 0.08)}" opacity=".5"/>` + noodles +
      `<ellipse cx="${n(cx + R * 0.32)}" cy="${n(cy - R * 0.3)}" rx="${n(R * 0.2)}" ry="${n(R * 0.15)}" fill="${WHITE}"/><circle cx="${n(cx + R * 0.32)}" cy="${n(cy - R * 0.3)}" r="${n(R * 0.09)}" fill="#ffb020"/>` +
      `<rect x="${n(cx - R * 0.6)}" y="${n(cy - R * 0.55)}" width="${n(R * 0.22)}" height="${n(R * 0.42)}" fill="#1f3b2e" transform="rotate(-12 ${n(cx - R * 0.5)} ${n(cy - R * 0.35)})"/>` +
      Array.from({ length: 6 }, () => `<circle cx="${n(cx + (r() - 0.5) * R * 0.9)}" cy="${n(cy + R * (0.15 + r() * 0.35))}" r="${n(R * 0.05)}" fill="#7cc244"/>`).join('')
  } else {
    // A colourful bowl: rice, grilled pieces, fresh vegetables and herbs.
    const ing = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 + r()
      const d = R * (0.2 + r() * 0.45)
      const x = cx + Math.cos(a) * d
      const y = cy + Math.sin(a) * d
      const col = ['#ff7a2f', '#7cc244', '#ffffff', '#e8452c', '#ffd23f'][i % 5]!
      return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(ht * (0.028 + r() * 0.02))}" fill="${col}"/>`
    }).join('')
    dish = plate(cx, cy, R, WHITE, ['#ffe7b3', '#ffd28a', '#f6f1e3'][h % 3]!) + ing
  }
  return (
    cloth +
    leaf(w * 0.12, ht * 0.22, -35, ht * 0.12) + leaf(w * 0.16, ht * 0.34, 20, ht * 0.09) +
    plate(w * 0.84, ht * 0.26, ht * 0.12) + `<circle cx="${n(w * 0.84)}" cy="${n(ht * 0.26)}" r="${n(ht * 0.075)}" fill="${['#ff7a2f', '#e8452c', '#7cc244'][h % 3]}"/>` +
    lime(w * 0.15, ht * 0.8, ht * 0.06) +
    `<rect x="${n(w * 0.7)}" y="${n(ht * 0.78)}" width="${n(ht * 0.62)}" height="${n(ht * 0.024)}" rx="${n(ht * 0.012)}" transform="rotate(-14 ${n(w * 0.7)} ${n(ht * 0.78)})" fill="#f3d79c"/>` +
    `<rect x="${n(w * 0.7)}" y="${n(ht * 0.84)}" width="${n(ht * 0.62)}" height="${n(ht * 0.024)}" rx="${n(ht * 0.012)}" transform="rotate(-14 ${n(w * 0.7)} ${n(ht * 0.84)})" fill="#e8c27a"/>` +
    dish
  )
}

/** A long pool in two turquoise tones with a white edge. */
function pool(c: Ctx, x: number, y: number, pw: number, ph: number): string {
  return vgrad('pl', '#3fe0e6', '#0a9fd6') + `<rect x="${n(x)}" y="${n(y)}" width="${n(pw)}" height="${n(ph)}" rx="${n(c.ht * 0.02)}" fill="url(#pl)"/>` +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(pw)}" height="${n(ph)}" rx="${n(c.ht * 0.02)}" fill="none" stroke="${WHITE}" stroke-width="${n(c.ht * 0.012)}"/>` +
    Array.from({ length: 4 }, (_, i) => `<path d="M${n(x + pw * (0.1 + i * 0.22))} ${n(y + ph * (0.35 + (i % 2) * 0.25))} q${n(pw * 0.03)} ${n(-ph * 0.08)} ${n(pw * 0.06)} 0" stroke="${WHITE}" stroke-opacity=".7" stroke-width="${n(c.ht * 0.006)}" fill="none"/>`).join('')
}

function lounger(c: Ctx, x: number, y: number): string {
  const { w, ht, p } = c
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w * 0.06)}" height="${n(ht * 0.018)}" rx="${n(ht * 0.006)}" fill="${WHITE}"/><rect x="${n(x + w * 0.005)}" y="${n(y - ht * 0.004)}" width="${n(w * 0.04)}" height="${n(ht * 0.014)}" rx="${n(ht * 0.006)}" fill="${p.accent}"/>`
}

/** A white modern villa with big glass, a pool, loungers and bougainvillea. */
function villa(c: Ctx): string {
  const { w, ht, p, r } = c
  const bx = w * (0.14 + r() * 0.1)
  const bw = w * 0.52
  const by = ht * 0.44
  const bh = ht * 0.3
  const glass = (x: number, y: number, gw: number, gh: number) =>
    `<rect x="${n(x)}" y="${n(y)}" width="${n(gw)}" height="${n(gh)}" fill="${p.glass}"/><path d="M${n(x)} ${n(y + gh * 0.7)} L${n(x + gw * 0.6)} ${n(y)} L${n(x + gw * 0.85)} ${n(y)} L${n(x)} ${n(y + gh)}Z" fill="${WHITE}" opacity=".55"/>`
  const panes = [0, 1, 2].map((i) => glass(bx + bw * (0.06 + i * 0.31), by + ht * 0.07, bw * 0.26, ht * 0.18)).join('')
  const upper = `<rect x="${n(bx + bw * 0.35)}" y="${n(by - ht * 0.14)}" width="${n(bw * 0.55)}" height="${n(ht * 0.14)}" fill="${WHITE}"/>` + glass(bx + bw * 0.4, by - ht * 0.11, bw * 0.45, ht * 0.08) +
    `<rect x="${n(bx + bw * 0.32)}" y="${n(by - ht * 0.16)}" width="${n(bw * 0.61)}" height="${n(ht * 0.022)}" fill="#dfe8f7"/>`
  const bougainvillea = Array.from({ length: 12 }, () => `<circle cx="${n(bx - w * 0.01 + r() * w * 0.08)}" cy="${n(by + ht * (0.02 + r() * 0.2))}" r="${n(ht * (0.018 + r() * 0.018))}" fill="${r() > 0.4 ? '#ff4fa0' : '#ff8cc6'}"/>`).join('')
  return (
    sky(c, ht * 0.5) + hills(c, 0.6, 0.07, 6, p.green[0]) + haze(c, ht * 0.62, 0.12) +
    upper +
    shadow(bx + bw * 0.55, by + bh, bw * 0.6, ht * 0.03, 0.3) +
    `<rect x="${n(bx)}" y="${n(by)}" width="${n(bw)}" height="${n(bh)}" fill="${WHITE}"/><rect x="${n(bx)}" y="${n(by)}" width="${n(bw)}" height="${n(ht * 0.03)}" fill="#0b1d5c" opacity=".1"/><rect x="${n(bx + bw * 0.86)}" y="${n(by)}" width="${n(bw * 0.14)}" height="${n(bh)}" fill="#dfe8f7"/>` +
    `<rect x="${n(bx - w * 0.02)}" y="${n(by - ht * 0.02)}" width="${n(bw + w * 0.04)}" height="${n(ht * 0.025)}" fill="#dfe8f7"/>` +
    panes + bougainvillea +
    `<rect y="${n(ht * 0.74)}" width="${w}" height="${n(ht * 0.26)}" fill="#f6e7cf"/>` + lounger(c, w * 0.72, ht * 0.76) + lounger(c, w * 0.81, ht * 0.76) +
    pool(c, w * 0.06, ht * 0.8, w * 0.88, ht * 0.16) +
    palm(c, w * 0.05, ht * 0.78, ht * 0.56, ht * 0.07) + palm(c, w * 0.96, ht * 0.78, ht * 0.44, -ht * 0.05)
  )
}

/** A modern block of rooms with coloured balconies, above a long pool. */
function tower(c: Ctx): string {
  const { w, ht, p, r } = c
  const bx = w * (0.3 + r() * 0.2)
  const bw = w * 0.34
  const top = ht * 0.14
  const floors = 7
  const fh = (ht * 0.6 - top) / floors
  const face = ['#ffffff', '#ffe9d6', '#e3ecff'][c.h % 3]!
  const [faceDef, faceFill] = lit(c, face)
  const rows = Array.from({ length: floors }, (_, i) => {
    const y = top + i * fh
    return Array.from({ length: 5 }, (_, k) => `<rect x="${n(bx + bw * (0.05 + k * 0.19))}" y="${n(y + fh * 0.18)}" width="${n(bw * 0.14)}" height="${n(fh * 0.55)}" fill="${p.glass}"/>`).join('') +
      `<rect x="${n(bx - w * 0.01)}" y="${n(y + fh * 0.74)}" width="${n(bw + w * 0.02)}" height="${n(fh * 0.16)}" fill="${i % 2 ? p.accent : AZURE.sky[0]}" opacity="${r() > 0.5 ? 1 : 0.85}"/>`
  }).join('')
  return (
    sky(c, ht * 0.3) + hills(c, 0.62, 0.06, 6, p.green[0]) + haze(c, ht * 0.64, 0.12) + faceDef +
    shadow(bx + bw * 0.6, ht * 0.63, bw * 0.7, ht * 0.03, 0.3) +
    `<rect x="${n(bx)}" y="${n(top)}" width="${n(bw)}" height="${n(ht * 0.62 - top)}" fill="${faceFill}"/><rect x="${n(bx + bw * 0.9)}" y="${n(top)}" width="${n(bw * 0.1)}" height="${n(ht * 0.62 - top)}" fill="${deepen(face, 0.1)}"/>` + rows +
    `<rect x="${n(bx - w * 0.015)}" y="${n(top - ht * 0.025)}" width="${n(bw + w * 0.03)}" height="${n(ht * 0.025)}" fill="${p.ink}"/>` +
    `<rect y="${n(ht * 0.62)}" width="${w}" height="${n(ht * 0.38)}" fill="#f6e7cf"/>` +
    pool(c, w * 0.04, ht * 0.7, w * 0.92, ht * 0.2) +
    umbrella(c, w * 0.25, ht * 0.68, ht * 0.07, p.accent) + umbrella(c, w * 0.75, ht * 0.68, ht * 0.07, '#ff4fa0') +
    palm(c, w * 0.12, ht * 0.72, ht * 0.54, ht * 0.06) + palm(c, w * 0.9, ht * 0.7, ht * 0.48, -ht * 0.05)
  )
}

/** Thatched bungalows on short stilts among palms: homestays and small lodges. */
function huts(c: Ctx): string {
  const { w, ht, p, r } = c
  const hut = (x: number, s: number) =>
    `<rect x="${n(x - s * 0.55)}" y="${n(ht * 0.66 - s * 0.5)}" width="${n(s * 1.1)}" height="${n(s * 0.5)}" fill="#c47a3c"/>` +
    `<rect x="${n(x - s * 0.2)}" y="${n(ht * 0.66 - s * 0.36)}" width="${n(s * 0.4)}" height="${n(s * 0.36)}" fill="${p.low ? WARM : '#7a3f1c'}"/>` +
    `<path d="M${n(x - s * 0.85)} ${n(ht * 0.66 - s * 0.42)} L${n(x)} ${n(ht * 0.66 - s * 1.25)} L${n(x + s * 0.85)} ${n(ht * 0.66 - s * 0.42)}Z" fill="#f0b245"/>` +
    `<path d="M${n(x)} ${n(ht * 0.66 - s * 1.25)} L${n(x + s * 0.85)} ${n(ht * 0.66 - s * 0.42)} L${n(x + s * 0.2)} ${n(ht * 0.66 - s * 0.42)}Z" fill="#d68f2a"/>` +
    [-0.45, 0.45].map((d) => `<rect x="${n(x + d * s - s * 0.03)}" y="${n(ht * 0.66)}" width="${n(s * 0.06)}" height="${n(ht * 0.05)}" fill="#8a4f22"/>`).join('')
  const xs = [0.2, 0.42, 0.66, 0.86].map((x) => w * (x + (r() - 0.5) * 0.04))
  const flowers = Array.from({ length: 9 }, () => `<circle cx="${n(w * r())}" cy="${n(ht * (0.78 + r() * 0.16))}" r="${n(ht * 0.014)}" fill="${r() > 0.5 ? '#ff4fa0' : '#ffd23f'}"/>`).join('')
  return (
    sky(c, ht * 0.4) + hills(c, 0.56, 0.1, 5, p.far) + haze(c, ht * 0.62, 0.14) +
    hills(c, 0.68, 0.04, 6, p.green[0]) +
    palm(c, w * 0.32, ht * 0.72, ht * 0.62, ht * 0.05) + palm(c, w * 0.56, ht * 0.72, ht * 0.5, -ht * 0.06) +
    xs.map((x, i) => hut(x, ht * (0.16 - i * 0.01))).join('') +
    `<rect y="${n(ht * 0.71)}" width="${w}" height="${n(ht * 0.29)}" fill="${p.green[1]}"/>` + flowers +
    palm(c, w * 0.04, ht * 1.02, ht * 0.7, ht * 0.08) + palm(c, w * 0.97, ht * 1.02, ht * 0.56, -ht * 0.06)
  )
}

/** A beach resort: sea behind, a long low wing of rooms, striped umbrellas on the sand. */
function resort(c: Ctx): string {
  const { w, ht, p, r } = c
  const hz = ht * 0.46
  const wing = Array.from({ length: 2 }, (_, f) =>
    Array.from({ length: 9 }, (_, k) => `<rect x="${n(w * (0.1 + k * 0.088))}" y="${n(ht * (0.54 + f * 0.075))}" width="${n(w * 0.05)}" height="${n(ht * 0.045)}" fill="${p.glass}"/><rect x="${n(w * (0.095 + k * 0.088))}" y="${n(ht * (0.585 + f * 0.075))}" width="${n(w * 0.06)}" height="${n(ht * 0.01)}" fill="${r() > 0.5 ? p.accent : '#22c2c9'}"/>`).join('')).join('')
  return (
    sky(c, hz) +
    vgrad('sea', p.sea[0], p.sea[1]) + `<rect y="${n(hz)}" width="${w}" height="${n(ht * 0.2)}" fill="url(#sea)"/>` + `<rect y="${n(hz)}" width="${w}" height="${n(ht * 0.006)}" fill="${WHITE}" opacity=".55"/>` +
    shadow(w * 0.5, ht * 0.71, w * 0.46, ht * 0.03, 0.3) +
    `<rect x="${n(w * 0.07)}" y="${n(ht * 0.5)}" width="${n(w * 0.84)}" height="${n(ht * 0.2)}" fill="${WHITE}"/>` +
    `<rect x="${n(w * 0.05)}" y="${n(ht * 0.49)}" width="${n(w * 0.88)}" height="${n(ht * 0.025)}" fill="${p.ink}"/>` + wing +
    `<rect y="${n(ht * 0.7)}" width="${w}" height="${n(ht * 0.3)}" fill="${SAND}"/>` +
    umbrella(c, w * 0.28, ht * 0.9, ht * 0.09, p.accent) + umbrella(c, w * 0.5, ht * 0.92, ht * 0.09, '#22c2c9') + umbrella(c, w * 0.72, ht * 0.9, ht * 0.09, '#ff4fa0') +
    palm(c, w * 0.04, ht * 1.02, ht * 0.66, ht * 0.07) + palm(c, w * 0.96, ht * 1.02, ht * 0.5, -ht * 0.06)
  )
}

/** A bright room: bed, lamp, a plant and a window onto the sky (the second photo in a hotel's gallery). */
function room(c: Ctx): string {
  const { w, ht, p } = c
  const wall = '#fff6ea'
  const wx = w * 0.52
  const ww = w * 0.38
  const spread = [p.accent, AZURE.sky[0], '#22c2c9'][c.h % 3]!
  return (
    `<rect width="${w}" height="${ht}" fill="${wall}"/>` +
    `<svg x="${n(wx)}" y="${n(ht * 0.1)}" width="${n(ww)}" height="${n(ht * 0.48)}" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="xMidYMid slice">${sky({ ...c, r: rng(c.h) }, ht * 0.62, { birds: false })}${vgrad('rsea', p.sea[0], p.sea[1])}<rect y="${n(ht * 0.7)}" width="${w}" height="${n(ht * 0.3)}" fill="url(#rsea)"/></svg>` +
    `<rect x="${n(wx)}" y="${n(ht * 0.1)}" width="${n(ww)}" height="${n(ht * 0.48)}" fill="none" stroke="${WHITE}" stroke-width="${n(ht * 0.02)}"/>` +
    `<rect x="${n(wx + ww / 2 - ht * 0.005)}" y="${n(ht * 0.1)}" width="${n(ht * 0.01)}" height="${n(ht * 0.48)}" fill="${WHITE}"/>` +
    `<rect y="${n(ht * 0.7)}" width="${w}" height="${n(ht * 0.3)}" fill="#e7b07a"/>` +
    Array.from({ length: 5 }, (_, i) => `<rect y="${n(ht * (0.74 + i * 0.055))}" width="${w}" height="${n(ht * 0.006)}" fill="#d49a62"/>`).join('') +
    `<rect x="${n(w * 0.06)}" y="${n(ht * 0.34)}" width="${n(w * 0.36)}" height="${n(ht * 0.28)}" rx="${n(ht * 0.02)}" fill="${deepen(spread, 0.15)}"/>` +
    `<rect x="${n(w * 0.04)}" y="${n(ht * 0.58)}" width="${n(w * 0.42)}" height="${n(ht * 0.2)}" rx="${n(ht * 0.02)}" fill="${WHITE}"/>` +
    `<rect x="${n(w * 0.04)}" y="${n(ht * 0.66)}" width="${n(w * 0.42)}" height="${n(ht * 0.12)}" fill="${spread}"/>` +
    `<rect x="${n(w * 0.08)}" y="${n(ht * 0.52)}" width="${n(w * 0.14)}" height="${n(ht * 0.08)}" rx="${n(ht * 0.03)}" fill="${WHITE}"/><rect x="${n(w * 0.27)}" y="${n(ht * 0.52)}" width="${n(w * 0.14)}" height="${n(ht * 0.08)}" rx="${n(ht * 0.03)}" fill="${WHITE}"/>` +
    `<path d="M${n(w * 0.455)} ${n(ht * 0.44)} L${n(w * 0.495)} ${n(ht * 0.44)} L${n(w * 0.485)} ${n(ht * 0.37)} L${n(w * 0.465)} ${n(ht * 0.37)}Z" fill="${p.sun}"/>` +
    `<rect x="${n(w * 0.925)}" y="${n(ht * 0.62)}" width="${n(w * 0.05)}" height="${n(ht * 0.1)}" fill="${p.accent}"/>` +
    [-40, -15, 10, 35].map((a) => `<ellipse cx="${n(w * 0.95)}" cy="${n(ht * 0.52)}" rx="${n(ht * 0.03)}" ry="${n(ht * 0.1)}" transform="rotate(${a} ${n(w * 0.95)} ${n(ht * 0.62)})" fill="${p.green[1]}"/>`).join('')
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
  let ids = 0
  const c: Ctx = { w, ht, r, p: list[(h >> 5) % list.length]!, h, sx: w * (0.3 + r() * 0.4), seed: seed.toLowerCase(), uid: () => `g${ids++}` }
  // Half the scenes are mirrored, so two of a kind next to each other don't line up the same way.
  const mirror = (h >> 2) % 2 === 1
  const text = label.replace(/[<>&"]/g, '')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="xMidYMid slice">` +
    `<defs><filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n(ht * 0.012)}"/></filter></defs>` +
    (mirror ? `<g transform="translate(${w} 0) scale(-1 1)">${SCENES[kind](c)}</g>` : SCENES[kind](c)) +
    // Soft light: a glow from the top left, and the foreground settling into a little shade (which also gives text
    // laid over the bottom of the card a calmer ground).
    `<defs><linearGradient id="lt" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#0b1d5c" stop-opacity="0"/><stop offset="1" stop-color="#0b1d5c" stop-opacity=".12"/></linearGradient></defs>` +
    `<rect width="${w}" height="${ht}" fill="url(#lt)"/><rect width="${w}" height="${ht}" fill="url(#fg)"/>` +
    (text ? `<rect width="${w}" height="${ht}" fill="#0b1d5c" opacity=".35"/><text x="${w * 0.06}" y="${ht * 0.92}" font-family="system-ui,sans-serif" font-size="${ht * 0.07}" font-weight="600" fill="white">${text}</text>` : '') +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
