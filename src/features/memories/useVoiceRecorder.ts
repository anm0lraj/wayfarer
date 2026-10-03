import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderState =
  | { kind: 'unsupported' }
  | { kind: 'idle' }
  | { kind: 'recording'; startedAt: number }
  | { kind: 'denied' }
  | { kind: 'error'; message: string }
  | { kind: 'recorded'; blob: Blob; url: string }

const supported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

/**
 * Voice notes with MediaRecorder. The microphone is only opened when `start()` is called (from a button the
 * traveller pressed) and is released the moment recording stops, so the browser's mic indicator goes away.
 */
export function useVoiceRecorder(maxSeconds?: number) {
  const [state, setState] = useState<RecorderState>(() => (supported() ? { kind: 'idle' } : { kind: 'unsupported' }))
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)

  const release = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }, [])

  const start = useCallback(async () => {
    if (!supported()) return setState({ kind: 'unsupported' })
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = s
      const chunks: Blob[] = []
      const r = new MediaRecorder(s)
      recorder.current = r
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      r.onstop = () => {
        release()
        const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' })
        setState({ kind: 'recorded', blob, url: URL.createObjectURL(blob) })
      }
      r.start()
      setState({ kind: 'recording', startedAt: Date.now() })
      // Where recordings must stay small, stop by itself rather than produce something that cannot be saved.
      if (maxSeconds) window.setTimeout(() => { if (r.state === 'recording') r.stop() }, maxSeconds * 1000)
    } catch (e) {
      release()
      const name = (e as { name?: string }).name
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? { kind: 'denied' } : { kind: 'error', message: 'We couldn’t start the microphone.' })
    }
  }, [release, maxSeconds])

  const stop = useCallback(() => { if (recorder.current?.state === 'recording') recorder.current.stop() }, [])

  const reset = useCallback(() => {
    setState((s) => { if (s.kind === 'recorded') URL.revokeObjectURL(s.url); return { kind: 'idle' } })
  }, [])

  useEffect(() => () => { recorder.current?.state === 'recording' && recorder.current.stop(); release() }, [release])

  return { state, start, stop, reset }
}
