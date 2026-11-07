import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge, Chip } from '@/components/ui/Chip'
import { NotificationSettings } from '@/features/notifications/NotificationSettings'
import { PushDeviceStatus } from '@/features/notifications/PushDeviceStatus'
import { PushPermissionCard } from '@/features/notifications/PushPermissionCard'
import { useSession } from '@/app/providers/session'
import { FeedbackSheet } from '@/features/feedback/FeedbackSheet'
import { useSignOut } from '@/features/account/useSignOut'
import { usePendingChanges, useSyncState } from '@/features/sync/useSyncStatus'
import { env } from '@/config/env'
import { APP_VERSION } from '@/config/version'
import { resetDemoData } from '@/data/seed'
import { wallClockLabel } from '@/lib/dates'
import { promptInstall, usePwa } from '@/lib/pwa'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { useServices } from '@/services'
import { useClockStore } from '@/services/clock/clock'
import { format } from 'date-fns'

const themes: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' },
]

// Demo dates for the "5 Days in Bali" trip (12–16 Oct 2026, Asia/Makassar, UTC+8).
const presets = [
  { label: '7 days before', iso: '2026-10-05T09:00:00+08:00' },
  { label: 'Day 1, 08:30', iso: '2026-10-12T08:30:00+08:00' },
  { label: 'Day 2, 10:00', iso: '2026-10-13T10:00:00+08:00' },
  { label: 'Day after trip', iso: '2026-10-17T09:00:00+08:00' },
]

/** Whether changes are reaching the server, and if not why: the one place to look when something does not appear online. */
function SyncStatusSection() {
  const pending = usePendingChanges()
  const { syncing, lastError, lastSyncedAt } = useSyncState()
  const description = pending === 0 ? 'Everything is saved to your account.' : `${pending} ${pending === 1 ? 'change is' : 'changes are'} saved on this device and waiting to be sent.`
  return (
    <Section title="Sync" description={description}>
      <Badge>{syncing ? 'Syncing…' : lastError ? 'Not syncing' : lastSyncedAt ? `Last synced ${format(new Date(lastSyncedAt), 'HH:mm:ss')}` : 'Waiting for the first sync'}</Badge>
      {lastError && <p className="w-full break-words text-sm text-error">{lastError}</p>}
    </Section>
  )
}

/** One settings group: title and a line of context on top, its controls underneath. */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-prose text-fg-muted">{description}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
    </Card>
  )
}

