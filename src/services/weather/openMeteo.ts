import { addDays, format } from 'date-fns'
import type { CurrentWeather, DayForecast, WeatherCondition, WeatherService } from './types'

/**
 * Real forecasts from Open-Meteo (https://open-meteo.com): no key, no account, called straight from the browser.
 * Free for non-commercial use; a commercial launch needs their paid plan (or the data from another provider, which is
 * a one-file swap behind `WeatherService`).
 */
const BASE = 'https://api.open-meteo.com/v1/forecast'

/** How far ahead the free forecast reaches, in days from today. */
export const FORECAST_DAYS = 16

/** WMO weather codes → the handful of conditions the app draws. */
export function conditionFor(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'sunny'
  if (code === 2) return 'partly_cloudy'
  if (code === 3 || code === 45 || code === 48) return 'cloudy'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  if (code >= 51 && code <= 99) return 'rain' // drizzle, rain, freezing rain, showers
  return 'cloudy'
}

interface DailyResponse {
  daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: Array<number | null> }
}
interface CurrentResponse { current?: { temperature_2m: number; weather_code: number } }

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Weather unavailable (${res.status})`)
  return (await res.json()) as T
}

/** The part of [start, end] the forecast can answer: from today to FORECAST_DAYS ahead. Empty if there is none. */
export function reachableRange(start: string, end: string, today = new Date()): { start: string; end: string } | undefined {
  const first = format(today, 'yyyy-MM-dd')
  const last = format(addDays(today, FORECAST_DAYS - 1), 'yyyy-MM-dd')
  const s = start < first ? first : start
  const e = end > last ? last : end
  return s <= e ? { start: s, end: e } : undefined
}

export const openMeteoWeather: WeatherService = {
  async getForecast(p, startDate, endDate, signal) {
    // Beyond the reach of a forecast there is simply nothing to show yet; screens treat that as "check back closer to the trip".
    const range = reachableRange(startDate, endDate)
    if (!range) return []
    const q = new URLSearchParams({
      latitude: String(p.lat), longitude: String(p.lng), timezone: 'auto', start_date: range.start, end_date: range.end,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    })
    const { daily } = await getJson<DailyResponse>(`${BASE}?${q}`, signal)
    if (!daily) return []
    return daily.time.map((date, i): DayForecast => ({
      date,
      condition: conditionFor(daily.weather_code[i] ?? 3),
      highC: Math.round(daily.temperature_2m_max[i] ?? 0),
      lowC: Math.round(daily.temperature_2m_min[i] ?? 0),
      rainChancePct: Math.round(daily.precipitation_probability_max[i] ?? 0),
    }))
  },

  async getCurrent(p, signal) {
    const q = new URLSearchParams({ latitude: String(p.lat), longitude: String(p.lng), timezone: 'auto', current: 'temperature_2m,weather_code' })
    const { current } = await getJson<CurrentResponse>(`${BASE}?${q}`, signal)
    if (!current) throw new Error('Weather unavailable')
    return { condition: conditionFor(current.weather_code), tempC: Math.round(current.temperature_2m) } satisfies CurrentWeather
  },
}
