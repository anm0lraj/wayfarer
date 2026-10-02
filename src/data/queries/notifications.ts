import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getActorId } from '../actor'
import { db } from '../db'
import { notificationRepo, userRepo } from '../repositories'
import type { NotificationType } from '@/types'

const key = ['notifications'] as const

export const useNotifications = () => useQuery({ queryKey: key, queryFn: () => notificationRepo.list() })

export function useUnreadCount(): number {
  return useNotifications().data?.filter((n) => !n.readAt).length ?? 0
}

export function useNotificationActions() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: key })
  return {
    markRead: useMutation({ mutationFn: (id: string) => notificationRepo.markRead(id), onSuccess: refresh }),
    markAllRead: useMutation({ mutationFn: () => notificationRepo.markAllRead(), onSuccess: refresh }),
    refresh,
  }
}

/** Per-type switches, stored on the user's settings. Missing entries count as on. */
export function useNotificationPrefs() {
  const qc = useQueryClient()
  const prefs = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: async () => {
      const id = getActorId()
      return (id ? (await db.users.get(id))?.settings.notificationPrefs : undefined) ?? {}
    },
  })
  const set = useMutation({
    mutationFn: async ({ type, on }: { type: NotificationType; on: boolean }) => {
      const id = getActorId()
      const user = id ? await db.users.get(id) : undefined
      if (!id || !user) throw new Error('Not signed in')
      await userRepo.update(id, { settings: { ...user.settings, notificationPrefs: { ...user.settings.notificationPrefs, [type]: on } } })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  })
  return { prefs: prefs.data ?? {}, isPending: prefs.isPending, set }
}