/** A run of sections; the titled one keeps demo and developer switches apart from personal settings. */
function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-3">
      {title && <p aria-hidden className="px-1 text-sm font-semibold text-fg-muted">{title}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export default function SettingsRoute() {
  const session = useSession()
  const { preference, setPreference } = useTheme()
  const { simulatedNow, setSimulatedNow } = useClockStore()
  const { auth } = useServices()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const signingOut = useSignOut()
  const { installed, installEvent } = usePwa()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [aiDown, setAiDown] = useState(() => {
    try { return localStorage.getItem('mock-ai-unavailable') === '1' } catch { return false }
  })

  const toggleAi = () => {
    const next = !aiDown
    try { next ? localStorage.setItem('mock-ai-unavailable', '1') : localStorage.removeItem('mock-ai-unavailable') } catch { /* ignore */ }
    setAiDown(next)
  }

  const deleteAccount = async () => {
    const message = env.backend === 'firebase'
      ? 'Permanently delete your account and everything stored for it: your trips and their photos, pages you published, saves and settings, on our servers and on this device? People you shared a trip with lose access to it. This can’t be undone.'
      : 'Delete your account and everything on this device — trips, memories and settings? This can’t be undone.'
    if (!window.confirm(message)) return
    try {
      await auth.deleteAccount()
    } catch (e) {
      toast({ title: 'Account not deleted', description: e instanceof Error ? e.message : 'Please try again.' })
      return
    }
    await qc.invalidateQueries()
    navigate('/signin', { replace: true })
  }

  const downloadData = async () => {
    const { exportLocalAccountData } = await import('@/data/accountData')
    const file = new Blob([JSON.stringify(await exportLocalAccountData(), null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(file)
    link.download = `wayfarer-my-data-${format(new Date(), 'yyyy-MM-dd')}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  const reset = async () => {
    if (!window.confirm('Reset all demo data? Trips, memories and settings you created will be deleted.')) return
    await resetDemoData()
    await qc.invalidateQueries()
    toast({ title: 'Demo data reset' })
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />
      <div className="space-y-8">
        <Group>
          <Section title="Account" description={env.backend === 'firebase' ? `You’re signed in as ${session?.user.email ?? session?.user.name ?? 'a traveller'}.` : 'You’re signed in as the demo traveller.'}>
            <Button asChild variant="secondary"><Link to="/onboarding/you">Travel preferences</Link></Button>
            <Button variant="secondary" onClick={() => void downloadData()}>Download my data</Button>
            <Button variant="secondary" disabled={signingOut.busy} onClick={() => void signingOut.signOut()}>Sign out</Button>
            {signingOut.dialog}
            <div className="mt-2 flex w-full flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm text-fg-muted">Removes your trips, photos and settings for good.</p>
              <Button variant="danger" onClick={() => void deleteAccount()}>Delete account and data</Button>
            </div>
          </Section>

          <Section title="Appearance" description="Follows your device by default.">
            {themes.map((t) => <Chip key={t.value} selected={preference === t.value} onClick={() => setPreference(t.value)}>{t.label}</Chip>)}
          </Section>

          <Card id="notifications" className="scroll-mt-20 space-y-4 p-5 sm:p-6">
            <div><h2 className="text-lg font-semibold">Notifications</h2><p className="mt-1 max-w-prose text-fg-muted">Choose which reminders you get. They always appear in the app; system notifications need your permission.</p></div>
            <PushPermissionCard />
            <PushDeviceStatus />
            <NotificationSettings />
          </Card>

          <Section title="Install the app" description={installed ? 'Wayfarer is installed on this device.' : 'Add Wayfarer to your home screen or desktop. It opens full-screen and works offline.'}>
            {!installed && installEvent && <Button onClick={() => void promptInstall()}>Install Wayfarer</Button>}
            {!installed && !installEvent && <p className="max-w-prose text-sm text-fg-muted">Your browser didn’t offer an install button. In Chrome or Edge, use the install icon in the address bar. On iPhone or iPad, tap Share, then Add to Home Screen.</p>}
          </Section>

          {env.backend === 'firebase' && <SyncStatusSection />}

          <Section title="About" description="How Wayfarer handles your data, and the rules of use.">
            <Button asChild variant="secondary"><Link to="/privacy">Privacy notice</Link></Button>
            <Button asChild variant="secondary"><Link to="/terms">Terms of use</Link></Button>
            <Button asChild variant="secondary"><Link to="/credits">Photo credits</Link></Button>
            <Button variant="secondary" onClick={() => setFeedbackOpen(true)}>Send feedback</Button>
            <Badge>Version {APP_VERSION}</Badge>
            <FeedbackSheet open={feedbackOpen} onOpenChange={setFeedbackOpen} />
          </Section>
        </Group>

        <Group title="Demo and developer">
          <Section title="Demo date simulator" description={simulatedNow ? `Simulating ${wallClockLabel(simulatedNow)}.` : 'Preview Upcoming, Live and Completed states without waiting for real dates.'}>
            {presets.map((p) => <Chip key={p.iso} selected={simulatedNow === p.iso} onClick={() => setSimulatedNow(p.iso)}>{p.label}</Chip>)}
            <Button variant="secondary" disabled={!simulatedNow} onClick={() => setSimulatedNow(null)}>Use real time</Button>
          </Section>

          <Section title="Demo tools" description="Developer switches for trying error and offline states.">
            <Chip selected={aiDown} onClick={toggleAi}>Simulate AI unavailable</Chip>
            {env.backend === 'mock' && <Button variant="danger" onClick={() => void reset()}>Reset demo data</Button>}
          </Section>

          <Section title="Environment" description={env.isProduction ? 'Production build.' : 'Development build. Data here never touches production.'}>
            <Badge>{env.appEnv}</Badge>
            <Badge>{env.backend === 'firebase' ? `Backend: ${env.firebase?.projectId}` : 'Backend: demo (in this browser)'}</Badge>
          </Section>
        </Group>
      </div>
    </div>
  )
}
