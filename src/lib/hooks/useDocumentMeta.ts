import { useEffect } from 'react'

export interface DocumentMeta {
  title: string
  description?: string
  image?: string
  /** Absolute or root-relative path of this page. */
  path?: string
}

const set = (attr: 'name' | 'property', key: string, value: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  const previous = el.getAttribute('content')
  el.setAttribute('content', value)
  return () => { previous === null ? el!.remove() : el!.setAttribute('content', previous) }
}

/**
 * Sets the page title and Open Graph / Twitter tags while a page is mounted, and restores them after.
 * This only helps crawlers that run JavaScript. For real link previews the public routes need a server
 * or a prerender step that writes these same tags into the HTML (see README → public pages).
 */
export function useDocumentMeta({ title, description, image, path }: DocumentMeta) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = `${title} · Wayfarer`
    const undo = [
      set('property', 'og:title', title), set('property', 'og:type', 'article'), set('property', 'og:site_name', 'Wayfarer'),
      set('name', 'twitter:card', image ? 'summary_large_image' : 'summary'), set('name', 'twitter:title', title),
    ]
    if (description) undo.push(set('name', 'description', description), set('property', 'og:description', description), set('name', 'twitter:description', description))
    if (image) undo.push(set('property', 'og:image', image), set('name', 'twitter:image', image))
    if (path) undo.push(set('property', 'og:url', new URL(path, window.location.origin).toString()))
    return () => { document.title = prevTitle; undo.forEach((u) => u()) }
  }, [title, description, image, path])
}
