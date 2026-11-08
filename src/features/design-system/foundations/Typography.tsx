import { Block, Code, DoDont, Rules, Table } from '../ui'
import { baseVars, clampPx } from '../tokens'

const SCALE = ['4xl', '3xl', '2xl', 'xl', 'lg', 'base', 'sm', 'xs'] as const
const USE: Record<(typeof SCALE)[number], string> = {
  '4xl': 'Page title (h1) on desktop, hero',
  '3xl': 'Page title on phones',
  '2xl': 'Section heading (h2), empty-state title',
  xl: 'Card title, sheet title',
  lg: 'Large buttons, sub-headings',
  base: 'Body text, inputs, buttons',
  sm: 'Captions, badges, chips, secondary text',
  xs: 'Labels, nav labels, stepper numbers',
}
const px = (n: number | undefined) => (n === undefined ? '—' : `${Math.round(n * 10) / 10} px`)

const WEIGHTS = [
  { w: 400, use: 'Body text' },
  { w: 500, use: 'Muted emphasis, nav labels' },
  { w: 600, use: 'Buttons, chips, badges, labels' },
  { w: 700, use: 'Headings h2–h3, card titles, prices' },
  { w: 800, use: 'Page titles (h1), empty-state titles' },
]

export function TypographyPage() {
  return (
    <div className="space-y-12">
      <Block title="Typeface" id="type-face">
        <p className="font-display text-4xl font-extrabold tracking-tight">Plus Jakarta Sans</p>
        <p className="text-fg-muted">One family for headings and body, self-hosted as a variable font (weights 200–800, Latin + Latin Extended, SIL OFL 1.1, credited on /credits). Only the Latin file is preloaded. Headings go through <Code>--font-display</Code> so they can change face on their own later; use <Code>font-display</Code> for heading-like text that isn’t a heading.</p>
        <p className="text-sm text-fg-muted">Stack: <Code>{baseVars['font-sans']}</Code></p>
      </Block>

      <Block title="Type scale" id="type-scale">
        <p className="text-fg-muted">Each step is a <Code>clamp()</Code> that grows with the viewport, so phones get compact text and desktops a little more room, with no breakpoint jumps. The sizes at 390 px and 1440 px are computed from the tokens.</p>
        <Table
          caption="Type scale"
          head={['Step', 'Sample', 'At 390 px', 'At 1440 px', 'Token', 'Use']}
          rows={SCALE.map((s) => [
            <Code key="c">text-{s}</Code>,
            <span key="s" className="font-bold" style={{ fontSize: `var(--text-${s})` }}>Bali in October</span>,
            px(clampPx(baseVars[`text-${s}`] ?? '', 390)),
            px(clampPx(baseVars[`text-${s}`] ?? '', 1440)),
            <Code key="t">{baseVars[`text-${s}`]}</Code>,
            USE[s],
          ])}
        />
      </Block>

      <Block title="Weights and line height" id="type-weights">
        <Table caption="Font weights" head={['Weight', 'Sample', 'Use']} rows={WEIGHTS.map(({ w, use }) => [String(w), <span key="s" style={{ fontWeight: w }}>Plan your journey</span>, use])} />
        <Rules items={[
          <>Body: line-height 1.55 (<Code>body</Code> in globals.css). Headings h1–h3: 1.2, h1 1.15, with tracking −0.01em (h1 −0.02em) and <Code>text-wrap: balance</Code>.</>,
          <>Compact UI text (card titles, captions on photos): <Code>leading-tight</Code> / <Code>leading-snug</Code>.</>,
          <>Long paragraphs: <Code>text-pretty</Code> avoids a lonely last word.</>,
        ]} />
      </Block>

      <Block title="Numbers" id="type-numbers">
        <p><span className="tabular-nums">09:30 · 11:00 · 13:00 · ₹60,000</span> <span className="text-fg-muted">— tabular</span></p>
        <Rules items={[
          <>Use <Code>tabular-nums</Code> where numbers line up or change in place: times in a day list, countdowns, prices in a column, contrast ratios.</>,
          <>Money is formatted by <Code>formatMoney</Code> (Indian grouping for INR: ₹60,000); dates by <Code>lib/dates</Code> in the trip’s timezone.</>,
        ]} />
      </Block>

      <Block title="Do and don’t" id="type-dodont">
        <DoDont
          dos={['One h1 per page (PageHeader).', 'Keep body text at text-base or larger.', 'Let headings be bold and friendly; keep controls plain.']}
          donts={['No text below text-xs.', 'Don’t add a second font family without updating the CSP, preload and credits.', 'Don’t set pixel font sizes; use the scale.']}
        />
      </Block>
    </div>
  )
}
