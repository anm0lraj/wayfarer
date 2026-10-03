/**
 * Link previews for published trips. Chat apps and social sites read a page's Open Graph tags from the HTML they are
 * given, without running our JavaScript, so `/t/:slug` is answered by a function that takes the built `index.html`
 * and writes the trip's title, description and picture into its <head>. People still get the normal app.
 *
 * The files under `api/_lib` are shared helpers, not endpoints (Vercel ignores folders that start with an underscore).
 */

/** Only the fields a preview needs, read from a Firestore REST document. */
export interface PreviewTrip {
  id: string
  title: string
  description: string
  ownerName: string
  durationDays: number
  visibility: 'public' | 'link'
  coverImage: string
}

type RestValue = { stringValue?: string; integerValue?: string; doubleValue?: number }
type RestDoc = { fields?: Record<string, RestValue> }

export function parseTrip(id: string, doc: RestDoc): PreviewTrip | undefined {
  const f = doc.fields
  if (!f?.title?.stringValue) return undefined
  return {
    id,
    title: f.title.stringValue,
    description: f.description?.stringValue ?? '',
    ownerName: f.ownerName?.stringValue ?? '',
    durationDays: Number(f.durationDays?.integerValue ?? f.durationDays?.doubleValue ?? 0),
    visibility: f.visibility?.stringValue === 'link' ? 'link' : 'public',
    coverImage: f.coverImage?.stringValue ?? '',
  }
}

/** Escapes text for use in HTML content or a quoted attribute. Page titles and descriptions are written by users. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const truncate = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`)

/** A cover that is a photo can be served as an image; the generated illustrations are SVG, which link previews do not draw. */
export const coverIsPhoto = (cover: string) => /^data:image\/(jpeg|png|webp);base64,/.test(cover)

export function decodeCover(cover: string): { type: string; bytes: Uint8Array } | undefined {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(cover)
  return m ? { type: m[1]!, bytes: Uint8Array.from(Buffer.from(m[2]!, 'base64')) } : undefined
}

export function previewDescription(t: PreviewTrip): string {
  const base = t.description.trim() || `${t.durationDays} days of travel`
  return truncate(t.ownerName ? `${base} — by ${t.ownerName}` : base, 200)
}

/** The <head> additions for a trip's page. `origin` is where the site is served from, e.g. https://wayfarer.example. */
export function buildHead(t: PreviewTrip, slug: string, origin: string): { title: string; tags: string } {
  const title = `${t.title} · Wayfarer`
  const url = `${origin}/t/${encodeURIComponent(slug)}`
  const image = coverIsPhoto(t.coverImage) ? `${origin}/api/og-image?slug=${encodeURIComponent(slug)}` : `${origin}/og-default.png`
  const description = previewDescription(t)
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    // Unlisted pages are for the people who were sent the link, not for search results.
    t.visibility === 'link' ? '<meta name="robots" content="noindex" />' : '',
    '<meta property="og:site_name" content="Wayfarer" />',
    '<meta property="og:type" content="article" />',
    `<meta property="og:title" content="${escapeHtml(t.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(t.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ].filter(Boolean).join('\n    ')
  return { title, tags }
}

/** Puts the trip's tags and title into the app's HTML, replacing the generic ones. */
export function injectHead(html: string, head: { title: string; tags: string }): string {
  return html
    .replace(/<meta name="description"[^>]*>\s*/i, '')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(head.title)}</title>\n    ${head.tags}`)
}
