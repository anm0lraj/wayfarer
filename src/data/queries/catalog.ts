import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogRepo, savedPlaceRepo } from '../repositories'

export const useDestinations = () => useQuery({ queryKey: ['destinations'], queryFn: () => catalogRepo.listDestinations() })

export const useDestination = (id: string | undefined) =>
  useQuery({ queryKey: ['destinations', id], enabled: !!id, queryFn: async () => (await catalogRepo.getDestination(id!)) ?? null })

export const usePlaces = (destinationId: string | undefined) =>
  useQuery({ queryKey: ['places', destinationId], enabled: !!destinationId, queryFn: () => catalogRepo.listPlaces(destinationId!) })

/** Every catalog place across a trip's destinations. */
export const useTripPlaces = (destinationIds: string[]) =>
  useQuery({
    queryKey: ['places-in', destinationIds.join(',')],
    enabled: destinationIds.length > 0,
    staleTime: Infinity,
    queryFn: async () => (await Promise.all(destinationIds.map((d) => catalogRepo.listPlaces(d)))).flat(),
  })

export function useSavedPlaceIds() {
  return useQuery({ queryKey: ['saved-places'], queryFn: async () => new Set((await savedPlaceRepo.list()).map((s) => s.placeId)) })
}

export function useToggleSavedPlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (placeId: string) => savedPlaceRepo.toggle(placeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-places'] }),
  })
}
