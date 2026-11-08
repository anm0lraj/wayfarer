import { Stage } from '../Preview'
import { Block, Code, DoDont, Rules, Table } from '../ui'
import { baseVars, themeVars } from '../tokens'

const SPACES = [
  { cls: '1', px: 4, use: 'Icon to text inside a badge' },
  { cls: '1.5', px: 6, use: 'Label to field, chip icon gap' },
  { cls: '2', px: 8, use: 'Buttons in a row, chips in a group' },
  { cls: '3', px: 12, use: 'Cards in a grid, items in a list' },
  { cls: '4', px: 16, use: 'Card padding, phone page gutter' },
  { cls: '5', px: 20, use: 'Roomy card / sheet padding' },
  { cls: '6', px: 24, use: 'Tablet page gutter, form groups' },
  { cls: '8', px: 32, use: 'Desktop page gutter' },
  { cls: '10', px: 40, use: 'Between page sections' },
]

export function SpacingPage() {
  return (
    <div className="space-y-12">
      <Block title="Spacing scale" id="space-scale">
        <p className="text-fg-muted">Tailwind’s 4 px scale. A handful of steps cover almost everything; pick from this table before reaching for another.</p>
        <Table caption="Spacing steps" head={['Step', 'Size', '', 'Typical use']} rows={SPACES.map((s) => [
          <Code key="c">gap-{s.cls} / p-{s.cls}</Code>, `${s.px} px`, <span key="b" aria-hidden className="block h-3 rounded-sm bg-primary" style={{ width: s.px * 2 }} />, s.use,
        ])} />
      </Block>
      <Block title="Layout sizes" id="space-layout">
        <Table caption="Layout size tokens" head={['Token', 'Value', 'Use']} rows={[
          [<Code key="1">--touch</Code>, `${baseVars.touch} (2.25rem with a fine pointer ≥ 1024 px)`, 'Minimum interactive size: min-h-touch / min-w-touch (44 px, 36 px on desktop mice)'],
          [<Code key="2">--nav-h</Code>, baseVars['nav-h'] ?? '', 'Phone bottom bar height'],
          [<Code key="3">--rail-w</Code>, baseVars['rail-w'] ?? '', 'Tablet rail width'],
          [<Code key="4">--sidebar-w</Code>, baseVars['sidebar-w'] ?? '', 'Desktop sidebar (collapsed: --sidebar-w-collapsed ' + (baseVars['sidebar-w-collapsed'] ?? '') + ')'],
          [<Code key="5">--safe-*</Code>, 'env(safe-area-inset-*)', 'Notch and home indicator in the installed app (pb-safe / pt-safe)'],
          ['Page', 'max-w-7xl, px-4 / sm:px-6 / lg:px-8', 'Main content width and gutters (AppShell)'],
        ]} />
      </Block>
    </div>
  )
}

const RADII = [
  { name: 'sm', use: 'Small marks, focus outline corners, code' },
  { name: 'md', use: 'Controls: buttons, inputs, menu items' },
  { name: 'lg', use: 'Cards, image cards, sheets on phones' },
  { name: 'xl', use: 'Hero panels and dialogs (rounded-2xl maps here too)' },
]

export function RadiusPage() {
  return (
    <div className="space-y-12">
      <Block title="Radius" id="radius-scale">
        <p className="text-fg-muted">Generous, friendly corners. Chips and badges are pills (<Code>rounded-full</Code>).</p>
        <div className="flex flex-wrap gap-6">
          {RADII.map((r) => (
            <figure key={r.name} className="space-y-2">
              <div aria-hidden className="size-24 border-2 border-primary bg-primary/[0.12]" style={{ borderRadius: `var(--radius-${r.name})` }} />
              <figcaption className="text-sm"><Code>rounded-{r.name}</Code> {baseVars[`radius-${r.name}`]}</figcaption>
            </figure>
          ))}
          <figure className="space-y-2">
            <div aria-hidden className="h-10 w-24 rounded-full border-2 border-primary bg-primary/[0.12]" />
            <figcaption className="text-sm"><Code>rounded-full</Code> chips, badges</figcaption>
          </figure>
        </div>
        <Table caption="Radius tokens" head={['Utility', 'Value', 'Use']} rows={RADII.map((r) => [<Code key="c">rounded-{r.name}</Code>, baseVars[`radius-${r.name}`] ?? '', r.use])} />
      </Block>
    </div>
  )
}

