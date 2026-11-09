import type { PlacePhotoQuery, PlacePhotoResult, PlacePhotoService } from './types'

/**
 * Words in a place's name → a photo already in the self-hosted catalogue. Covers the places the demo geocoder offers
 * (Tegallalang, Petitenget, Fontainhas, Tsukiji, Senso-ji, Shibuya…), so the demo shows a real photo for a custom stop.
 */
const KEYWORDS: Array<[string, string]> = [
  ['tegallalang', 'p-tegallalang'], ['tanah lot', 'p-tanah-lot'], ['uluwatu temple', 'p-uluwatu-temple'], ['tirta empul', 'p-tirta-empul'],
  ['monkey forest', 'p-monkey-forest'], ['campuhan', 'p-campuhan'], ['sidemen', 'p-sidemen'], ['jimbaran', 'p-jimbaran-bay'],
  ['sanur', 'p-sanur-beach'], ['seminyak beach', 'p-seminyak-beach'], ['petitenget', 'p-seminyak-beach'], ['batu bolong', 'p-batu-bolong'],
  ['nyang nyang', 'p-nyang-nyang'], ['tukad cepung', 'p-tukad-cepung'], ['kecak', 'p-kecak'],
  ['baga', 'g-baga'], ['fontainhas', 'g-fontainhas'], ['aguada', 'g-fort-aguada'], ['palolem', 'g-palolem'],
  ['senso-ji', 'j-senso-ji'], ['senso ji', 'j-senso-ji'], ['sensoji', 'j-senso-ji'], ['shibuya', 'j-shibuya'], ['tsukiji', 'j-tsukiji'],
  ['fushimi', 'j-fushimi'], ['kinkaku', 'j-kinkaku'], ['arashiyama', 'j-arashiyama'], ['gion', 'j-gion'], ['meiji', 'j-meiji'],
  ['nishiki', 'j-nishiki'], ['yanaka', 'j-yanaka'],
]

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** Whole words only, so "Bagan" doesn't match "baga". */
const has = (text: string, word: string) => new RegExp(`(^|[^a-z0-9])${word}($|[^a-z0-9])`).test(text)

/** The catalogue photo the demo uses for a place name, if any. */
export function mockPhotoId(query: PlacePhotoQuery): string | undefined {
  const name = fold(query.name)
  return KEYWORDS.find(([word]) => has(name, word))?.[1]
}

/** Demo adapter: deterministic and offline. A known place gets its catalogue photo (credited as on /credits); anything else none. */
export const mockPlacePhotos: PlacePhotoService = {
  async search(query, signal) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const id = mockPhotoId(query)
    if (!id) return null
    const [{ PHOTOS, commonsCredit }, { photoPath }] = await Promise.all([import('@/lib/photos'), import('@/lib/photos/responsive')])
    const p = PHOTOS[id]
    if (!p) return null
    const result: PlacePhotoResult = {
      url: photoPath(id), width: p.width, height: p.height, alt: p.title,
      credit: commonsCredit(p),
    }
    return result
  },
  async track() {},
}
