import { Badge } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { toHex, type RGB } from '@/lib/color/contrast'
import { Stage } from '../Preview'
import { Block, Code, DoDont, Rules, Table } from '../ui'
import { COLOUR_TOKENS, CONTRAST_PAIRS, colours, pairColours, pairRatio, type Theme } from '../tokens'

const rgb = (c: RGB) => `rgb(${c.join(' ')})`

function Swatch({ c, label }: { c: RGB | undefined; label: string }) {
  if (!c) return <span className="text-fg-muted">—</span>
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="size-8 shrink-0 rounded-md border border-border-strong/40" style={{ background: rgb(c) }} />
      <span className="font-mono text-xs leading-tight">{toHex(c)}<br /><span className="text-fg-muted">{c.join(' ')}</span></span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

function Ratio({ value, min }: { value: number; min: number }) {
  const ok = value >= min
  return (
    <span className="flex items-center gap-2 tabular-nums">
      <span className="font-semibold">{value.toFixed(2)}:1</span>
      <Badge tone={ok ? 'success' : 'error'} className="text-xs">{ok ? `AA ≥ ${min}` : `Fails ${min}`}</Badge>
    </span>
  )
}

function PairSample({ theme, i }: { theme: Theme; i: number }) {
  const { fg, bg } = pairColours(CONTRAST_PAIRS[i]!, theme)
  return <span className="inline-grid h-8 min-w-12 place-items-center rounded-md border border-border px-2 text-sm font-semibold" style={{ color: rgb(fg), background: rgb(bg) }} aria-hidden>Aa</span>
}

function Usage({ theme }: { theme: Theme }) {
  return (
    <Stage theme={theme} className="rounded-lg border border-border p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">{theme === 'light' ? 'Light' : 'Dark'}</p>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2"><Button>Plan a trip</Button><Button variant="secondary">Add hotel</Button><a href="#colour-usage-h" className="self-center font-semibold text-primary underline-offset-2 hover:underline">A link</a></div>
        <div className="rounded-lg border border-live-border bg-live p-4">
          <Badge tone="accent"><span aria-hidden className="size-2 rounded-full bg-accent" />Happening now</Badge>
          <p className="mt-2 font-semibold">Uluwatu Temple</p>
          <p className="text-sm text-fg-muted">Until 11:30 · 20 min away</p>
        </div>
        <div className="flex flex-wrap gap-2"><Badge tone="primary">Info</Badge><Badge tone="success">Ready</Badge><Badge tone="warning">Saved to trip — not booked</Badge><Badge tone="error">Failed</Badge><Badge>Draft</Badge></div>
      </div>
    </Stage>
  )
}

export function ColourPage() {
  return (
    <div className="space-y-12">
      <Block title="How colour is used" id="colour-usage">
        <Rules items={[
          <><strong>Electric Blue (<Code>primary</Code>) is for action</strong>: buttons, links, selection, focus and the current nav item. One strong brand colour on a clean light ground.</>,
          <><strong>Orange means “happening now”</strong>: the live trip, In progress, the sync badge, the demo clock. Live panels are the light <Code>live-bg</Code> with normal text; orange appears only in a small badge or icon (<Code>secondary</Code>).</>,
          <><strong>Bright <Code>accent</Code> is a fill only</strong> (about 2:1 on white): dots and small marks, always with the dark <Code>on-accent</Code> ink. Orange text is the deeper <Code>secondary</Code>.</>,
          <><strong>Semantic tones carry meaning</strong>: success (done, ready), warning (needs attention, demo bookings, offline), error (failed, destructive). Never colour alone: the word or icon says it too.</>,
          <><strong>Surfaces</strong>: <Code>bg</Code> page, <Code>surface</Code> cards and sheets, <Code>surface-2</Code> inset panels. Edges of controls use <Code>border-strong</Code> (3:1); <Code>border</Code> is for quiet dividers.</>,
        ]} />
        <div className="grid gap-4 lg:grid-cols-2"><Usage theme="light" /><Usage theme="dark" /></div>
      </Block>

      <Block title="Tokens" id="colour-tokens">
        <p className="text-fg-muted">Space-separated RGB channels in <Code>src/styles/tokens.css</Code> (so Tailwind can add alpha: <Code>bg-primary/[0.12]</Code>), mapped to utilities in <Code>tailwind.config.ts</Code>. Values below are read from the file itself.</p>
        <Table
          caption="Colour tokens, light and dark"
          head={['Token', 'Light', 'Dark', 'Utility', 'Use']}
          rows={COLOUR_TOKENS.map((t) => [
            <Code key="n">--{t.name}</Code>,
            <Swatch key="l" c={colours.light[t.name]} label={`light ${t.name}`} />,
            <Swatch key="d" c={colours.dark[t.name]} label={`dark ${t.name}`} />,
            <Code key="u">{t.tailwind}</Code>,
            t.usage,
          ])}
        />
      </Block>

      <Block title="Contrast" id="colour-contrast">
        <p className="text-fg-muted">WCAG 2.2 AA, computed here from the token values for every documented pair: 4.5:1 for text, 3:1 for focus rings and control edges. Badges are measured as their real tint (the tone at 12 % over the background). <Code>src/styles/contrast.test.ts</Code> and the library’s accessibility test fail if a pair drops below.</p>
        <Table
          caption="Contrast ratios of documented colour pairs"
          head={['Pair', 'Light', 'Ratio', 'Dark', 'Ratio']}
          rows={CONTRAST_PAIRS.map((p, i) => [
            p.label,
            <PairSample key="ls" theme="light" i={i} />,
            <Ratio key="lr" value={pairRatio(p, 'light')} min={p.min} />,
            <PairSample key="ds" theme="dark" i={i} />,
            <Ratio key="dr" value={pairRatio(p, 'dark')} min={p.min} />,
          ])}
        />
      </Block>

      <Block title="Do and don’t" id="colour-dodont">
        <DoDont
          dos={['Use blue for the one main action on a screen.', 'Use the outlined badge tones; `accent` for live.', 'Check new pairs in contrast.test.ts.', 'Change brand hex values together: tokens.css, index.html, vite.config.ts, lib/theme.ts, public/icon*.svg.']}
          donts={['No bright orange fill behind text, no solid orange badges.', 'No random gradients or decorative colour.', 'Don’t use `border` for an input’s edge (too faint).', 'Don’t write raw hex in components; use the tokens.']}
        />
      </Block>
    </div>
  )
}
