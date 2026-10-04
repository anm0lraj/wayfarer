/**
 * What the router shows while the first page's code is still loading (every page is loaded lazily). It is the same
 * "Wayfarer" splash the HTML already paints (`#splash` in index.html), so nothing flickers when React takes over. Without
 * it React Router logs "No `HydrateFallback` element provided" on every first load.
 */
export function HydrateFallback() {
  return <div id="splash" role="status" aria-label="Loading">Wayfarer</div>
}
