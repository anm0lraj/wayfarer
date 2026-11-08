import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { announce } from '@/lib/a11y/announce'
import { cn } from '@/lib/cn'
import type { Example } from './doc'
import { rich } from './ui'

export type PreviewTheme = 'light' | 'dark'
type ThemeChoice = PreviewTheme | 'both'
type Width = 'fit' | 390 | 820 | 1440

const WIDTHS: { value: Width; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: 390, label: 'Phone 390' },
  { value: 820, label: 'Tablet 820' },
  { value: 1440, label: 'Desktop 1440' },
]

const appTheme = (): PreviewTheme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

/** A row of toggle chips: one choice of several (each chip is a pressed/not pressed button). */
function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span aria-hidden className="mr-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      {options.map((o) => (
        <Chip key={String(o.value)} selected={o.value === value} onClick={() => onChange(o.value)} className="min-h-9 px-3 text-xs">{o.label}</Chip>
      ))}
    </div>
  )
}

/** A themed stage: everything inside reads the light or dark tokens, whatever the library itself uses. */
export function Stage({ theme, children, className }: { theme: PreviewTheme; children: ReactNode; className?: string }) {
  // translateZ(0) makes fixed-position parts (bottom bars, toasts) stay inside the stage instead of the window.
  return <div data-theme={theme} className={cn('relative overflow-hidden bg-bg text-fg [transform:translateZ(0)]', className)}>{children}</div>
}

/** The example drawn inside an iframe of a real viewport width (media queries and layout classes apply), scaled to fit. */
function FrameView({ src, width, height, title }: { src: string; width: number; height?: number; title: string }) {
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [avail, setAvail] = useState(width)
  const [content, setContent] = useState(height ?? 240)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setAvail(el.clientWidth))
    ro.observe(el)
    setAvail(el.clientWidth || width)
    return () => ro.disconnect()
  }, [width])
  useEffect(() => {
    if (height) return
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return
      const h = (e.data as { dsFrameHeight?: number } | null)?.dsFrameHeight
      if (typeof h === 'number') setContent(Math.min(h, 2400))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [height])
  const scale = Math.min(1, avail / width)
  return (
    <div ref={box} className="w-full overflow-hidden" style={{ height: content * scale }}>
      <iframe
        ref={frame}
        src={src}
        title={title}
        width={width}
        height={content}
        className="origin-top-left border-0"
        style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}
      />
    </div>
  )
}

export function CodeBlock({ code, label = 'Copy code' }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <div className="relative">
      <pre className="max-h-96 overflow-auto rounded-md bg-[rgb(16_24_52)] p-4 pr-24 text-sm leading-relaxed text-[rgb(226_232_255)]"><code>{code}</code></pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => { setCopied(true); announce('Copied to clipboard') }, () => announce('Couldn’t copy. Select the code and copy it by hand.'))
        }}
        className="absolute right-2 top-2 inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
      >
        {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
        {copied ? 'Copied' : label}
      </button>
    </div>
  )
}

/**
 * One live example: the real component, rendered in light and/or dark tokens at a fitted width or inside a
 * phone / tablet / desktop viewport, with its copyable source.
 */
export function Preview({ docId, example, code }: { docId: string; example: Example; code?: string }) {
  const [theme, setTheme] = useState<ThemeChoice>(appTheme)
  const [width, setWidth] = useState<Width>(example.frame?.width ?? 'fit')
  const [showCode, setShowCode] = useState(false)
  const titleId = useId()
  const codeId = useId()
  const themes: PreviewTheme[] = theme === 'both' ? ['light', 'dark'] : [theme]
  const framed = width !== 'fit'
  return (
    <section aria-labelledby={titleId} className="space-y-3" id={`example-${example.id}`}>
      <div>
        <h3 id={titleId} className="text-lg font-bold">{example.title}</h3>
        {example.description && <p className="text-sm text-fg-muted">{rich(example.description)}</p>}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-3 py-2">
          <Choice label="Theme" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'both', label: 'Both' }]} />
          <Choice label="Width" value={width} onChange={setWidth} options={example.frame ? WIDTHS.filter((w) => w.value !== 'fit') : WIDTHS} />
          {code && (
            <button
              type="button"
              aria-expanded={showCode}
              aria-controls={codeId}
              onClick={() => setShowCode((s) => !s)}
              className="ml-auto inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              {showCode ? 'Hide code' : 'Show code'}
            </button>
          )}
        </div>
        <div className={cn('grid', themes.length === 2 && !framed && 'xl:grid-cols-2', themes.length === 2 && 'gap-px bg-border')}>
          {themes.map((t) => (
            <Stage key={t} theme={t} className={framed ? 'p-0' : 'p-5'}>
              {themes.length === 2 && <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t === 'light' ? 'Light' : 'Dark'}</p>}
              {framed ? (
                <FrameView
                  src={`/_design/frame/${docId}/${example.id}?theme=${t}`}
                  width={width}
                  height={example.frame?.height}
                  title={`${example.title}: ${t} theme at ${width}px`}
                />
              ) : (
                <div className={cn(example.stack ? 'flex flex-col gap-6' : 'flex flex-wrap items-end gap-6')}>{example.render()}</div>
              )}
            </Stage>
          ))}
        </div>
        {code && <div id={codeId} hidden={!showCode} className="border-t border-border p-3">{showCode && <CodeBlock code={code} />}</div>}
      </div>
    </section>
  )
}
