import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from '@/components/feedback/toast'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { useServices } from '@/services'
import { FEEDBACK_MAX } from '@/services/feedback/types'

/** "Send feedback": a short message to the team, stamped with the page and app version so it can be acted on. */
export function FeedbackSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { feedback } = useServices()
  const route = useLocation().pathname
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const empty = message.trim().length === 0

  const send = async () => {
    if (empty) return
    setBusy(true)
    setError(undefined)
    try {
      await feedback.send({ message, route })
      toast({ title: 'Thank you', description: 'We read every message.' })
      setMessage('')
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t send that. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Send feedback" description="Something broken, confusing or missing? Tell us. We note which page you were on and the app version; nothing else about your trips.">
      <form className="space-y-3 px-5 pb-5" onSubmit={(e) => { e.preventDefault(); void send() }}>
        <label htmlFor="feedback-text" className="block font-medium">What happened, or what would help?</label>
        <textarea
          id="feedback-text" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={FEEDBACK_MAX} rows={6}
          className="w-full rounded-md border border-border-strong bg-surface p-3" aria-describedby="feedback-count"
        />
        <p id="feedback-count" className="text-sm text-fg-muted">{message.length} / {FEEDBACK_MAX}</p>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={empty || busy}>{busy ? 'Sending…' : 'Send'}</Button>
        </div>
      </form>
    </ResponsiveSheet>
  )
}
