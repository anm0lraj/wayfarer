import tokensCss from '@/styles/tokens.css?raw'
import { channelTokens, contrastRatio, over, themeBlocks, type RGB } from '@/lib/color/contrast'

/*
 * The token values, read from tokens.css itself (the library imports it as text), so every value, swatch and contrast
 * ratio on these pages is computed from the real tokens and updates when they change.
 */

const blocks = themeBlocks(tokensCss)
const base = tokensCss.slice(tokensCss.indexOf('/* Design tokens'), tokensCss.indexOf(":root,\n[data-theme='light']"))

/** Every `--name: value;` in a CSS block (comments removed). */
function vars(css: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim()
  return out
}

export const baseVars = vars(base)
export const themeVars = { light: vars(blocks.light), dark: vars(blocks.dark) }
export const colours = { light: channelTokens(blocks.light), dark: channelTokens(blocks.dark) }
export type Theme = keyof typeof colours

/** Badge fill: the tone at 12 % (components/ui/Chip.tsx). */
export const BADGE_TINT = 0.12

export interface ColourToken { name: string; tailwind: string; usage: string }

/** Every colour token, in the order the colour page shows them. */
export const COLOUR_TOKENS: ColourToken[] = [
  { name: 'bg', tailwind: 'bg-bg', usage: 'The page: a cool, clean light ground (deep navy in dark).' },
  { name: 'surface', tailwind: 'bg-surface', usage: 'Cards, sheets, inputs, nav.' },
  { name: 'surface-2', tailwind: 'bg-surface-2', usage: 'Inset panels, skeletons, neutral badges, hover rows.' },
  { name: 'border', tailwind: 'border-border', usage: 'Quiet dividers and card edges only.' },
  { name: 'border-strong', tailwind: 'border-border-strong', usage: 'Edges of inputs, buttons and chips (3:1).' },
  { name: 'fg', tailwind: 'text-fg', usage: 'Body text and headings.' },
  { name: 'fg-muted', tailwind: 'text-fg-muted', usage: 'Secondary text, captions, icons.' },
  { name: 'primary', tailwind: 'bg-primary / text-primary', usage: 'Electric Blue: actions, links, selection, focus.' },
  { name: 'on-primary', tailwind: 'text-primary-fg', usage: 'Text on primary fills.' },
  { name: 'secondary', tailwind: 'text-secondary', usage: 'Deep orange: “happening now” text and icons (safe as text).' },
  { name: 'on-secondary', tailwind: 'text-secondary-fg', usage: 'Text on a secondary fill.' },
  { name: 'accent', tailwind: 'bg-accent', usage: 'Bright orange: FILLS only (live dots, small marks), never text.' },
  { name: 'on-accent', tailwind: 'text-accent-fg', usage: 'Dark ink on an accent fill.' },
  { name: 'live-bg', tailwind: 'bg-live', usage: 'Light orange “happening now” panels and the live badge.' },
  { name: 'live-border', tailwind: 'border-live-border', usage: 'Soft edge of live panels.' },
  { name: 'success', tailwind: 'text-success / bg-success', usage: 'Done, ready, saved.' },
  { name: 'on-success', tailwind: 'text-success-fg', usage: 'Text on a success fill.' },
  { name: 'warning', tailwind: 'text-warning / bg-warning', usage: 'Needs attention; “Saved to trip — not booked”; offline banner.' },
  { name: 'on-warning', tailwind: 'text-warning-fg', usage: 'Text on a warning fill.' },
  { name: 'error', tailwind: 'text-error / bg-error', usage: 'Errors, destructive actions.' },
  { name: 'on-error', tailwind: 'text-error-fg', usage: 'Text on an error fill.' },
  { name: 'focus', tailwind: 'outline (global :focus-visible)', usage: 'The focus ring.' },
]

export interface ContrastPair {
  label: string
  fg: string
  bg: string
  /** Paint `bg` as `fg` at this alpha over `on` (badge tints). */
  tint?: { alpha: number; on: string }
  /** 4.5 for text, 3 for large text and UI edges. */
  min: number
}

const TONES = ['primary', 'secondary', 'success', 'warning', 'error'] as const

/** The documented foreground/background pairs. Each must pass in both themes (checked by library.a11y.test.tsx). */
export const CONTRAST_PAIRS: ContrastPair[] = [
  ...(['bg', 'surface', 'surface-2'] as const).flatMap((bg) => [
    { label: `Text on ${bg}`, fg: 'fg', bg, min: 4.5 },
    { label: `Muted text on ${bg}`, fg: 'fg-muted', bg, min: 4.5 },
  ]),
  ...TONES.map((t) => ({ label: `Label on ${t} button`, fg: `on-${t}`, bg: t, min: 4.5 })),
  ...TONES.map((t) => ({ label: `${t} text on surface`, fg: t, bg: 'surface', min: 4.5 })),
  ...TONES.flatMap((t) => (['surface', 'surface-2', 'bg'] as const).map((on) => ({ label: `${t} badge on ${on}`, fg: t, bg: t, tint: { alpha: BADGE_TINT, on }, min: 4.5 }))),
  { label: 'Ink on accent fill', fg: 'on-accent', bg: 'accent', min: 4.5 },
  { label: 'Text on live panel', fg: 'fg', bg: 'live-bg', min: 4.5 },
  { label: 'Muted text on live panel', fg: 'fg-muted', bg: 'live-bg', min: 4.5 },
  { label: 'Live badge / orange icon on live panel', fg: 'secondary', bg: 'live-bg', min: 4.5 },
  { label: 'Link on live panel', fg: 'primary', bg: 'live-bg', min: 4.5 },
  { label: 'Focus ring on page', fg: 'focus', bg: 'bg', min: 3 },
  { label: 'Input / button edge on surface', fg: 'border-strong', bg: 'surface', min: 3 },
]

export function pairColours(pair: ContrastPair, theme: Theme): { fg: RGB; bg: RGB } {
  const t = colours[theme]
  const fg = t[pair.fg]!
  const bg = pair.tint ? over(t[pair.bg]!, pair.tint.alpha, t[pair.tint.on]!) : t[pair.bg]!
  return { fg, bg }
}

export const pairRatio = (pair: ContrastPair, theme: Theme) => { const { fg, bg } = pairColours(pair, theme); return contrastRatio(fg, bg) }

/** px size of a `clamp(min rem, a rem + b vw, max rem)` font token at a viewport width. */
export function clampPx(value: string, viewport: number): number | undefined {
  const m = value.match(/clamp\(([\d.]+)rem,\s*([\d.]+)rem\s*\+\s*([\d.]+)vw,\s*([\d.]+)rem\)/)
  if (!m) return undefined
  const [min, a, b, max] = m.slice(1).map(Number) as [number, number, number, number]
  return Math.min(max * 16, Math.max(min * 16, a * 16 + (b * viewport) / 100))
}
