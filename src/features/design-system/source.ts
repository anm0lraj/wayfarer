/*
 * Copyable code for an example, read from the docs file's own source (imported with `?raw`), so what the reader copies
 * is exactly what renders in the preview. Brackets are counted without parsing strings: keep JSX text in examples free
 * of unbalanced brackets (docs.test.ts parses every extracted snippet, so a bad cut fails the tests).
 */

function balanced(src: string, start: number): number {
  const open = src[start]!
  const close = open === '(' ? ')' : open === '{' ? '}' : ']'
  let depth = 0
  for (let i = start; i < src.length; i++) {
    if (src[i] === open) depth++
    else if (src[i] === close && --depth === 0) return i
  }
  return -1
}

function dedent(code: string): string {
  const lines = code.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n')
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length))
  return lines.map((l) => l.slice(indent)).join('\n')
}

/** Drops the library's `<Cell>` wrappers and an outer fragment, then re-indents. */
export function cleanSnippet(code: string): string {
  let out = code
    .replace(/<Cell\b[^>]*>/g, '\n')
    .replace(/<\/Cell>/g, '\n')
    .split('\n').filter((l) => l.trim()).join('\n')
  out = dedent(out)
  if (out.startsWith('<>') && out.endsWith('</>')) out = dedent(out.slice(2, -3))
  return out
}

/** The source of the example `id`'s render function in a docs file, or undefined if it can't be found. */
export function exampleSource(raw: string, id: string): string | undefined {
  const at = raw.search(new RegExp(`id:\\s*'${id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}'`))
  if (at < 0) return undefined
  const render = raw.indexOf('render:', at)
  const arrow = render < 0 ? -1 : raw.indexOf('=>', render)
  if (arrow < 0) return undefined
  let i = arrow + 2
  while (/\s/.test(raw[i] ?? '')) i++
  let body: string
  if (raw[i] === '(' || raw[i] === '{') {
    const end = balanced(raw, i)
    if (end < 0) return undefined
    body = raw.slice(i + 1, end)
    if (raw[i] === '{') body = body.replace(/^\s*return\s*/, '')
  } else {
    const end = raw.indexOf('\n', i)
    body = raw.slice(i, end < 0 ? undefined : end).replace(/,\s*$/, '')
  }
  body = cleanSnippet(body.trim())
  // `render: () => <SheetDemo wide="dialog" />` → show the demo component itself, which holds the state.
  const demo = body.match(/^<([A-Z]\w*)\b[^<>]*\/>$/)
  if (demo) {
    const start = raw.indexOf(`function ${demo[1]}(`)
    if (start >= 0) {
      const brace = raw.indexOf(') {', start)
      const end = brace < 0 ? -1 : balanced(raw, brace + 2)
      if (end > 0) return `${raw.slice(start, end + 1)}${/\s\w+=/.test(body) ? `\n\n// Used as:\n${body}` : ''}`
    }
  }
  return body
}
