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

type Scene = 'coast' | 'temple' | 'terraces' | 'mountains' | 'city' | 'food' | 'hotel'

const KEYWORDS: Array<[Scene, RegExp]> = [
  ['food', /^(r-|g-shack|j-ramen|j-tsukiji|j-nishiki|j-kaiseki)|restaurant|cafe|warung/],
  ['hotel', /^h-|hotel|villa|resort|homestay|stay/],
  ['terraces', /tegallalang|sidemen|campuhan|monkey|tukad|ubud|terrace/],
  ['temple', /temple|uluwatu|tirta|tanah|senso|fushimi|kinkaku|meiji|kecak|gion|fort/],
  ['mountains', /japan|manali|mountain|arashiyama|pub-japan/],
  ['city', /paris|jaipur|shibuya|market|village|fontainhas|yanaka|teamlab|city/],
  ['coast', /bali|beach|bay|goa|sanur|seminyak|jimbaran|batu|palolem|baga|coast|cover/],
]

function sceneFor(seed: string, h: number): Scene {
  for (const [scene, re] of KEYWORDS) if (re.test(seed)) return scene
  return (['coast', 'mountains', 'city', 'temple'] as const)[h % 4]!
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

const PALETTES: Record<Scene, Palette[]> = {
  coast: [GOLDEN, ROSE, NOON, DAWN],
  temple: [GOLDEN, ROSE, BLUE],
  terraces: [DAWN, SAGE, GOLDEN],
  mountains: [BLUE, SAGE, DAWN, ROSE],
  city: [ROSE, BLUE, GOLDEN],
  food: [GOLDEN, ROSE, DAWN],
  hotel: [BLUE, ROSE, GOLDEN],
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

function coast(c: Ctx): string {
  const { w, ht, p, r, sx } = c
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
    palm(px, ht * 1.02, ht * 0.62, side ? ht * 0.1 : -ht * 0.1, p.ink) +
    palm(px + (side ? w * 0.07 : -w * 0.07), ht * 1.02, ht * 0.4, side ? ht * 0.05 : -ht * 0.05, mix(p.ink, p.sky[1], 0.15))
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

function hotel(c: Ctx): string {
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

const SCENES: Record<Scene, (c: Ctx) => string> = { coast, temple, terraces, mountains, city, food, hotel }

export function placeholderImage(seed: string, label = '', ratio: [number, number] = [16, 9]): string {
  const h = hash(seed)
  const w = ratio[0] * 100
  const ht = ratio[1] * 100
  const kind = sceneFor(seed, h)
  const list = PALETTES[kind]
  const r = rng(Math.imul(h, 2654435761) ^ 0x9e3779b9)
  const c: Ctx = { w, ht, r, p: list[Math.floor(r() * list.length)]!, h, sx: w * (0.3 + r() * 0.4) }
  const text = label.replace(/[<>&"]/g, '')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="xMidYMid slice">` +
    SCENES[kind](c) +
    // A faint vignette keeps edges calm and gives text laid over the image something to sit on.
    `<defs><radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient></defs><rect width="${w}" height="${ht}" fill="url(#vg)"/>` +
    (text ? `<text x="${w * 0.06}" y="${ht * 0.92}" font-family="system-ui,sans-serif" font-size="${ht * 0.07}" font-weight="600" fill="white">${text}</text>` : '') +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
