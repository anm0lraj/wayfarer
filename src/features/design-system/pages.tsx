import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Chip'
import { GROUPS, type PartDoc } from './doc'
import { CodeBlock, Preview } from './Preview'
import { codeFor, componentDocs, type LoadedDoc } from './registry'
import { foundationPages } from './foundations'
import { patternPages } from './patterns'
import { Block, Code, DoDont, GuideContext, Rules, Table, rich } from './ui'

function useTitle(title: string) {
  useEffect(() => { document.title = `${title} · Wayfarer design system` }, [title])
}

function Intro({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children?: React.ReactNode }) {
  return (
    <header className="mb-10 max-w-3xl space-y-3">
      <p className="text-sm font-bold uppercase tracking-wide text-primary">{eyebrow}</p>
      <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="text-lg text-fg-muted">{rich(summary)}</p>
      {children}
    </header>
  )
}

function NotFound() {
  return <Intro eyebrow="Design system" title="Page not found" summary="That page isn’t in the library. Use the contents to find it." />
}

export function Overview() {
  useTitle('Overview')
  const counts = { foundations: foundationPages.length, components: componentDocs.length, patterns: patternPages.length }
  const cards = [
    { title: 'Foundations', count: counts.foundations, to: `/_design/foundations/${foundationPages[0]!.id}`, text: 'Colour, type, spacing, radius, elevation, motion, layout, icons, imagery, illustrations and voice.' },
    { title: 'Components', count: counts.components, to: `/_design/components/${componentDocs[0]!.id}`, text: 'Every component in src/components (and the app navigation), live, with props, states and accessibility.' },
    { title: 'Patterns', count: counts.patterns, to: `/_design/patterns/${patternPages[0]!.id}`, text: 'Forms, screen states, sheets and dialogs, Undo, live status and booking labels.' },
  ]
  return (
    <>
      <Intro eyebrow="Wayfarer" title="Design system" summary="Bright, bold and adventurous: one strong brand colour, Electric Blue, on a clean light ground, with orange for “happening now”. Everything here is drawn by the app’s real components and tokens, so it can’t drift from the product." />
      <div className="space-y-12">
        <ul className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <li key={c.title}>
              <Link to={c.to} className="lift group flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-5 shadow-sm">
                <span className="flex items-center justify-between"><span className="text-xl font-bold">{c.title}</span><Badge tone="primary">{c.count}</Badge></span>
                <span className="text-sm text-fg-muted">{c.text}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-primary">Open <ArrowRight aria-hidden className="size-4" /></span>
              </Link>
            </li>
          ))}
        </ul>
        <Block title="Principles" id="principles">
          <Rules items={[
            <><strong>Travel first.</strong> Large real photos, maps where geography matters, AI only where it saves effort. No random gradients, no card-in-card.</>,
            <><strong>Blue acts, orange is now.</strong> Electric Blue marks what you can do; orange marks what is happening right now. Everything else stays calm.</>,
            <><strong>Three layouts, designed.</strong> Phone (bottom bar, sheets), tablet (rail, two panes), desktop (sidebar, side-by-side, docked AI).</>,
            <><strong>Accessible by default.</strong> WCAG 2.2 AA in both themes, 44 px targets, full keyboard support, reduced motion respected.</>,
            <><strong>Honest.</strong> Bold, friendly headings; plain controls, prices and errors. Demo bookings say “Saved to trip — not booked”.</>,
          ]} />
        </Block>
        <Block title="Using the library" id="using">
          <Rules items={[
            'Each preview has a theme switch (light, dark or both side by side) and a width switch: Phone, Tablet and Desktop open the example in a real viewport of that width, so breakpoints and layout classes apply.',
            'States such as hover, focus-visible and pressed are pinned with the components’ own CSS.',
            '“Show code” gives the example’s source, read from its docs file, ready to copy.',
            <>Press <kbd className="rounded-sm border border-border-strong px-1">/</kbd> to filter the contents.</>,
          ]} />
        </Block>
        <Block title="Adding a component" id="adding">
          <Rules items={[
            <>Write <Code>MyThing.docs.tsx</Code> next to <Code>MyThing.tsx</Code> that default-exports <Code>defineDoc(…)</Code> (or an array of them); it appears here automatically.</>,
            <>Document every own prop with <Code>part(&apos;MyThing&apos;, MyThing, &#123; props &#125;)</Code>: the type system rejects a missing, extra or wrongly-required prop, and <Code>docs.test.ts</Code> fails too.</>,
            'Show every variant and state in examples, wrapping each in <Cell label force?>.',
            <>See <Code>docs/DESIGN_SYSTEM.md</Code> for the checklist.</>,
          ]} />
        </Block>
      </div>
    </>
  )
}

