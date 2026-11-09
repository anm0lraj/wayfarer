import { z } from 'zod'

/**
 * Photos found automatically for places that have none in the catalogue (a custom activity picked on the map or by
 * search). They travel with the record (and into published pages), so the credit always goes with the photo.
 * Everything here may come from another person's published page, so links must be plain https and image addresses are
 * limited to the hosts the app serves or hotlinks (self-hosted `/photos/…`, Unsplash's image CDN).
 */
const httpsUrl = z.string().max(600).regex(/^https:\/\/[^\s"'<>]+$/, 'Expected an https address')

/** A self-hosted catalogue photo or an image on Unsplash's CDN; nothing else is accepted as a found photo. */
export const isPlacePhotoUrl = (url: string) =>
  /^\/photos\/[a-z0-9-]+-(?:640|1280)\.webp$/.test(url) || /^https:\/\/images\.unsplash\.com\/[^\s"'<>]+$/.test(url)

export const photoCreditSchema = z.object({
  /** The photographer (or author) as the provider names them. */
  name: z.string().min(1).max(120),
  profileUrl: httpsUrl.optional(),
  /** e.g. "Unsplash", "Wikimedia Commons". */
  provider: z.string().min(1).max(60),
  providerUrl: httpsUrl,
  /** The photo's own page at the provider. */
  photoUrl: httpsUrl,
  licence: z.string().max(60).optional(),
})
export type PlacePhotoCredit = z.infer<typeof photoCreditSchema>

export const placePhotoSchema = z.object({
  /** The 1280 px rendition; `responsiveImage`/`thumbnail` derive the smaller one from it. */
  url: z.string().max(800).refine(isPlacePhotoUrl, 'Unexpected photo address'),
  width: z.number().int().positive().max(20_000),
  height: z.number().int().positive().max(20_000),
  alt: z.string().max(300),
  credit: photoCreditSchema,
})
export type PlacePhoto = z.infer<typeof placePhotoSchema>

/**
 * The automatic photo search for one record: what was searched (so it is searched once, and again only if the place
 * changes) and the photo chosen, absent when nothing suitable was found (the generated illustration stays).
 */
export const autoPhotoSchema = z.object({
  query: z.string().min(1).max(200),
  photo: placePhotoSchema.optional(),
})
export type AutoPhoto = z.infer<typeof autoPhotoSchema>
