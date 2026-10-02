import { Monitor, Moon, Sun } from 'lucide-react'
import { announce } from '@/lib/a11y/announce'
import { useTheme, type ThemePreference } from '@/lib/theme'

const order: ThemePreference[] = ['system', 'light', 'dark']
const labels: Record<ThemePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const icons = { system: Monitor, light: Sun, dark: Moon }

/**
 * Cycles System → Light → Dark. "System" (the default) follows the device setting, including live changes.
 * Settings has the same choice laid out as three explicit options.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const next = order[(order.indexOf(preference) + 1) % order.length]!
  const Icon = icons[preference]
  return (
    <button
      type="button"
      onClick={() => {
        setPreference(next)
        announce(`Theme: ${labels[next]}`)
      }}
      title={`Theme: ${labels[preference]} — click for ${labels[next]}`}
      aria-label={`Theme: ${labels[preference]}. Switch to ${labels[next]}`}
      className={className ?? 'grid min-h-touch min-w-touch place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg'}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  )
}
