import { describe, expect, it } from 'vitest'
import { readExif } from './exif'
import { fitWithin } from './image'

/** Builds a tiny big-endian JPEG whose APP1 holds DateTimeOriginal and a GPS position. */
function jpegWith(opts: { date?: string; gps?: { latRef: string; lat: number[]; lngRef: string; lng: number[] } }) {
  const bytes: number[] = []
  const w16 = (n: number) => bytes.push((n >> 8) & 255, n & 255)
  const w32 = (n: number) => bytes.push((n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255)
  const tiff: number[] = []
  const t16 = (n: number) => tiff.push((n >> 8) & 255, n & 255)
  const t32 = (n: number) => tiff.push((n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255)
  const entry = (tag: number, type: number, count: number, value: number) => { t16(tag); t16(type); t32(count); t32(value) }

  // Layout: header(8) | IFD0 | ExifIFD | GPS IFD | data
  const ifd0Entries = (opts.date ? 1 : 0) + (opts.gps ? 1 : 0)
  const ifd0Size = 2 + ifd0Entries * 12 + 4
  const exifAt = 8 + ifd0Size
  const exifSize = opts.date ? 2 + 12 + 4 : 0
  const gpsAt = exifAt + exifSize
  const gpsSize = opts.gps ? 2 + 4 * 12 + 4 : 0
  const dataAt = gpsAt + gpsSize

  tiff.push(0x4d, 0x4d); t16(42); t32(8)
  t16(ifd0Entries)
  if (opts.date) entry(0x8769, 4, 1, exifAt)
  if (opts.gps) entry(0x8825, 4, 1, gpsAt)
  t32(0)
  if (opts.date) { t16(1); entry(0x9003, 2, 20, dataAt); t32(0) }
  const dateBytes = opts.date ? [...opts.date, '\0'].map((c) => c.charCodeAt(0)) : []
  const rat = (r: number[]) => r.flatMap((n) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255, 0, 0, 0, 1])
  if (opts.gps) {
    const latAt = dataAt + dateBytes.length
    const lngAt = latAt + 24
    t16(4)
    entry(1, 2, 2, (opts.gps.latRef.charCodeAt(0) << 24))
    entry(2, 5, 3, latAt)
    entry(3, 2, 2, (opts.gps.lngRef.charCodeAt(0) << 24))
    entry(4, 5, 3, lngAt)
    t32(0)
  }
  tiff.push(...dateBytes)
  if (opts.gps) tiff.push(...rat(opts.gps.lat), ...rat(opts.gps.lng))

  bytes.push(0xff, 0xd8, 0xff, 0xe1)
  w16(2 + 6 + tiff.length)
  w32(0x45786966); w16(0)
  bytes.push(...tiff)
  bytes.push(0xff, 0xd9)
  return new Uint8Array(bytes).buffer
}

describe('readExif', () => {
  it('reads the capture time', () => {
    expect(readExif(jpegWith({ date: '2026:10:13 17:42:09' })).takenAt).toEqual({ date: '2026-10-13', time: '17:42' })
  })
  it('reads GPS and applies the hemisphere (south and east for Bali)', () => {
    const { point } = readExif(jpegWith({ gps: { latRef: 'S', lat: [8, 41, 0], lngRef: 'E', lng: [115, 9, 0] } }))
    expect(point!.lat).toBeCloseTo(-8.6833, 3)
    expect(point!.lng).toBeCloseTo(115.15, 3)
  })
  it('returns nothing for non-JPEG or EXIF-less input instead of throwing', () => {
    expect(readExif(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).buffer)).toEqual({})
    expect(readExif(new Uint8Array([0xff, 0xd8, 0xff, 0xd9, 0, 0, 0, 0, 0, 0, 0, 0]).buffer)).toEqual({})
    expect(readExif(new ArrayBuffer(0))).toEqual({})
  })
})

describe('fitWithin', () => {
  it('scales the longest edge down and keeps the aspect ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })
  it('never upscales', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})
