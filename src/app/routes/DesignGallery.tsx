import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { EmptyState, ErrorState, OfflineState } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge, Chip } from '@/components/ui/Chip'
import { ImageCard } from '@/components/ui/ImageCard'
import { Input, SearchField } from '@/components/ui/Input'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { placeholderImage } from '@/lib/placeholder'

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** Dev-only component gallery at /_design for checking every primitive in light/dark at 390/820/1440. */
export default function DesignGallery() {
  const [sheet, setSheet] = useState<false | 'panel' | 'dialog'>(false)
  const [chip, setChip] = useState(true)
  return (
    <div className="space-y-10">
      <PageHeader title="Design system" description="Dev-only gallery. Not part of the product." />
      <Block title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button><Button disabled>Disabled</Button>
        </div>
      </Block>
      <Block title="Chips & badges">
        <div className="flex flex-wrap gap-2">
          <Chip selected={chip} onClick={() => setChip(!chip)}>Food</Chip><Chip>Beaches</Chip>
          <Badge>Draft</Badge><Badge tone="primary">Planning</Badge><Badge tone="success">Ready</Badge><Badge tone="warning">Live now</Badge><Badge tone="error">Failed</Badge>
        </div>
      </Block>
      <Block title="Inputs">
        <div className="grid max-w-xl gap-4">
          <SearchField placeholder="Where do you want to go?" />
          <Input label="Trip name" hint="You can change this later." defaultValue="5 Days in Bali" />
          <Input label="Budget" error="Enter an amount in rupees." defaultValue="abc" />
        </div>
      </Block>
      <Block title="Tabs">
        <Tabs defaultValue="a">
          <TabsList aria-label="Demo"><TabsTrigger value="a">Overview</TabsTrigger><TabsTrigger value="b">Itinerary</TabsTrigger></TabsList>
          <TabsContent value="a" className="py-4">Overview content</TabsContent>
          <TabsContent value="b" className="py-4">Itinerary content</TabsContent>
        </Tabs>
      </Block>
      <Block title="Cards & images">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ImageCard src={placeholderImage('demo-1')} alt="" title="Uluwatu Temple" subtitle="Day 2 · 10:00" badge={<Badge className="bg-surface text-fg">Culture</Badge>} />
          <Card className="p-5"><h3 className="font-semibold">Plain card</h3><p className="text-fg-muted">Use sparingly.</p></Card>
        </div>
      </Block>
      <Block title="Sheets & toasts">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setSheet('panel')}>Open sheet</Button>
          <Button variant="secondary" onClick={() => setSheet('dialog')}>Open dialog</Button>
          <Button variant="secondary" onClick={() => toast({ title: 'Activity deleted', action: { label: 'Undo', onClick: () => toast({ title: 'Restored' }) } })}>Toast with undo</Button>
        </div>
        <ResponsiveSheet open={!!sheet} onOpenChange={(o) => !o && setSheet(false)} title="Add activity" description="Bottom sheet on phone, side panel or dialog on larger screens." wide={sheet === 'dialog' ? 'dialog' : 'panel'}>
          <div className="space-y-4"><Input label="Title" /><Button onClick={() => setSheet(false)}>Save</Button></div>
        </ResponsiveSheet>
      </Block>
      <Block title="Loading">
        <SkeletonGroup className="grid max-w-xl gap-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-24 w-full" /></SkeletonGroup>
      </Block>
      <Block title="States">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card><EmptyState title="No memories yet" description="Add a photo during your trip." /></Card>
          <Card><ErrorState onRetry={() => toast({ title: 'Retrying…' })} /></Card>
          <Card><OfflineState /></Card>
        </div>
      </Block>
    </div>
  )
}
