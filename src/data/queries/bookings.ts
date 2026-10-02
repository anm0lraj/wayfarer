import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingRepo, checklistRepo } from '../repositories'
import type { NewBookingInput } from '../repositories/bookingRepo'
import { useServices } from '@/services'
import type { FlightQuery, HotelQuery } from '@/services/bookings/types'
import type { Booking } from '@/types'

const checklistKey = (tripId: string) => ['trips', tripId, 'checklist'] as const

export const useHotels = (q: HotelQuery) => {
  const { bookings } = useServices()
  return useQuery({ queryKey: ['hotels', q], queryFn: ({ signal }) => bookings.searchHotels(q, signal), placeholderData: (prev) => prev })
}

export const useHotel = (id: string | undefined) => {
  const { bookings } = useServices()
  return useQuery({ queryKey: ['hotels', id], enabled: !!id, queryFn: async ({ signal }) => (await bookings.getHotel(id!, signal)) ?? null })
}

export const useFlights = (q: FlightQuery) => {
  const { bookings } = useServices()
  return useQuery({ queryKey: ['flights', q], queryFn: ({ signal }) => bookings.searchFlights(q, signal) })
}

/**
 * Saves a booking to the trip through the booking service. Only a demo result is stored, as "saved, not booked":
 * a live result would need a real provider adapter and its own confirmation flow, which doesn't exist yet.
 */
export function useSaveBooking() {
  const qc = useQueryClient()
  const { bookings } = useServices()
  return useMutation({
    mutationFn: async (input: Omit<NewBookingInput, 'provider'> & { refId: string }): Promise<Booking> => {
      const result = await bookings.createBooking({ tripId: input.tripId, type: input.type, refId: input.refId, title: input.title, price: input.price, startAt: input.startAt, endAt: input.endAt })
      if (result.mode !== 'demo') throw new Error('Live bookings aren’t supported yet')
      return bookingRepo.saveDemo({ ...input, provider: result.provider })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}

export function useRemoveBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bookingRepo.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}

export const useChecklist = (tripId: string | undefined) =>
  useQuery({ queryKey: checklistKey(tripId ?? ''), enabled: !!tripId, queryFn: () => checklistRepo.list(tripId!) })

/** Checklist writes: each refetches the list (small, local) rather than patching the cache. */
export function useChecklistActions(tripId: string) {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries({ queryKey: ['trips'] })
  return {
    toggle: useMutation({ mutationFn: (id: string) => checklistRepo.toggle(id), onSuccess: done }),
    add: useMutation({ mutationFn: (label: string) => checklistRepo.addCustom(tripId, label), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => checklistRepo.remove(id), onSuccess: done }),
  }
}
