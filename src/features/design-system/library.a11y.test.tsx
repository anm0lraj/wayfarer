import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { installMockApi } from '@/mocks/install'
import { renderApp } from '@/test/renderApp'
import { navEntries } from './registry'
import { CONTRAST_PAIRS, pairRatio } from './tokens'

/*
 * An accessibility check of the library's own pages, without axe: every page is rendered with the real app and checked
 * for accessible names on interactive elements, valid roles, labelled form controls and unique ids. Separately: the
 * focus-visible style exists and isn't switched off without a replacement, and every documented colour pair passes AA.
 */

const ROLES = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'blockquote', 'button', 'caption', 'cell', 'checkbox', 'code', 'columnheader',
  'combobox', 'complementary', 'contentinfo', 'definition', 'deletion', 'dialog', 'document', 'emphasis', 'feed', 'figure', 'form', 'generic',
  'grid', 'gridcell', 'group', 'heading', 'img', 'insertion', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu',
  'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'meter', 'navigation', 'none', 'note', 'option', 'paragraph', 'presentation',
  'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
  'spinbutton', 'status', 'strong', 'subscript', 'superscript', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox', 'time',
  'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem',
])
const NAMED_ROLES = ['button', 'link', 'textbox', 'searchbox', 'spinbutton', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'combobox', 'slider', 'progressbar', 'tablist', 'radiogroup', 'navigation', 'dialog', 'img'] as const

beforeAll(() => installMockApi())

const pages = [{ path: '/_design', title: 'Design system' }, ...navEntries.map((e) => ({ path: e.path, title: e.title }))]

function audit(): string[] {
  const problems: string[] = []
  for (const role of NAMED_ROLES) {
    const all = screen.queryAllByRole(role)
    const named = new Set(screen.queryAllByRole(role, { name: /\S/ }))
    for (const el of all) if (!named.has(el)) problems.push(`${role} without an accessible name: ${el.outerHTML.slice(0, 160)}`)
  }
  for (const el of document.querySelectorAll('[role]')) {
    for (const r of (el.getAttribute('role') ?? '').split(/\s+/)) if (!ROLES.has(r)) problems.push(`invalid role "${r}"`)
  }
  for (const el of document.querySelectorAll<HTMLInputElement>('input:not([type=hidden]), select, textarea')) {
    const labelled = (el.labels?.length ?? 0) > 0 || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')
    if (!labelled) problems.push(`unlabelled form control: ${el.outerHTML.slice(0, 160)}`)
  }
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) problems.push(`duplicate id "${id}"`)
  for (const el of document.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls]')) {
    // Radix renders only the active tab's panel, so an inactive tab's aria-controls has no target until it is chosen.
    const attrs = el.getAttribute('role') === 'tab' ? ['aria-labelledby', 'aria-describedby'] : ['aria-labelledby', 'aria-describedby', 'aria-controls']
    for (const attr of attrs) {
      for (const ref of (el.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)) if (!document.getElementById(ref)) problems.push(`${attr} points at missing #${ref}`)
    }
  }
  if (document.querySelectorAll('main h1').length < 1) problems.push('no h1 in main')
  return problems
}

describe('library pages are accessible', () => {
  it.each(pages.map((p) => [p.path, p] as const))('%s', async (path, page) => {
    renderApp(path)
    await waitFor(() => expect(document.querySelector('main h1')?.textContent).toBe(page.title), { timeout: 8000 })
    expect(audit()).toEqual([])
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? sourceFiles(p) : p.endsWith('.tsx') && !p.endsWith('.test.tsx') ? [p] : [] })
}

describe('focus is always visible', () => {
  it('the global focus-visible outline exists (3 px, focus colour)', () => {
    const css = readFileSync('src/styles/globals.css', 'utf8')
    expect(css).toMatch(/:focus-visible\s*\{\s*outline:\s*3px solid rgb\(var\(--focus\)\)/)
  })

  // `outline-none` is allowed only with a focus-visible replacement, or on things that are not keyboard targets
  // (scroll containers focused by code, dialog bodies, the toast region).
  const ALLOWED = [/id="main"/, /Dialog\.Content|ResponsiveSheet/, /Toast\.Viewport/, /focus-visible:ring/]
  it.each([...sourceFiles('src/components'), ...sourceFiles('src/features/design-system')])('%s', (file) => {
    const lines = readFileSync(file, 'utf8').split('\n')
    const bad = lines
      .map((line, i) => ({ line, i, ctx: lines.slice(Math.max(0, i - 12), i + 3).join('\n') }))
      .filter(({ line }) => /\boutline-none\b/.test(line))
      .filter(({ line, ctx }) => !/focus-visible:/.test(line) && !ALLOWED.some((re) => re.test(ctx)))
      .map(({ i, line }) => `${file}:${i + 1}: ${line.trim().slice(0, 120)}`)
    expect(bad).toEqual([])
  })
})

describe('documented colour pairs pass WCAG AA', () => {
  it.each(CONTRAST_PAIRS.flatMap((p) => (['light', 'dark'] as const).map((t) => [`${p.label} (${t})`, p, t] as const)))('%s', (_n, pair, theme) => {
    expect(pairRatio(pair, theme)).toBeGreaterThanOrEqual(pair.min)
  })
})
