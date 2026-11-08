/*
 * Pinned interaction states for the library's previews. Hover, focus-visible and pressed are CSS pseudo-classes, so a
 * static preview can't show them. This copies every rule of the app's real stylesheets that uses one of them, with the
 * pseudo-class swapped for "inside a `.ds-force-*` wrapper", so a `<Cell force="hover">` shows exactly what the
 * component's own CSS does on hover. Hover-only media queries are dropped (the pinned look shows on any device);
 * other conditions, such as reduced motion, are kept.
 */

const FOCUSABLE = 'a, button, input, select, textarea, summary, [tabindex], [role="radio"], [role="tab"], [role="menuitem"]'
const PSEUDO = /:hover|:focus-visible|:active/

function rewrite(selector: string): string {
  return selector
    .replace(/:hover/g, ':is(.ds-force-hover, .ds-force-hover *)')
    .replace(/:active/g, ':is(.ds-force-active, .ds-force-active *)')
    .replace(/:focus-visible/g, `:is(.ds-force-focus :is(${FOCUSABLE}))`)
}

/** `(hover: hover) and (pointer: fine) and (x)` → `(x)`; '' when nothing else is left. */
function withoutPointer(condition: string): string {
  return condition
    .split(/\s+and\s+/)
    .filter((c) => !/^\((hover:\s*hover|pointer:\s*fine)\)$/.test(c.trim()))
    .join(' and ')
}

function collect(rules: CSSRuleList, wrappers: string[], out: string[]) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      if (!PSEUDO.test(rule.selectorText)) continue
      let css = `${rewrite(rule.selectorText)} { ${rule.style.cssText} }`
      for (const w of [...wrappers].reverse()) css = `${w} { ${css} }`
      out.push(css)
    } else if (rule instanceof CSSMediaRule) {
      const cond = withoutPointer(rule.conditionText ?? rule.media.mediaText)
      collect(rule.cssRules, cond ? [...wrappers, `@media ${cond}`] : wrappers, out)
    } else if (typeof CSSSupportsRule !== 'undefined' && rule instanceof CSSSupportsRule) {
      collect(rule.cssRules, [...wrappers, `@supports ${rule.conditionText}`], out)
    }
  }
}

export function forcedStateCss(sheets: Iterable<CSSStyleSheet>): string {
  const out: string[] = []
  for (const sheet of sheets) {
    if (sheet.ownerNode instanceof Element && sheet.ownerNode.id === STYLE_ID) continue
    let rules: CSSRuleList
    try { rules = sheet.cssRules } catch { continue } // a cross-origin sheet can't be read
    collect(rules, [], out)
  }
  return out.join('\n')
}

const STYLE_ID = 'ds-forced-states'

/** Installs (and keeps up to date while Vite hot-reloads CSS) the pinned-state stylesheet. Returns a cleanup. */
export function installForcedStates(): () => void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.append(style)
  }
  const el = style
  const build = () => { el.textContent = forcedStateCss(Array.from(document.styleSheets)) }
  build()
  let queued = false
  const observer = new MutationObserver((records) => {
    const own = (n: Node) => n === el || n.parentNode === el
    if (records.every((r) => own(r.target) || (r.addedNodes.length > 0 && Array.from(r.addedNodes).every(own)))) return
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; build() })
  })
  observer.observe(document.head, { childList: true, subtree: true, characterData: true })
  return () => { observer.disconnect(); el.remove() }
}
