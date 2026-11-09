/** "Bali, Indonesia", but just "Japan" when the place is the country (never "Japan, Japan"). */
export function placeName(d: { name: string; country?: string }): string {
  return d.country && d.country !== d.name ? `${d.name}, ${d.country}` : d.name
}
