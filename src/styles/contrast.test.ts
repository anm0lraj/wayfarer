import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type RGB = [number, number, number]

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
    // Badges: coloured text on the same colour at 15% over the surface.
    text(`${c} badge text`, t[c]!, over(t[c]!, 0.15, t.surface!))
  }
  text('focus ring against the page', t.focus!, t.bg!, 3)
  // WCAG 1.4.11: the edge of an input or button must be visible against what it sits on.
  text('input/button border against surface', t['border-strong'] ?? t.border!, t.surface!, 3)
})
