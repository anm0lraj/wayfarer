import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { create } from 'zustand'
import { db } from '@/data/db'

export const useSyncState = create<{ syncing: boolean; lastFailed: boolean }>(() => ({ syncing: false, lastFailed: false }))

/** How many local changes are waiting to be sent, updating live as the queue changes. */
export function usePendingChanges(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const sub = liveQuery(() => db.syncQueue.count()).subscribe({ next: setCount, error: () => setCount(0) })
    return () => sub.unsubscribe()
  }, [])
  return count
}
