import type { ComponentProps, JSXElementConstructor, ReactNode } from 'react'

/*
 * The shape of a component's documentation. Each component in src/components has a `*.docs.tsx` file next to it that
 * default-exports a `ComponentDoc`. Props are typed against the component itself (`part()` below): a documented prop
 * that no longer exists, or a public prop with no entry, is a type error, and `docs.test.ts` runs the same check.
 */

export type Group = 'actions' | 'inputs' | 'selection' | 'feedback' | 'navigation' | 'containers' | 'data' | 'media' | 'domain'

export const GROUPS: { id: Group; label: string }[] = [
  { id: 'actions', label: 'Actions' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'selection', label: 'Selection' },
  { id: 'feedback', label: 'Feedback & status' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'containers', label: 'Containers & overlays' },
  { id: 'data', label: 'Data display' },
  { id: 'media', label: 'Media' },
  { id: 'domain', label: 'Domain cards' },
]

export interface PropDoc<Required extends boolean = boolean> {
  /** The type as a reader should see it, e.g. `'primary' | 'secondary'`. */
  type: string
  /** Checked by the type system: true exactly when the prop is not optional. */
  required: Required
  default?: string
  description: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any component shape
type AnyComponent = JSXElementConstructor<any>
// eslint-disable-next-line @typescript-eslint/ban-types -- `{}` is "inherits nothing"
type Nothing = {}
/** The props a component adds on top of what it inherits (e.g. every <button> attribute). `ref`/`key` are React's. */
type OwnKeys<P, Inherited> = Exclude<keyof P, keyof Inherited | 'ref' | 'key'>
// eslint-disable-next-line @typescript-eslint/ban-types
type IsOptional<P, K extends keyof P> = {} extends Pick<P, K> ? false : true

/** One entry per own prop, no more and no fewer; `required` must match the component's type. */
export type PropDocs<P, Inherited = Nothing> = { [K in OwnKeys<P, Inherited>]-?: PropDoc<IsOptional<P, K>> }

export interface PartDoc {
  /** The export's name, e.g. `Button`, `MenuItem`. */
  name: string
  component: unknown
  props: Record<string, PropDoc>
  /** What the rest of the props are passed to, e.g. "All <button> attributes (onClick, disabled, aria-*…)". */
  inherits?: string
}

/** Documents one export. `Inherited` is the part of its props passed straight through (HTML attributes, Radix props). */
export function part<C extends AnyComponent, Inherited = Nothing>(
  name: string,
  component: C,
  spec: { props: PropDocs<ComponentProps<C>, Inherited>; inherits?: string },
): PartDoc {
  return { name, component, props: spec.props as Record<string, PropDoc>, inherits: spec.inherits }
}

/** Documents a plain function export (e.g. `toast()`), whose "props" are its options. */
export function fn<F extends (arg: never) => unknown>(name: string, func: F, spec: { props: PropDocs<Parameters<F>[0]> }): PartDoc {
  return { name, component: func, props: spec.props as Record<string, PropDoc> }
}

export interface Example {
  id: string
  title: string
  description?: string
  /**
   * The live preview. Its source is shown as the copyable code (read from the docs file, so the two can't differ).
   * Wrap each variant/state in `<Cell label="…">`; `force` pins a hover / focus-visible / pressed look using the
   * component's real CSS. The Cell wrappers are dropped from the copied code.
   */
  render: () => ReactNode
  /** Always shown in a frame of this viewport width (for things that depend on the screen, like the navigation). */
  frame?: { width: 390 | 820 | 1440; height: number }
  /** Lay the cells out in a column instead of a wrapping row. */
  stack?: boolean
}

export interface A11yDoc {
  /** [key, what it does] */
  keyboard?: [string, string][]
  /** Roles and ARIA attributes the component renders. */
  aria?: string[]
  /** What a screen reader hears. */
  announces?: string
  focus?: string
  /** Mouse and touch: targets, hover. */
  pointer?: string
  motion?: string
}

export interface ComponentDoc {
  /** URL slug: /_design/components/:id */
  id: string
  title: string
  group: Group
  /** The component's file, e.g. `src/components/ui/Button.tsx`. */
  source: string
  summary: string
  parts: PartDoc[]
  examples: Example[]
  a11y: A11yDoc
  guidance: { do: string[]; dont: string[] }
}

export const defineDoc = (doc: ComponentDoc) => doc
