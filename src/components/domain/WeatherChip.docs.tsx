import { WeatherChip } from './WeatherChip'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

export default defineDoc({
  id: 'weather-chip',
  title: 'WeatherChip',
  group: 'data',
  source: 'src/components/domain/WeatherChip.tsx',
  summary: 'A compact forecast: condition icon and temperature in °C. It inherits the text colour around it (trip header, live dashboard).',
  parts: [
    part('WeatherChip', WeatherChip, {
      props: {
        condition: { type: "'sunny' | 'partly_cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow'", required: true, description: 'Mapped from the provider’s codes (Open-Meteo WMO codes).' },
        tempC: { type: 'number', required: true, description: 'Temperature in °C, rounded.' },
        className: { type: 'string', required: false, description: 'Extra classes (text size and colour).' },
      },
    }),
  ],
  examples: [
    {
      id: 'weather-conditions',
      title: 'Conditions',
      render: () => (
        <>
          <Cell label="sunny"><WeatherChip condition="sunny" tempC={31} /></Cell>
          <Cell label="partly_cloudy"><WeatherChip condition="partly_cloudy" tempC={29} /></Cell>
          <Cell label="cloudy"><WeatherChip condition="cloudy" tempC={26} /></Cell>
          <Cell label="rain"><WeatherChip condition="rain" tempC={24} /></Cell>
          <Cell label="storm"><WeatherChip condition="storm" tempC={23} /></Cell>
          <Cell label="snow"><WeatherChip condition="snow" tempC={-2} /></Cell>
          <Cell label="muted, small"><WeatherChip condition="sunny" tempC={31} className="text-sm text-fg-muted" /></Cell>
        </>
      ),
    },
  ],
  a11y: {
    aria: ['Icon aria-hidden; condition as sr-only text and title tooltip'],
    announces: '“31°C Sunny”.',
  },
  guidance: { do: ['Show nothing (not an error) when the trip is beyond the 16-day forecast.'], dont: ['Don’t colour-code temperatures.'] },
})
