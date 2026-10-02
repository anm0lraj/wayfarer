import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScreenStub } from '@/components/layout/ScreenStub'
import { Button } from '@/components/ui/Button'

// Phase 1 keeps a link to Settings (theme, demo tools) reachable; the full profile arrives in Phase 7.
export default function Profile() {
  return (
    <>
      <PageHeader title="Profile" actions={<Button asChild variant="secondary"><Link to="/settings"><Settings aria-hidden className="size-5" /> Settings</Link></Button>} />
      <ScreenStub title="Profile details" phase={7} spec="spec §26" />
    </>
  )
}
