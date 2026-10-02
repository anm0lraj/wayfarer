import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/services'

/** Resolves a storage key to a displayable URL (object URL or generated placeholder). */
export function useMediaUrl(key: string | undefined): string | undefined {
  const { storage } = useServices()
  return useQuery({ queryKey: ['media', key], enabled: !!key, staleTime: Infinity, queryFn: async () => (await storage.getUrl(key!)) ?? null }).data ?? undefined
}
