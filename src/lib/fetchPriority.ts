/**
 * The `fetchpriority` hint for an <img>, to spread onto it: `<img {...fetchPriority(priority ? 'high' : undefined)} />`.
 * React 18 doesn't know the camelCase `fetchPriority` prop (it logs an error for it) but passes an unknown lowercase
 * attribute straight through. React 19 knows the camelCase prop; switch to it then. No hint means no attribute.
 */
export function fetchPriority(priority: 'high' | 'low' | 'auto' | undefined): Record<string, string> {
  return priority ? { fetchpriority: priority } : {}
}
