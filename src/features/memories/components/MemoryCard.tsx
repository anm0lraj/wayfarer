import { AlertCircle, Clock, MoreVertical, RefreshCw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Menu, MenuItem } from '@/components/ui/Menu'
import type { Memory } from '@/types'
import { MemoryMedia } from './MemoryMedia'
import { timeLabel } from './timeLabel'

interface Props {
  memory: Memory
  timeZone: string
  /** Title of the activity it was attached to. */
  activity?: string
  canEdit: boolean
  onDelete: (m: Memory) => void
  onRetry: () => void
}

function UploadBadge({ state, onRetry }: { state: Memory['uploadState']; onRetry: () => void }) {
  if (state === 'done') return null
  if (state === 'failed') {
    return (
      <span className="flex items-center gap-2">
        <Badge tone="error"><AlertCircle aria-hidden className="size-3.5" /> Upload failed</Badge>
        <Button size="sm" variant="ghost" onClick={onRetry}><RefreshCw aria-hidden className="size-4" /> Retry</Button>
      </span>
    )
  }
  return <Badge tone="warning"><Clock aria-hidden className="size-3.5" />{state === 'uploading' ? 'Uploading…' : 'Waiting to upload'}</Badge>
}

/** One memory in the timeline: its media, caption, when and where, and upload status. */
export function MemoryCard({ memory, timeZone, activity, canEdit, onDelete, onRetry }: Props) {
  return (
    <article className="mb-4 break-inside-avoid overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <MemoryMedia memory={memory} />
      <div className="space-y-1.5 p-3">
        {memory.caption && memory.kind !== 'text' && <p className="font-medium">{memory.caption}</p>}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-fg-muted">
            {timeLabel(memory.capturedAt, timeZone)}{activity ? ` · ${activity}` : ''}
          </p>
          {canEdit && (
            <Menu trigger={<Button variant="ghost" size="icon" className="-mr-2 -mt-2" aria-label={`Options for ${memory.caption ?? 'memory'}`}><MoreVertical aria-hidden className="size-5" /></Button>}>
              <MenuItem danger icon={<Trash2 className="size-4" />} onSelect={() => onDelete(memory)}>Delete</MenuItem>
            </Menu>
          )}
        </div>
        <UploadBadge state={memory.uploadState} onRetry={onRetry} />
      </div>
    </article>
  )
}
