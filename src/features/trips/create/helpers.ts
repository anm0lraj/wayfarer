export function tripTitle(names: string[], days: number): string {
  return names.length === 1 ? `${days} ${days === 1 ? 'Day' : 'Days'} in ${names[0]}` : `${days} Days: ${names.join(' → ')}`
}

/** Splits `days` across `parts` destinations as evenly as possible, earlier stops getting the remainder. */
export function splitDays(days: number, parts: number): number[] {
  const base = Math.floor(days / parts)
  const extra = days % parts
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0))
}
