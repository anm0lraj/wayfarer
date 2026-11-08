/** WCAG 2.x contrast maths on RGB channel triples (the format of the colour tokens in tokens.css). */
export type RGB = [number, number, number]

/** Relative luminance (WCAG 2.2, 1.4.3). */
export function luminance([r, g, b]: RGB): number {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Contrast ratio between two colours, 1–21. */
export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/** `fg` at `alpha` painted over `bg` (how a tinted badge fill really looks). */
export const over = (fg: RGB, alpha: number, bg: RGB): RGB => fg.map((c, i) => Math.round(c * alpha + bg[i]! * (1 - alpha))) as RGB

/** "26 80 240" → [26, 80, 240]; undefined for anything else. */
export function parseChannels(value: string): RGB | undefined {
  const m = value.trim().match(/^(\d+)\s+(\d+)\s+(\d+)$/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined
}

export const toHex = (c: RGB) => `#${c.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`

/** Reads every `--name: r g b;` colour declaration out of a CSS block (used by the tests on tokens.css). */
export function channelTokens(css: string): Record<string, RGB> {
  const out: Record<string, RGB> = {}
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) out[m[1]!] = [Number(m[2]), Number(m[3]), Number(m[4])]
  return out
}

/** The light and dark colour blocks of tokens.css (`:root, [data-theme='light']` and `[data-theme='dark']`). */
export function themeBlocks(css: string): { light: string; dark: string } {
  const light = css.indexOf(":root,\n[data-theme='light']")
  const dark = css.indexOf(":root[data-theme='dark']")
  if (light < 0 || dark < 0) throw new Error('tokens.css: theme blocks not found')
  return { light: css.slice(light, dark), dark: css.slice(dark) }
}
