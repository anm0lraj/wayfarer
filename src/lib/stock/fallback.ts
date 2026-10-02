import { placeholderImage } from '@/lib/placeholder'
import { STOCK_HOST } from './index'

/**
 * Photos come from the network, so a card can lose its image (first visit offline, flaky connection). Instead of a
 * broken-image icon, swap in the generated illustration for the same seed. One capture-phase listener covers every
 * `<img>` in the app, including ones added later; each image falls back at most once.
 */
export function installImageFallback(root: Document = document): () => void {
  const onError = (e: Event) => {
    const img = e.target
    if (!(img instanceof HTMLImageElement) || img.dataset.fellBack) return
    let url: URL
    try { url = new URL(img.currentSrc || img.src) } catch { return }
    if (url.hostname !== STOCK_HOST) return
    const seed = new URLSearchParams(url.hash.slice(1)).get('s') ?? 'fallback'
    img.dataset.fellBack = '1'
    img.src = placeholderImage(seed, '', [16, 9])
  }
  root.addEventListener('error', onError, true) // 'error' on <img> doesn't bubble, so listen while capturing
  return () => root.removeEventListener('error', onError, true)
}
