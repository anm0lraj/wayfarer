import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type RGB = [number, number, number]

/** Badge fill: the tone at 12% (`bg-primary/[0.12]` etc. in components/ui/Chip.tsx). Keep the two in step. */
const BADGE_TINT = 0.12

/** Reads `--name: r g b;` declarations from the :root block (light) or the dark block. */
function tokens(theme: 'light' | 'dark'): Record<string, RGB> {
  const css = readFileSync('src/styles/tokens.css', 'utf8')
  const block = theme === 'light' ? css.slice(css.indexOf(':root {'), css.indexOf(":root[data-theme='dark']")) : css.slice(css.indexOf(":root[data-theme='dark']"))
  const out: Record<string, RGB> = {}
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) out[m[1]!] = [Number(m[2]), Number(m[3]), Number(m[4])]
  return out
}

const lum = ([r, g, b]: RGB) => {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: RGB, b: RGB) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi! + 0.05) / (lo! + 0.05) }
/** `fg` at `alpha` painted over `bg`. */
const over = (fg: RGB, alpha: number, bg: RGB): RGB => fg.map((c, i) => Math.round(c * alpha + bg[i]! * (1 - alpha))) as RGB

describe.each(['light', 'dark'] as const)('WCAG AA contrast — %s theme', (theme) => {
  const t = tokens(theme)
  const text = (name: string, fg: RGB, bg: RGB, min = 4.5) => it(name, () => expect(ratio(fg, bg), `${name}: ${ratio(fg, bg).toFixed(2)}:1`).toBeGreaterThanOrEqual(min))

  for (const bg of ['bg', 'surface', 'surface-2'] as const) {
    text(`body text on ${bg}`, t.fg!, t[bg]!)
    text(`muted text on ${bg}`, t['fg-muted']!, t[bg]!)
  }
  for (const c of ['primary', 'secondary', 'success', 'warning', 'error'] as const) {
    text(`${c} button label`, t[`on-${c}`]!, t[c]!)
    text(`${c} as text on surface`, t[c]!, t.surface!)
    text(`${c} as text on bg`, t[c]!, t.bg!)
    // Badges (`Badge` in components/ui/Chip.tsx): coloured text on the same colour at BADGE_TINT. Badges sit on cards
    // (surface), grey panels (surface-2) and the page (bg), so every tone must pass on all three (warning = "Saved to trip — not booked").
    for (const bg of ['surface', 'surface-2', 'bg'] as const) text(`${c} badge text on ${bg}`, t[c]!, over(t[c]!, BADGE_TINT, t[bg]!))
  }
  // Neutral and solid badges carry their own opaque fill, so the background behind them doesn't matter.
  text('neutral badge text (fg on surface-2)', t.fg!, t['surface-2']!)
  // Bright orange is a fill, never text: its label must be the dark ink, and orange *text* is the deeper `secondary`.
  text('accent fill label (ink on bright orange)', t['on-accent']!, t.accent!)
  // "Happening now" panels (live banner, overview live panel, Live Trip card, demo-date strip) use the light `live-bg`
  // with normal text, a deep-orange (`secondary`) badge/icon and blue links; the accent badge is `secondary` on `live-bg`.
  text('text on the live panel', t.fg!, t['live-bg']!)
  text('muted text on the live panel', t['fg-muted']!, t['live-bg']!)
  text('accent (live) badge text and orange icons on the live panel', t.secondary!, t['live-bg']!)
  text('link (primary) on the live panel', t.primary!, t['live-bg']!)
  text('live panel icon (secondary) on its white disc', t.secondary!, t.surface!, 3)
  text('focus ring against the page', t.focus!, t.bg!, 3)
  // WCAG 1.4.11: the edge of an input or button must be visible against what it sits on.
  text('input/button border against surface', t['border-strong'] ?? t.border!, t.surface!, 3)
})
