import type { ComponentType } from 'react'
import { GROUPS, type ComponentDoc, type Example } from './doc'
import { exampleSource } from './source'
import { foundationPages } from './foundations'
import { patternPages } from './patterns'

/*
 * Everything the library shows. Component docs are found by file name (`*.docs.tsx` next to the component, in
 * src/components and src/app/nav), so adding a docs file is all it takes to list a component. Each docs file's raw
 * source comes along for the copyable code.
 */
type DocModule = { default: ComponentDoc | ComponentDoc[] }
const modules = import.meta.glob<DocModule>(['/src/components/**/*.docs.tsx', '/src/app/nav/*.docs.tsx'], { eager: true })
const sources = import.meta.glob<string>(['/src/components/**/*.docs.tsx', '/src/app/nav/*.docs.tsx'], { eager: true, query: '?raw', import: 'default' })

export interface LoadedDoc extends ComponentDoc {
  /** The docs file, e.g. /src/components/ui/Button.docs.tsx */
  docsFile: string
  raw: string
}

const groupOrder = (d: ComponentDoc) => GROUPS.findIndex((g) => g.id === d.group)

export const componentDocs: LoadedDoc[] = Object.entries(modules)
  .flatMap(([file, mod]) => [mod.default].flat().map((doc) => ({ ...doc, docsFile: file, raw: sources[file] ?? '' })))
  .sort((a, b) => groupOrder(a) - groupOrder(b) || a.title.localeCompare(b.title))

export interface GuidePage {
  id: string
  title: string
  summary: string
  Page: ComponentType
  /** Live examples on the page (shown with <Preview>), so they can also be opened in a viewport frame. */
  examples?: Example[]
  /** Source of the page module, for copyable example code. */
  raw?: string
}

export type Section = 'foundations' | 'components' | 'patterns'

export interface NavEntry { section: Section; id: string; title: string; path: string; group?: string }

export const navEntries: NavEntry[] = [
  ...foundationPages.map((p) => ({ section: 'foundations' as const, id: p.id, title: p.title, path: `/_design/foundations/${p.id}` })),
  ...componentDocs.map((d) => ({ section: 'components' as const, id: d.id, title: d.title, path: `/_design/components/${d.id}`, group: GROUPS.find((g) => g.id === d.group)!.label })),
  ...patternPages.map((p) => ({ section: 'patterns' as const, id: p.id, title: p.title, path: `/_design/patterns/${p.id}` })),
]

/** Examples a frame can show: `scope` is a component doc id, or `foundations.<id>` / `patterns.<id>`. */
export function findExample(scope: string, exampleId: string): Example | undefined {
  const [section, id] = scope.includes('.') ? scope.split('.') : ['components', scope]
  const list = section === 'components' ? componentDocs.find((d) => d.id === id)?.examples
    : (section === 'foundations' ? foundationPages : patternPages).find((p) => p.id === id)?.examples
  return list?.find((e) => e.id === exampleId)
}

export const codeFor = (raw: string | undefined, example: Example) => (raw ? exampleSource(raw, example.id) : undefined)
