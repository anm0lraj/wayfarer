import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/services'
import type { GeoPoint } from '@/types'

export function useForecast(point: GeoPoint | undefined, startDate: string, endDate: string) {
  const { weather } = useServices()
  return useQuery({
    queryKey: ['forecast', point?.lat, point?.lng, startDate, endDate],
    enabled: !!point,
    staleTime: 10 * 60_000,
    queryFn: ({ signal }) => weather.getForecast(point!, startDate, endDate, signal),
  })
}
