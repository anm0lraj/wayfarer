import { toast } from '@/components/feedback/toast'

/** Web Share API where available, otherwise copies the link to the clipboard. */
export async function shareLink({ title, text, url }: { title: string; text?: string; url: string }): Promise<void> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return // user closed the share sheet
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    toast({ title: 'Link copied' })
  } catch {
    toast({ title: 'Couldn’t copy the link', description: url })
  }
}