function PropsTable({ part }: { part: PartDoc }) {
  const rows = Object.entries(part.props)
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-lg font-bold">{part.name}</h3>
      {rows.length ? (
        <Table
          caption={`${part.name} props`}
          head={['Prop', 'Type', 'Default', 'Required', 'Description']}
          rows={rows.map(([name, p]) => [
            <Code key="n">{name}</Code>,
            <Code key="t">{p.type}</Code>,
            p.default ? <Code key="d">{p.default}</Code> : '—',
            p.required ? <Badge key="r" tone="primary" className="text-xs">Required</Badge> : 'No',
            rich(p.description),
          ])}
        />
      ) : (
        <p className="text-sm text-fg-muted">No props of its own.</p>
      )}
      {part.inherits && <p className="text-sm text-fg-muted"><strong className="text-fg">Also accepts:</strong> {rich(part.inherits)}</p>}
    </div>
  )
}

function importLine(doc: LoadedDoc) {
  const names = doc.parts.map((p) => p.name).join(', ')
  return `import { ${names} } from '@/${doc.source.replace(/^src\//, '').replace(/\.tsx?$/, '')}'`
}

function A11y({ doc }: { doc: LoadedDoc }) {
  const a = doc.a11y
  const facts: [string, string | undefined][] = [['Screen readers', a.announces], ['Focus', a.focus], ['Mouse and touch', a.pointer], ['Motion', a.motion]]
  return (
    <div className="space-y-5">
      {a.keyboard && <Table caption={`${doc.title} keyboard`} head={['Key', 'Action']} rows={a.keyboard.map(([k, v]) => [<kbd key="k" className="font-mono">{k}</kbd>, rich(v)])} className="max-w-2xl [&_table]:min-w-0" />}
      {a.aria && <div><h3 className="mb-1 font-bold">Roles and ARIA</h3><Rules items={a.aria.map(rich)} /></div>}
      <dl className="grid gap-3 sm:grid-cols-2">
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-surface-2 p-4"><dt className="font-bold">{k}</dt><dd className="text-sm text-fg-muted">{rich(v!)}</dd></div>
        ))}
      </dl>
    </div>
  )
}

export function ComponentPage() {
  const { id } = useParams()
  const doc = componentDocs.find((d) => d.id === id)
  useTitle(doc?.title ?? 'Not found')
  if (!doc) return <NotFound />
  const group = GROUPS.find((g) => g.id === doc.group)!.label
  return (
    <article>
      <Intro eyebrow={group} title={doc.title} summary={doc.summary}>
        <p className="text-sm text-fg-muted">Source: <Code>{doc.source}</Code> · Docs: <Code>{doc.docsFile.slice(1)}</Code></p>
        <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
          {[['examples', 'Examples'], ['props', 'Props'], ['a11y', 'Accessibility'], ['guidance', 'Guidance']].map(([h, l]) => (
            <a key={h} href={`#${h}`} className="inline-flex min-h-9 items-center text-primary hover:underline">{l}</a>
          ))}
        </nav>
      </Intro>
      <div className="space-y-14">
        <section id="examples" aria-labelledby="examples-h" className="scroll-mt-20 space-y-8">
          <h2 id="examples-h" className="text-2xl font-bold">Examples</h2>
          {doc.examples.map((ex) => <Preview key={ex.id} docId={doc.id} example={ex} code={codeFor(doc.raw, ex)} />)}
        </section>
        <section id="props" aria-labelledby="props-h" className="scroll-mt-20 space-y-6">
          <h2 id="props-h" className="text-2xl font-bold">Props</h2>
          <CodeBlock code={importLine(doc)} label="Copy import" />
          {doc.parts.map((p) => <PropsTable key={p.name} part={p} />)}
        </section>
        <section id="a11y" aria-labelledby="a11y-h" className="scroll-mt-20 space-y-4">
          <h2 id="a11y-h" className="text-2xl font-bold">Accessibility and interaction</h2>
          <A11y doc={doc} />
        </section>
        <section id="guidance" aria-labelledby="guidance-h" className="scroll-mt-20 space-y-4">
          <h2 id="guidance-h" className="text-2xl font-bold">Guidance</h2>
          <DoDont dos={doc.guidance.do.map(rich)} donts={doc.guidance.dont.map(rich)} />
        </section>
      </div>
    </article>
  )
}

export function GuideView({ section }: { section: 'foundations' | 'patterns' }) {
  const { id } = useParams()
  const page = (section === 'foundations' ? foundationPages : patternPages).find((p) => p.id === id)
  useTitle(page?.title ?? 'Not found')
  if (!page) return <NotFound />
  const { Page } = page
  return (
    <article>
      <Intro eyebrow={section === 'foundations' ? 'Foundations' : 'Patterns'} title={page.title} summary={page.summary} />
      <GuideContext.Provider value={{ scope: `${section}.${page.id}`, raw: page.raw, examples: page.examples ?? [] }}>
        <Page />
      </GuideContext.Provider>
    </article>
  )
}
