import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * GitHub silently refuses a workflow file with a YAML mistake (every push shows a failed run with no jobs, and its
 * schedule never fires). The classic one: a `run:` line holding `Header: value`, where the colon-and-space ends the YAML
 * value. This is a cheap guard that needs no YAML library; the full check is GitHub's own parser.
 */
const dir = path.resolve(__dirname, '../../.github/workflows')
const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))

describe('GitHub workflow files', () => {
  it.each(files)('%s has no one-line `run:` command containing ": " (use a | block)', (file) => {
    const bad = readFileSync(path.join(dir, file), 'utf8').split(/\r?\n/)
      .map((text, i) => ({ text, line: i + 1 }))
      .filter(({ text }) => /^\s*(- )?run:\s+[^|>\s#'"]/.test(text) && /:\s/.test(text.replace(/^\s*(- )?run:\s+/, '')))
    expect(bad, bad.map((b) => `line ${b.line}: ${b.text.trim()}`).join('\n')).toEqual([])
  })

  it('finds the workflows it is meant to guard', () => {
    expect(files).toEqual(expect.arrayContaining(['ci.yml', 'push-sweep.yml']))
  })
})
