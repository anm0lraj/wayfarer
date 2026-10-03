import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memoryRepo, storyRepo } from '../repositories'
import { processMemoryUploads } from '../uploadQueue'
import { toast } from '@/components/feedback/toast'
import { useServices } from '@/services'
import type { Memory, Story } from '@/types'

const memKey = (tripId: string) => ['memories', tripId] as const
const storyKey = (tripId: string) => ['stories', tripId] as const

export const useMemories = (tripId: string | undefined) =>
  useQuery({ queryKey: memKey(tripId ?? ''), enabled: !!tripId, queryFn: () => memoryRepo.list(tripId!) })

export const useStories = (tripId: string | undefined) =>
  useQuery({ queryKey: storyKey(tripId ?? ''), enabled: !!tripId, queryFn: () => storyRepo.list(tripId!) })

export const useStory = (id: string | undefined) =>
  useQuery({ queryKey: ['story', id], enabled: !!id, queryFn: async () => (await storyRepo.get(id!)) ?? null })

/** Everything that changes after a memory or story write. */
export function useMemoryRefresh() {
  const qc = useQueryClient()
  return (tripId: string) => Promise.all([
    qc.invalidateQueries({ queryKey: memKey(tripId) }), qc.invalidateQueries({ queryKey: ['memories', 'recent'] }),
    qc.invalidateQueries({ queryKey: storyKey(tripId) }), qc.invalidateQueries({ queryKey: ['story'] }),
  ])
}

/** A little longer than the toast's own 6 s, so a late tap on Undo still finds the photo. */
export const UNDO_WINDOW_MS = 8000

export function useMemoryActions(tripId: string) {
  const refresh = useMemoryRefresh()
  const { storage } = useServices()
  return {
    remove: async (m: Memory) => {
      await memoryRepo.remove(m.id)
      await refresh(tripId)
      // The stored photo has to survive the Undo, so it is only deleted once that window has closed.
      const cleanup = m.mediaKey ? setTimeout(() => void storage.remove(m.mediaKey!).catch(() => undefined), UNDO_WINDOW_MS) : undefined
      toast({
        title: 'Memory deleted',
        action: { label: 'Undo', onClick: () => { clearTimeout(cleanup); void memoryRepo.restore(m).then(() => refresh(tripId)) } },
      })
    },
    retry: async () => {
      await processMemoryUploads(storage, { retryFailed: true })
      await refresh(tripId)
    },
  }
}

export function useSaveStory(tripId: string) {
  const refresh = useMemoryRefresh()
  return useMutation({
    mutationFn: (input: Parameters<typeof storyRepo.save>[0]): Promise<Story> => storyRepo.save(input),
    onSuccess: () => refresh(tripId),
  })
}

export function useDeleteStory(tripId: string) {
  const refresh = useMemoryRefresh()
  return useMutation({
    mutationFn: (id: string) => storyRepo.remove(id),
    onSuccess: async (removed) => {
      await refresh(tripId)
      if (removed) toast({ title: 'Story deleted', action: { label: 'Undo', onClick: () => void storyRepo.save(removed).then(() => refresh(tripId)) } })
    },
  })
}
