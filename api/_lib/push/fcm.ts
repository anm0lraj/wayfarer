import { accessToken } from './google.js'

/** Where a message goes. Overridable so tests can stand in for Google. */
const sendUrl = (project: string) => process.env.FCM_SEND_URL ?? `https://fcm.googleapis.com/v1/projects/${project}/messages:send`
const projectId = () => process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID

/** `always`: show even if the app is open and in view (the test button, so it never looks like nothing happened). */
export interface PushMessage { title: string; body: string; link: string; tag: string; always?: boolean }
/** `gone`: the device unregistered (remove it). `retry`: Google had a problem, try again later. */
export type SendResult = 'sent' | 'gone' | 'retry'

/**
 * Sends one notification to one device. The message carries only data: the app's service worker (`public/push-sw.js`)
 * decides whether to show it (it stays quiet when the app is open, because the in-app reminder is already there).
 */
export async function sendPush(token: string, m: PushMessage): Promise<SendResult> {
  const project = projectId()
  if (!project) return 'retry'
  let res: Response
  try {
    res = await fetch(sendUrl(project), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` },
      body: JSON.stringify({
        message: {
          token,
          data: { title: m.title, body: m.body, link: m.link, tag: m.tag, ...(m.always ? { always: '1' } : {}) },
          webpush: { headers: { Urgency: 'high', TTL: '3600' } }, // a reminder that arrives hours late is worse than none
        },
      }),
    })
  } catch {
    return 'retry'
  }
  if (res.ok) return 'sent'
  const err = (await res.json().catch(() => ({}))) as { error?: { status?: string } }
  if (res.status === 404 || err.error?.status === 'UNREGISTERED' || err.error?.status === 'INVALID_ARGUMENT') return 'gone'
  return 'retry'
}
