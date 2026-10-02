import { Cloud, CloudLightning, CloudRain, CloudSun, Sun, type LucideIcon } from 'lucide-react'
import type { WeatherCondition } from '@/services/weather/types'

const icons: Record<WeatherCondition, LucideIcon> = { sunny: Sun, partly_cloudy: CloudSun, cloudy: Cloud, rain: CloudRain, storm: CloudLightning }
const words: Record<WeatherCondition, string> = { sunny: 'Sunny', partly_cloudy: 'Partly cloudy', cloudy: 'Cloudy', rain: 'Rain', storm: 'Thunderstorms' }

export function WeatherChip({ condition, tempC, className }: { condition: WeatherCondition; tempC: number; className?: string }) {
  const Icon = icons[condition]
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`} title={words[condition]}>
      <Icon aria-hidden className="size-4" />
      <span>{tempC}°C</span>
      <span className="sr-only">{words[condition]}</span>
    </span>
  )
}
