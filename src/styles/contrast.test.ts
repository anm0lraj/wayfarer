import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { channelTokens, contrastRatio as ratio, over, themeBlocks, type RGB } from '@/lib/color/contrast'

/** Badge fill: the tone at 12% (`bg-primary/[0.12]` etc. in components/ui/Chip.tsx). Keep the two in step. */
const BADGE_TINT = 0.12

/** Reads `--name: r g b;` declarations from the light colour block or the dark one. */
function tokens(theme: 'light' | 'dark'): Record<string, RGB> {
  return channelTokens(themeBlocks(readFileSync('src/styles/tokens.css', 'utf8'))[theme])
}

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
