import type { GeoPoint } from '@/types'

export type WeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rain' | 'storm'

export interface DayForecast {
  date: string
  condition: WeatherCondition
  highC: number
  lowC: number
  rainChancePct: number
}

export interface CurrentWeather {
  condition: WeatherCondition
  tempC: number
}

export interface WeatherService {
  getForecast(point: GeoPoint, startDate: string, endDate: string, signal?: AbortSignal): Promise<DayForecast[]>
  getCurrent(point: GeoPoint, signal?: AbortSignal): Promise<CurrentWeather>
}
