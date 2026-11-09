import { photoPath } from '@/lib/photos/responsive'

/**
 * The picture for a seeded memory's key, `seed:<id>:<caption>`: the id's stock photo, else the generated illustration
 * (whose scene the caption steers: "Fish thali" draws food, "Painted houses" a town). Both modules load lazily, since
 * only the demo's seeded memories need them.
 */
export async function seedImage(key: string): Promise<string> {
  const rest = key.slice('seed:'.length)
  const id = rest.split(':')[0] ?? rest
  const { PHOTOS } = await import('@/lib/photos')
  if (PHOTOS[id]) return photoPath(id)
  return (await import('@/lib/placeholder')).placeholderImage(rest)
}
