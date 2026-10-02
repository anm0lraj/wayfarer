import type { GeoPoint } from '@/types'

export interface ExifData {
  /** Camera wall-clock time, as written (no timezone in EXIF): date `YYYY-MM-DD` and time `HH:mm`. */
  takenAt?: { date: string; time: string }
  point?: GeoPoint
}

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

/**
 * Minimal EXIF reader for JPEG: capture time and GPS position, nothing else. Returns {} for anything that
 * isn't a JPEG with EXIF. Compression later re-encodes the image, which drops all EXIF from the stored file.
 */
export function readExif(buffer: ArrayBuffer): ExifData {
  const v = new DataView(buffer)
  if (v.byteLength < 12 || v.getUint16(0) !== 0xffd8) return {}
  let off = 2
  while (off + 4 < v.byteLength) {
    if (v.getUint8(off) !== 0xff) return {}
    const marker = v.getUint8(off + 1)
    const len = v.getUint16(off + 2)
    if (marker === 0xe1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10)
    if (marker === 0xda) return {}
    off += 2 + len
  }
  return {}
}

function parseTiff(v: DataView, base: number): ExifData {
  const little = v.getUint16(base) === 0x4949
  const u16 = (o: number) => v.getUint16(base + o, little)
  const u32 = (o: number) => v.getUint32(base + o, little)
  const inBounds = (o: number, n: number) => base + o >= 0 && base + o + n <= v.byteLength

  const ifd = (offset: number): Map<number, { type: number; count: number; at: number }> => {
    const out = new Map<number, { type: number; count: number; at: number }>()
    if (!inBounds(offset, 2)) return out
    const n = u16(offset)
    for (let i = 0; i < n; i++) {
      const e = offset + 2 + i * 12
      if (!inBounds(e, 12)) break
      const type = u16(e + 2)
      const count = u32(e + 4)
      const size = (TYPE_SIZE[type] ?? 1) * count
      out.set(u16(e), { type, count, at: size <= 4 ? e + 8 : u32(e + 8) })
    }
    return out
  }
  const ascii = (e: { count: number; at: number }) => {
    if (!inBounds(e.at, e.count)) return ''
    let s = ''
    for (let i = 0; i < e.count; i++) { const c = v.getUint8(base + e.at + i); if (c) s += String.fromCharCode(c) }
    return s
  }
  const rationals = (e: { count: number; at: number }) =>
    inBounds(e.at, e.count * 8) ? Array.from({ length: e.count }, (_, i) => { const d = u32(e.at + i * 8 + 4); return d ? u32(e.at + i * 8) / d : 0 }) : []

  const out: ExifData = {}
  const root = ifd(u32(4))

  const exifPtr = root.get(0x8769)
  const sub = exifPtr ? ifd(u32(exifPtr.at)) : new Map()
  const stamp = sub.get(0x9003) ?? sub.get(0x9004) ?? root.get(0x0132)
  const m = stamp && /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(ascii(stamp))
  if (m) out.takenAt = { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` }

  const gpsPtr = root.get(0x8825)
  if (gpsPtr) {
    const gps = ifd(u32(gpsPtr.at))
    const latRef = gps.get(1), lat = gps.get(2), lngRef = gps.get(3), lng = gps.get(4)
    if (latRef && lat && lngRef && lng) {
      const dms = (r: number[]) => (r[0] ?? 0) + (r[1] ?? 0) / 60 + (r[2] ?? 0) / 3600
      const la = dms(rationals(lat)) * (ascii(latRef).startsWith('S') ? -1 : 1)
      const lo = dms(rationals(lng)) * (ascii(lngRef).startsWith('W') ? -1 : 1)
      if (Math.abs(la) <= 90 && Math.abs(lo) <= 180 && (la !== 0 || lo !== 0)) out.point = { lat: la, lng: lo }
    }
  }
  return out
}
