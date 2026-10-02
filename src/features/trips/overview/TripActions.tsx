import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import type { TripWithState } from '@/data/queries/trips'
import { tripRepo } from '@/data/repositories'
import { coverFromFile } from '@/lib/media/image'
import { placeholderImage } from '@/lib/placeholder'

/** Cover photo, archive / restore and delete. Deleting is permanent, so it needs an explicit confirmation. */
export function TripActions({ trip }: { trip: TripWithState }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const archived = trip.effectiveState === 'archived'

  const run = async (fn: () => Promise<void>, failure: string) => {
    setBusy(true)
    try { await fn() } catch (e) { toast({ title: failure, description: e instanceof Error ? e.message : undefined }) } finally { setBusy(false) }
  }

  const toggleArchive = () => run(async () => {
    await tripRepo.transition(trip.id, archived ? 'planning' : 'archived')
    await qc.invalidateQueries()
    toast(archived ? { title: 'Trip restored' } : {
      title: 'Trip archived', action: { label: 'Undo', onClick: () => void tripRepo.transition(trip.id, 'planning').then(() => qc.invalidateQueries()) },
    })
    if (!archived) navigate('/trips')
  }, archived ? 'Couldn’t restore the trip' : 'Couldn’t archive the trip')

  const remove = () => run(async () => {
    await tripRepo.remove(trip.id)
    await qc.invalidateQueries()
    setConfirming(false)
    toast({ title: 'Trip deleted', description: trip.title })
    navigate('/trips', { replace: true })
  }, 'Couldn’t delete the trip')

  const hasOwnCover = !!trip.coverImage?.startsWith('data:image/jpeg') || !!trip.coverImage?.startsWith('data:image/png') || !!trip.coverImage?.startsWith('data:image/webp')
  const setCover = (file: File | undefined) => {
    if (!file) return
    void run(async () => {
      await tripRepo.update(trip.id, { coverImage: await coverFromFile(file) })
      await qc.invalidateQueries()
      toast({ title: 'Cover photo updated' })
    }, 'Couldn’t use that photo')
  }
  const resetCover = () => run(async () => {
    await tripRepo.update(trip.id, { coverImage: placeholderImage(trip.destinationIds[0] ?? trip.id, '', [16, 9]) })
    await qc.invalidateQueries()
    toast({ title: 'Using the illustration again' })
  }, 'Couldn’t change the cover')

  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Choose a cover photo" onChange={(e) => { setCover(e.target.files?.[0]); e.target.value = '' }} />
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>{hasOwnCover ? 'Change cover photo' : 'Add cover photo'}</Button>
      {hasOwnCover && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void resetCover()}>Use illustration</Button>}
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => void toggleArchive()}>{archived ? 'Restore trip' : 'Archive trip'}</Button>
      <Button variant="ghost" size="sm" className="text-error" disabled={busy} onClick={() => setConfirming(true)}>Delete trip</Button>
      <ResponsiveSheet open={confirming} onOpenChange={setConfirming} title="Delete this trip?" description={`“${trip.title}” and its itinerary, bookings and memories will be permanently deleted.`} wide="dialog">
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirming(false)}>Keep trip</Button>
          <Button variant="danger" disabled={busy} onClick={() => void remove()}>{busy ? 'Deleting…' : 'Delete permanently'}</Button>
        </div>
      </ResponsiveSheet>
    </div>
  )
}
