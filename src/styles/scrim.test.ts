import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8')
const rule = /\.scrim-text\s*\{[^}]*\}/.exec(css)?.[0] ?? ''

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
/** Contrast of white text over a pure white picture under `alpha` of black (sRGB compositing, as browsers do). */
const whiteOverWhite = (alpha: number) => 1.05 / (channel(1 - alpha) + 0.05)

describe('caption scrim (.scrim-text)', () => {
  it('keeps white captions above 4.5:1 even over a pure white photo', () => {
    const alphas = [...rule.matchAll(/rgb\(0 0 0 \/ ([\d.]+)\)/g)].map((m) => Number(m[1]))
    // The last stop is the transparent fade above the text; every other stop sits behind text.
    expect(alphas.length).toBeGreaterThan(1)
    for (const a of alphas.slice(0, -1)) expect(whiteOverWhite(a), String(a)).toBeGreaterThanOrEqual(4.5)
    expect(alphas.at(-1)).toBe(0)
  })

  it('darkens only a short strip above the text', () => {
    expect(rule).toMatch(/--scrim-fade, 1\.25rem/)
  })
})
