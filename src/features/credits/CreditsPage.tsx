import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { allPhotos, thumbUrl } from '@/lib/stock'

/**
 * `/credits` — who took the photos. Most Wikimedia Commons licences (CC BY, CC BY-SA) require crediting the
 * photographer and linking the licence; this is where the app does that. Public, so it works signed out.
 */
export function CreditsPage() {
  const photos = useMemo(allPhotos, [])
  return (
    <>
      <PageHeader title="Photo credits" description="Destination, place and hotel photos are free-licence images from Wikimedia Commons. Thank you to the photographers." />
      <ul className="grid gap-3 sm:grid-cols-2">
        {photos.map((p) => (
          <li key={p.title} className="flex gap-3 rounded-lg border border-border bg-surface p-3">
            <img src={thumbUrl(p, 250)} alt="" loading="lazy" className="size-16 shrink-0 rounded-md bg-surface-2 object-cover" />
            <div className="min-w-0 text-sm">
              <a href={p.page} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-primary underline">{p.title.replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')}</a>
              <p className="truncate text-fg-muted">by {p.author}</p>
              {p.licenseUrl ? <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-fg-muted underline">{p.license}</a> : <span className="text-fg-muted">{p.license}</span>}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
