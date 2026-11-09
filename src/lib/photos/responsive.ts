/**
 * Self-hosted card photos are stored as `/photos/<id>-<width>.webp` at two widths. These helpers work from the URL alone
 * (no photo list), so any screen can use them without pulling the credits data into its chunk.
 */
export const PHOTO_WIDTHS = [640, 1280] as const
const PHOTO = /^\/photos\/([a-z0-9-]+)-(?:640|1280)\.webp$/

/** `sizes` for a card in a 1 / 2 / 3-column grid or row (phone / tablet / desktop). */
export const CARD_SIZES = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
/** `sizes` for the public feed, whose grid has 1 / 2 / 3 / 4 columns. */
export const FEED_SIZES = '(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'

export const photoPath = (id: string, width: (typeof PHOTO_WIDTHS)[number] = 1280) => `/photos/${id}-${width}.webp`

/** The photo id behind a `/photos/…` URL, or undefined for anything else (illustrations, the traveller's own photos). */
export function photoIdOf(src: string | undefined | null): string | undefined {
  if (!src) return undefined
  const path = src.startsWith('/') ? src : src.startsWith('http') ? (() => { try { return new URL(src).pathname } catch { return '' } })() : ''
  return PHOTO.exec(path)?.[1]
}

/**
 * `src`, `srcSet` and `sizes` for an <img>: a self-hosted photo offers both widths so phones fetch the small one;
 * any other image is passed through unchanged. `sizes` is how wide the image is drawn (CSS `sizes` syntax).
 */
export function responsiveImage(src: string | undefined, sizes: string): { src: string | undefined; srcSet?: string; sizes?: string } {
  if (isUnsplash(src)) return { src: unsplashAt(src, 1280), srcSet: PHOTO_WIDTHS.map((w) => `${unsplashAt(src, w)} ${w}w`).join(', '), sizes }
  const id = photoIdOf(src)
  if (!id) return { src }
  return { src: photoPath(id), srcSet: PHOTO_WIDTHS.map((w) => `${photoPath(id, w)} ${w}w`).join(', '), sizes }
}

/** The small rendition, for thumbnails (a 56–80 px picture never needs the 1280 px file). */
export function thumbnail(src: string | undefined): string | undefined {
  if (isUnsplash(src)) return unsplashAt(src, 640)
  const id = photoIdOf(src)
  return id ? photoPath(id, 640) : src
}

/**
 * Photos found on Unsplash for new places (features/place-photos) are hotlinked from its image CDN, which resizes on
 * request: the same address with another `w` is the other width (Unsplash asks apps to keep its other parameters).
 */
const isUnsplash = (src: string | undefined): src is string => !!src && src.startsWith('https://images.unsplash.com/')
function unsplashAt(src: string, width: number): string {
  try {
    const u = new URL(src)
    u.searchParams.set('w', String(width))
    if (!u.searchParams.has('fm')) u.searchParams.set('fm', 'webp')
    return u.toString()
  } catch {
    return src
  }
}

/**
 * If a self-hosted photo fails to load (offline before it was cached, a missing file), draw the generated
 * illustration for the same id in its place, so a card never shows a broken image. One capturing listener covers every
 * <img> (error events don't bubble); the illustration code is only loaded the first time it is needed.
 */
export function installImageFallback(target: Document = document) {
  target.addEventListener('error', (e) => {
    const el = e.target
    if (!(el instanceof HTMLImageElement)) return
    const id = photoIdOf(el.getAttribute('src')) ?? photoIdOf(el.currentSrc)
    if (!id) return
    void import('@/lib/placeholder').then(({ placeholderImage }) => {
      el.removeAttribute('srcset')
      el.src = placeholderImage(id, '', [16, 9])
    })
  }, true)
}
