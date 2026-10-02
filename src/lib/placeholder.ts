/**
 * Generated, licence-free scenic illustrations used until real photography exists. Each seed maps to a scene
 * (coast, temple, mountains, city, food) with a deterministic palette, so the same place always looks the same.
 */
function hash(s: string): number {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

type Scene = 'coast' | 'temple' | 'mountains' | 'city' | 'food'

const KEYWORDS: Array<[Scene, RegExp]> = [
  ['food', /^(r-|g-shack|j-ramen|j-tsukiji|j-nishiki|j-kaiseki)/],
  ['temple', /temple|uluwatu|tirta|tanah|senso|fushimi|kinkaku|meiji|kecak|gion|monkey|fort|campuhan/],
  ['mountains', /japan|manali|mountain|tegallalang|arashiyama|campuhan|pub-japan/],
  ['city', /paris|jaipur|shibuya|market|village|fontainhas|yanaka|teamlab|city/],
  ['coast', /bali|beach|bay|goa|sanur|seminyak|jimbaran|batu|palolem|baga|coast|cover/],
]

function sceneFor(seed: string, h: number): Scene {
  for (const [scene, re] of KEYWORDS) if (re.test(seed)) return scene
  return (['coast', 'mountains', 'city', 'temple'] as const)[h % 4]!
}

const hsl = (h: number, s: number, l: number) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`

function scene(kind: Scene, h: number, w: number, ht: number): string {
  const warm = [18, 28, 340, 10, 36][h % 5]! // dusk hue family for the sky
  const sky = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${hsl(kind === 'mountains' ? 215 : warm + 200, 55, kind === 'food' ? 30 : 38)}"/>` +
    `<stop offset=".55" stop-color="${hsl(warm + 330, 70, 62)}"/>` +
    `<stop offset="1" stop-color="${hsl(warm, 85, 76)}"/></linearGradient>` +
    `<radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="${w}" height="${ht}" fill="url(#s)"/>`
  const sx = w * (0.3 + ((h >> 3) % 40) / 100)
  const sy = ht * 0.5
  const sun = `<circle cx="${sx}" cy="${sy}" r="${ht * 0.32}" fill="url(#g)"/><circle cx="${sx}" cy="${sy}" r="${ht * 0.07}" fill="#fff6e0"/>`
  const ridge = (base: number, amp: number, l: number, hh: number, seedShift: number) => {
    const pts = [`0,${ht}`]
    for (let i = 0; i <= 8; i++) pts.push(`${(i * w) / 8},${ht * base - Math.abs(Math.sin(i * 1.7 + seedShift + h)) * ht * amp}`)
    pts.push(`${w},${ht}`)
    return `<polygon points="${pts.join(' ')}" fill="${hsl(hh, 30, l)}"/>`
  }
  switch (kind) {
    case 'coast': {
      const waves = Array.from({ length: 5 }, (_, i) =>
        `<path d="M0 ${ht * (0.66 + i * 0.07)} Q ${w * 0.25} ${ht * (0.64 + i * 0.07)} ${w * 0.5} ${ht * (0.66 + i * 0.07)} T ${w} ${ht * (0.66 + i * 0.07)}" stroke="#fff" stroke-opacity="${0.35 - i * 0.05}" stroke-width="${ht * 0.006}" fill="none"/>`).join('')
      const px = w * (0.12 + ((h >> 5) % 20) / 100)
      const palm = `<path d="M${px} ${ht * 0.98} Q ${px + w * 0.02} ${ht * 0.7} ${px + w * 0.06} ${ht * 0.5}" stroke="#10222b" stroke-width="${ht * 0.012}" fill="none"/>` +
        [-50, -20, 15, 45, 75].map((a) => `<path d="M${px + w * 0.06} ${ht * 0.5} q ${w * 0.05 * Math.cos((a * Math.PI) / 180)} ${-ht * 0.12 * Math.sin(((a + 60) * Math.PI) / 180)} ${w * 0.1 * Math.cos((a * Math.PI) / 180)} ${ht * 0.07}" stroke="#10222b" stroke-width="${ht * 0.02}" stroke-linecap="round" fill="none"/>`).join('')
      return sky + sun + `<rect y="${ht * 0.62}" width="${w}" height="${ht * 0.38}" fill="${hsl(warm + 190, 55, 28)}"/>` +
        `<rect y="${ht * 0.62}" width="${w}" height="${ht * 0.02}" fill="#fff" fill-opacity=".35"/>` + waves + `<path d="M0 ${ht} L0 ${ht * 0.88} Q ${w * 0.3} ${ht * 0.82} ${w * 0.6} ${ht * 0.9} T ${w} ${ht * 0.86} L${w} ${ht}Z" fill="${hsl(warm + 20, 45, 72)}"/>` + palm
    }
    case 'temple': {
      const tx = w * (0.55 + ((h >> 4) % 20) / 100)
      const tier = (i: number) => `<rect x="${tx - ht * (0.2 - i * 0.04)}" y="${ht * (0.7 - i * 0.1)}" width="${ht * (0.4 - i * 0.08)}" height="${ht * 0.08}" fill="#14161f"/>`
      return sky + sun + ridge(0.75, 0.12, 24, warm + 200, 1) + `<rect x="${tx - ht * 0.03}" y="${ht * 0.28}" width="${ht * 0.06}" height="${ht * 0.1}" fill="#14161f"/>` + [0, 1, 2, 3].map(tier).join('') + ridge(0.92, 0.07, 14, warm + 210, 4)
    }
    case 'mountains': {
      const cap = (x: number, y: number, s: number) => `<polygon points="${x},${y} ${x - s},${y + s * 1.1} ${x - s * 0.35},${y + s * 0.85} ${x},${y + s * 1.2} ${x + s * 0.4},${y + s * 0.8} ${x + s},${y + s * 1.1}" fill="#fff" fill-opacity=".92"/>`
      const px = w * (0.35 + ((h >> 6) % 30) / 100)
      return sky + sun + `<polygon points="${px - w * 0.3},${ht} ${px},${ht * 0.28} ${px + w * 0.34},${ht}" fill="${hsl(225, 28, 38)}"/>` + cap(px, ht * 0.28, w * 0.07) + ridge(0.78, 0.18, 26, 215, 2) + ridge(0.92, 0.1, 15, 205, 5)
    }
    case 'city': {
      const bld = Array.from({ length: 14 }, (_, i) => {
        const bw = w / 14
        const bh = ht * (0.18 + (((h >> i) & 7) / 7) * 0.32)
        return `<rect x="${i * bw}" y="${ht - bh}" width="${bw * 0.86}" height="${bh}" fill="${hsl(warm + 215, 25, 16 + (i % 3) * 4)}"/>`
      }).join('')
      const dx = w * (0.4 + ((h >> 2) % 30) / 100)
      return sky + sun + `<path d="M${dx - ht * 0.16} ${ht * 0.8} Q ${dx} ${ht * 0.42} ${dx + ht * 0.16} ${ht * 0.8}Z" fill="#171a26"/><rect x="${dx - ht * 0.005}" y="${ht * 0.32}" width="${ht * 0.01}" height="${ht * 0.12}" fill="#171a26"/>` + bld
    }
    case 'food': {
      const cx = w / 2
      return `<defs><radialGradient id="t" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="${hsl(warm, 45, 42)}"/><stop offset="1" stop-color="${hsl(warm, 40, 18)}"/></radialGradient></defs>` +
        `<rect width="${w}" height="${ht}" fill="url(#t)"/><circle cx="${cx}" cy="${ht * 0.52}" r="${ht * 0.34}" fill="#f6f1e9"/><circle cx="${cx}" cy="${ht * 0.52}" r="${ht * 0.27}" fill="#e9e1d4"/>` +
        Array.from({ length: 7 }, (_, i) => `<circle cx="${cx + Math.cos(i + h) * ht * 0.14}" cy="${ht * 0.52 + Math.sin(i * 1.3 + h) * ht * 0.1}" r="${ht * (0.05 + (i % 3) * 0.015)}" fill="${hsl(warm + i * 30, 60, 48)}"/>`).join('')
    }
  }
}

export function placeholderImage(seed: string, label = '', ratio: [number, number] = [16, 9]): string {
  const h = hash(seed)
  const w = ratio[0] * 100
  const ht = ratio[1] * 100
  const text = label.replace(/[<>&"]/g, '')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="xMidYMid slice">` +
    scene(sceneFor(seed, h), h, w, ht) +
    (text ? `<text x="${w * 0.06}" y="${ht * 0.92}" font-family="system-ui,sans-serif" font-size="${ht * 0.07}" font-weight="600" fill="white">${text}</text>` : '') +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
