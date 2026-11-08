import { createContext, useContext, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import type { Example } from './doc'
import { Preview } from './Preview'
import { exampleSource } from './source'
import { cn } from '@/lib/cn'

/* Small building blocks shared by the library's foundation and pattern pages. */

export const GuideContext = createContext<{ scope: string; raw?: string; examples: Example[] } | null>(null)

/** A live example declared in the page module's `examples` (so it can also open in a viewport frame). */
export function Live({ id }: { id: string }) {
  const ctx = useContext(GuideContext)
  const example = ctx?.examples.find((e) => e.id === id)
  if (!ctx || !example) throw new Error(`Unknown example ${id}`)
  return <Preview docId={ctx.scope} example={example} code={ctx.raw ? exampleSource(ctx.raw, id) : undefined} />
}

export function Block({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id ? `${id}-h` : undefined} className="space-y-4">
      <h2 id={id ? `${id}-h` : undefined} className="text-2xl font-bold">{title}</h2>
      {children}
    </section>
  )
}

/** A rules list: each item a short, imperative rule. */
export function Rules({ items }: { items: ReactNode[] }) {
  return <ul className="list-disc space-y-1.5 pl-5 text-fg marker:text-primary">{items.map((r, i) => <li key={i}>{r}</li>)}</ul>
}

export function DoDont({ dos, donts }: { dos: ReactNode[]; donts: ReactNode[] }) {
  const col = (title: string, items: ReactNode[], good: boolean) => (
    <div className={cn('rounded-lg border p-4', good ? 'border-success/50 bg-success/[0.06]' : 'border-error/50 bg-error/[0.06]')}>
      <h3 className={cn('mb-2 flex items-center gap-2 font-bold', good ? 'text-success' : 'text-error')}>
        {good ? <Check aria-hidden className="size-5" /> : <X aria-hidden className="size-5" />}{title}
      </h3>
      <ul className="space-y-1.5 text-sm">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  )
  return <div className="grid gap-3 sm:grid-cols-2">{col('Do', dos, true)}{col('Don’t', donts, false)}</div>
}

/** A simple, scrollable data table with a caption (read by screen readers as the table's name). */
export function Table({ caption, head, rows, className }: { caption: string; head: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border bg-surface', className)}>
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
          <tr>{head.map((h, i) => <th key={i} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              {r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="px-3 py-2 font-semibold">{c}</th> : <td key={j} className="px-3 py-2">{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const Code = ({ children }: { children: ReactNode }) => <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>

/** Doc text with `backticks` shown as code. */
export function rich(text: string): ReactNode {
  if (!text.includes('`')) return text
  return text.split('`').map((part, i) => (i % 2 ? <Code key={i}>{part}</Code> : part))
}
