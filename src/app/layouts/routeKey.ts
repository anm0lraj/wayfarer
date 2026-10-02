/**
 * Identifies "which page" a URL is, ignoring things that happen inside a page: itinerary day, sheets, item ids,
 * map selection. `/trips/:id/itinerary/day/2/add` and `/trips/:id/itinerary` are the same page; `/trips/:id/map` is not.
 */
export function routeKey(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)
  if (seg[0] === 'trips' && seg[1] && seg[1] !== 'new') return seg.slice(0, 3).join('/')
  return seg.slice(0, 2).join('/')
}

const TAB_LABEL: Record<string, string> = {
  itinerary: 'Itinerary', map: 'Map', bookings: 'Bookings', memories: 'Memories', checklist: 'Checklist', share: 'Share', live: 'Live trip', stories: 'Story', ai: 'Assistant',
}

/** "Itinerary · 5 Days in Bali" for trip tabs; the bare heading elsewhere. */
export function titleFor(pathname: string, heading: string | null): string {
  const seg = pathname.split('/').filter(Boolean)
  const tab = seg[0] === 'trips' && seg[1] && seg[1] !== 'new' ? TAB_LABEL[seg[2] ?? ''] : undefined
  const base = heading?.trim()
  if (!base) return tab ?? 'Wayfarer'
  return tab && tab !== base ? `${tab} · ${base}` : base
}