const SHADOWS = [
  { name: 'sm', use: 'Resting cards, inputs, secondary buttons' },
  { name: 'md', use: 'Raised panels' },
  { name: 'lg', use: 'Sheets, menus, toasts, hovered cards (lift)' },
  { name: 'primary', use: 'Filled blue buttons, selected chips, current sidebar row' },
  { name: 'accent', use: 'Orange fills (rare)' },
]

export function ElevationPage() {
  return (
    <div className="space-y-12">
      <Block title="Elevation" id="elevation-scale">
        <p className="text-fg-muted">Soft, layered shadows tinted with the brand ink in light mode (a tight contact shadow plus a wide, offset ambient one); plain black, deeper, in dark mode.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {(['light', 'dark'] as const).map((t) => (
            <Stage key={t} theme={t} className="rounded-lg border border-border p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t === 'light' ? 'Light' : 'Dark'}</p>
              <div className="flex flex-wrap gap-5">
                {SHADOWS.map((s) => (
                  <div key={s.name} className="grid size-24 place-items-center rounded-lg bg-surface text-sm font-semibold" style={{ boxShadow: `var(--shadow-${s.name})` }}>shadow-{s.name}</div>
                ))}
              </div>
            </Stage>
          ))}
        </div>
        <Table caption="Shadow tokens" head={['Utility', 'Light value', 'Use']} rows={SHADOWS.map((s) => [<Code key="c">shadow-{s.name}</Code>, <Code key="v">{themeVars.light[`shadow-${s.name}`]}</Code>, s.use])} />
      </Block>
    </div>
  )
}

export function MotionPage() {
  return (
    <div className="space-y-12">
      <Block title="Motion tokens" id="motion-tokens">
        <Table caption="Motion tokens" head={['Token', 'Value', 'Utility', 'Use']} rows={[
          [<Code key="1">--dur-fast</Code>, baseVars['dur-fast'] ?? '', <Code key="u1">duration-fast</Code>, 'Colour and border changes, button press'],
          [<Code key="2">--dur-base</Code>, baseVars['dur-base'] ?? '', <Code key="u2">duration-base</Code>, 'Card lift'],
          [<Code key="3">--ease-out</Code>, baseVars['ease-out'] ?? '', <Code key="u3">ease-out</Code>, 'Everything (quick start, soft landing)'],
          ['Photo zoom / progress', '500 ms', <Code key="u4">duration-500</Code>, 'Image zoom in cards, progress fill'],
          ['Page transition', 'Framer Motion', <Code key="u5">PageTransition</Code>, 'The only page-level motion (lazy-loaded, off with reduced motion)'],
        ]} />
      </Block>
      <Block title="Try it" id="motion-demo">
        <div className="flex flex-wrap gap-4">
          <a href="#motion-demo-h" className="lift block w-48 rounded-lg border border-border bg-surface p-4 shadow-sm"><span className="font-semibold">Hover me</span><span className="block text-sm text-fg-muted">lift: shadow + 3 px rise</span></a>
        </div>
      </Block>
      <Block title="Reduced motion" id="motion-reduced">
        <Rules items={[
          <>With <Code>prefers-reduced-motion: reduce</Code> a global rule cuts every animation and transition to 0.01 ms (globals.css).</>,
          <>Movement is opt-in: <Code>motion-safe:</Code> for button rise/press and pulses, <Code>motion-reduce:</Code> to cancel photo zoom; the <Code>lift</Code> rise needs a fine pointer and no reduced motion, while its shadow change stays.</>,
          <>Stories don’t auto-advance with reduced motion; the page transition is off.</>,
          <>Hover effects only exist with a real pointer (<Code>hoverOnlyWhenSupported</Code>), so nothing sticks after a tap.</>,
        ]} />
        <DoDont dos={['Animate colour, shadow and transform only.', 'Keep micro-interactions under 250 ms.']} donts={['No animation on page load besides PageTransition.', 'Don’t animate width/height or layout.', 'No motion that carries meaning on its own.']} />
      </Block>
    </div>
  )
}
