import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { render, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '@/services'
import { componentDocs } from './registry'
import { foundationPages } from './foundations'
import { patternPages } from './patterns'
import { exampleSource } from './source'

/*
 * The drift tests. The docs live next to the components (`*.docs.tsx`) and are typed against them; these tests make
 * sure that stays true: every exported component is documented, every documented part is the real export, every
 * documented prop exists (and every public one is documented: the TypeScript check), every example renders, and
 * every example's copyable code is valid TSX.
 */

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : [p]
  })
}

const componentFiles = files('src/components').filter((f) => /\.tsx?$/.test(f) && !/\.(test|docs)\.tsx?$/.test(f))

/** Exported components (PascalCase) and the toast() function of every file in src/components. */
function exports(file: string): string[] {
  const src = readFileSync(file, 'utf8')
  const names = [...src.matchAll(/export (?:const|function) ([A-Z]\w*)/g)].map((m) => m[1]!)
  if (/export function toast\(/.test(src)) names.push('toast')
  return names
}

const modules = import.meta.glob<Record<string, unknown>>(['/src/components/**/*.{ts,tsx}', '/src/app/nav/Navigation.tsx', '!**/*.docs.tsx', '!**/*.test.tsx'], { eager: true })

describe('component inventory', () => {
  const documented = new Set(componentDocs.flatMap((d) => d.parts.map((p) => p.name)))

  it.each(componentFiles)('%s: every export is documented', (file) => {
    const missing = exports(file).filter((name) => !documented.has(name))
    expect(missing, `Undocumented exports in ${file}: add them to a *.docs.tsx (part(...))`).toEqual([])
  })

  it.each(componentDocs.map((d) => [d.id, d] as const))('%s: every documented part is the real export of its source', (_id, doc) => {
    for (const part of doc.parts) {
      const owner = Object.entries(modules).find(([, mod]) => mod[part.name] === part.component)
      expect(owner, `${doc.id}: ${part.name} is not exported by any component module`).toBeDefined()
      const sources = [doc.source, 'src/components/feedback/toast.ts']
      expect(sources.some((s) => owner![0] === `/${s}`), `${part.name} comes from ${owner![0]}, doc says ${doc.source}`).toBe(true)
    }
  })

  it('ids are unique and every doc has examples, a11y notes and guidance', () => {
    const ids = componentDocs.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const d of componentDocs) {
      expect(d.examples.length, d.id).toBeGreaterThan(0)
      expect(d.guidance.do.length + d.guidance.dont.length, d.id).toBeGreaterThan(0)
      expect(Object.keys(d.a11y).length, d.id).toBeGreaterThan(0)
    }
  })

  it('example ids are unique within each docs file (the code extractor looks them up by id)', () => {
    for (const [file, raw] of [...new Set(componentDocs.map((d) => d.docsFile))].map((f) => [f, componentDocs.find((d) => d.docsFile === f)!.raw] as const)) {
      const ids = [...raw.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1])
      expect(ids.length - new Set(ids).size, `duplicate ids in ${file}`).toBe(0)
    }
  })
})

describe('documented props match the components (TypeScript)', () => {
  it('the docs files type-check: no missing, extra or wrongly-required prop', () => {
    const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile)
    const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, '.')
    const docsFiles = [...files('src/components'), ...files('src/app/nav')].filter((f) => f.endsWith('.docs.tsx'))
    const program = ts.createProgram(docsFiles, { ...options, noEmit: true, incremental: false, tsBuildInfoFile: undefined })
    const diagnostics = docsFiles.flatMap((f) => [...program.getSemanticDiagnostics(program.getSourceFile(f)), ...program.getSyntacticDiagnostics(program.getSourceFile(f))])
    const text = diagnostics.map((d) => `${d.file?.fileName}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`)
    expect(text).toEqual([])
  }, 120_000)
})

const allExamples = [
  ...componentDocs.flatMap((d) => d.examples.map((e) => ({ scope: d.id, raw: d.raw, example: e }))),
  ...[...foundationPages, ...patternPages].flatMap((p) => (p.examples ?? []).map((e) => ({ scope: p.id, raw: p.raw ?? '', example: e }))),
]

describe('copyable code', () => {
  it.each(allExamples.map((x) => [`${x.scope}/${x.example.id}`, x] as const))('%s is valid TSX', (_name, { raw, example }) => {
    const code = exampleSource(raw, example.id)
    expect(code, 'no code found').toBeTruthy()
    expect(code).not.toMatch(/<Cell\b|<\/Cell>/)
    const source = code!.startsWith('function') ? code! : `const __example = (<>\n${code}\n</>)`
    const out = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true, fileName: 'example.tsx' })
    expect(out.diagnostics?.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([])
  })
})

describe('every documented variant and state renders', () => {
  afterEach(() => cleanup())
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  it.each(allExamples.map((x) => [`${x.scope}/${x.example.id}`, x] as const))('%s', (_name, { example }) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <QueryClientProvider client={client}>
        <ServicesProvider><MemoryRouter>{example.render()}</MemoryRouter></ServicesProvider>
      </QueryClientProvider>,
    )
    expect(container.childElementCount + document.body.childElementCount).toBeGreaterThan(0)
    expect(errors.mock.calls.map((c) => String(c[0])).filter((m) => !m.includes('not wrapped in act'))).toEqual([])
    errors.mockRestore()
  })
})
