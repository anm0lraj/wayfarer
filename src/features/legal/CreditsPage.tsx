import { PHOTOS } from '@/lib/photos'
import { photoPath } from '@/lib/photos/responsive'

const link = 'text-primary underline underline-offset-2 hover:no-underline'

/**
 * Credits for the stock photos. Every one is a freely licensed file from Wikimedia Commons whose licence asks for
 * attribution (and, for CC BY-SA, a note of changes): author, licence and source are listed here for each.
 */
export function CreditsPage() {
  const photos = Object.entries(PHOTOS).sort(([, a], [, b]) => a.title.localeCompare(b.title))
  return (
    <article className="space-y-6 py-6">
      <header className="max-w-2xl space-y-2 leading-relaxed">
        <h1 className="text-3xl font-bold">Photo credits</h1>
        <p>The photos of places, food and stays in Wayfarer come from <a className={link} href="https://commons.wikimedia.org/">Wikimedia Commons</a>, shared by their authors under free licences. Thank you to every photographer below.</p>
        <p className="text-sm text-fg-muted">We cropped and resized each photo and saved it as WebP; nothing else was changed. Hotels in the demo are fictional, so their photos show similar places, not the hotel named. {photos.length} photos.</p>
      </header>
      <ul className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map(([id, p]) => (
          <li key={id} className="space-y-2">
            <img src={photoPath(id, 640)} alt="" loading="lazy" decoding="async" width={640} height={Math.round((640 * p.height) / p.width)} className="aspect-[3/2] w-full rounded-md bg-surface-2 object-cover" />
            <div className="space-y-0.5 text-sm">
              <p className="font-semibold leading-snug">{p.title}</p>
              <p className="text-fg-muted">by {p.author}</p>
              <p className="flex flex-wrap gap-x-3">
                <a className={link} href={p.licenceUrl} rel="license noopener" target="_blank">{p.licence}</a>
                <a className={link} href={p.source} rel="noopener" target="_blank">On Wikimedia Commons<span className="sr-only">: {p.title}</span></a>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <section aria-labelledby="unsplash-h" className="max-w-2xl space-y-2 leading-relaxed">
        <h2 id="unsplash-h" className="text-2xl font-bold">Photos of your own places</h2>
        <p>
          When you add an activity at a place of your own, Wayfarer may find a photo of it on <a className={link} href="https://unsplash.com/?utm_source=travel_planner_app&utm_medium=referral" rel="noopener" target="_blank">Unsplash</a>.
          Those photos are shown straight from Unsplash, under the <a className={link} href="https://unsplash.com/license" rel="license noopener" target="_blank">Unsplash License</a>,
          and each one is credited to its photographer wherever it appears (“Photo by … on Unsplash”).
        </p>
      </section>
      <section aria-labelledby="fonts-h" className="max-w-2xl space-y-2 leading-relaxed">
        <h2 id="fonts-h" className="text-2xl font-bold">Font</h2>
        <p>
          Wayfarer is set in <a className={link} href="https://github.com/tokotype/PlusJakartaSans" rel="noopener" target="_blank">Plus Jakarta Sans</a> by
          Tokotype (Gumpita Rahayu), shared under the <a className={link} href="https://openfontlicense.org/" rel="license noopener" target="_blank">SIL Open Font License 1.1</a>.
          The illustrations are drawn for Wayfarer.
        </p>
      </section>
    </article>
  )
}
