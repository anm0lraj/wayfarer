import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const c = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // `hover:` applies only where hovering is real (mouse/trackpad), so a tap on a phone never leaves a control "hovered".
  future: { hoverOnlyWhenSupported: true },
  theme: {
    screens: { sm: '640px', lg: '1024px', xl: '1280px' }, // phone <640 · tablet 640–1023 · desktop ≥1024
    extend: {
      colors: {
        bg: c('bg'), surface: c('surface'), 'surface-2': c('surface-2'), border: c('border'), 'border-strong': c('border-strong'),
        fg: c('fg'), 'fg-muted': c('fg-muted'),
        primary: { DEFAULT: c('primary'), fg: c('on-primary') },
        secondary: { DEFAULT: c('secondary'), fg: c('on-secondary') },
        accent: { DEFAULT: c('accent'), fg: c('on-accent') },
        success: { DEFAULT: c('success'), fg: c('on-success') },
        warning: { DEFAULT: c('warning'), fg: c('on-warning') },
        error: { DEFAULT: c('error'), fg: c('on-error') },
      },
      fontFamily: { sans: ['var(--font-sans)'], display: ['var(--font-display)'] },
      fontSize: {
        xs: 'var(--text-xs)', sm: 'var(--text-sm)', base: 'var(--text-base)', lg: 'var(--text-lg)',
        xl: 'var(--text-xl)', '2xl': 'var(--text-2xl)', '3xl': 'var(--text-3xl)', '4xl': 'var(--text-4xl)',
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', '2xl': 'var(--radius-xl)' },
      boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)', primary: 'var(--shadow-primary)', accent: 'var(--shadow-accent)' },
      transitionTimingFunction: { out: 'var(--ease-out)' },
      transitionDuration: { fast: 'var(--dur-fast)', base: 'var(--dur-base)' },
      spacing: { nav: 'var(--nav-h)', rail: 'var(--rail-w)', sidebar: 'var(--sidebar-w)', 'sidebar-c': 'var(--sidebar-w-collapsed)' },
      minHeight: { touch: 'var(--touch)' },
      minWidth: { touch: 'var(--touch)' },
    },
  },
  plugins: [
    // `lift`: the hover lift for cards and tiles. Only with a real pointer; with reduced motion the shadow still
    // deepens but the card doesn't move.
    plugin(({ addComponents }) => {
      addComponents({
        '.lift': { transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)' },
        '@media (hover: hover) and (pointer: fine)': { '.lift:hover': { boxShadow: 'var(--shadow-lg)' } },
        '@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)': { '.lift:hover': { transform: 'translateY(-3px)' } },
      })
    }),
  ],
} satisfies Config
