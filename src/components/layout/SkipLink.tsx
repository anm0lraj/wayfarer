/** First focusable thing on every layout: jumps past the header and navigation to `#main` (WCAG 2.4.1). */
export function SkipLink() {
  return (
    <a href="#main" className="sr-only-focusable fixed left-2 top-2 z-[70] rounded-md bg-primary px-4 py-2 font-semibold text-primary-fg">
      Skip to content
    </a>
  )
}
