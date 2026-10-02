import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { resetDemoData } from '@/data/seed'
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

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-fg-muted">{description}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
    </Card>
  )
}

export default function SettingsRoute() {
  const { preference, setPreference } = useTheme()
  const { simulatedNow, setSimulatedNow } = useClockStore()
  const { auth } = useServices()
  const qc = useQueryClient()
  const [aiDown, setAiDown] = useState(() => {
    try { return localStorage.getItem('mock-ai-unavailable') === '1' } catch { return false }
  })

  const toggleAi = () => {
    const next = !aiDown
    try { next ? localStorage.setItem('mock-ai-unavailable', '1') : localStorage.removeItem('mock-ai-unavailable') } catch { /* ignore */ }
    setAiDown(next)
  }

  const reset = async () => {
    if (!window.confirm('Reset all demo data? Trips, memories and settings you created will be deleted.')) return
    await resetDemoData()
    await qc.invalidateQueries()
    toast({ title: 'Demo data reset' })
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Appearance" description="Follows your device by default.">
          {themes.map((t) => <Chip key={t.value} selected={preference === t.value} onClick={() => setPreference(t.value)}>{t.label}</Chip>)}
        </Section>

        <Section title="Demo date simulator" description={simulatedNow ? `Simulating ${format(new Date(simulatedNow), 'd MMM yyyy, HH:mm')}.` : 'Preview Upcoming, Live and Completed states without waiting for real dates.'}>
          {presets.map((p) => <Chip key={p.iso} selected={simulatedNow === p.iso} onClick={() => setSimulatedNow(p.iso)}>{p.label}</Chip>)}
          <Button variant="secondary" disabled={!simulatedNow} onClick={() => setSimulatedNow(null)}>Use real time</Button>
        </Section>

        <Section title="Demo tools" description="Developer switches for trying error and offline states.">
          <Chip selected={aiDown} onClick={toggleAi}>Simulate AI unavailable</Chip>
          <Button variant="danger" onClick={() => void reset()}>Reset demo data</Button>
        </Section>

        <Section title="Account" description="You’re signed in as the demo traveller.">
          <Button variant="secondary" onClick={() => void auth.signOut()}>Sign out</Button>
        </Section>
      </div>
    </>
  )
}
