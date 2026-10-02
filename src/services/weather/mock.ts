import { api } from '@/lib/api'
import type { CurrentWeather, DayForecast, WeatherService } from './types'

export const weatherService: WeatherService = {
  getForecast: (p, startDate, endDate, signal) =>
    api<DayForecast[]>(`/api/weather/forecast?lat=${p.lat}&lng=${p.lng}&start=${startDate}&end=${endDate}`, { signal }),
  getCurrent: (p, signal) => api<CurrentWeather>(`/api/weather/current?lat=${p.lat}&lng=${p.lng}`, { signal }),
}
