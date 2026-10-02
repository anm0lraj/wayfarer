import type { Config } from 'tailwindcss'

const c = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '640px', lg: '1024px', xl: '1280px' }, // phone <640 · tablet 640–1023 · desktop ≥1024
    extend: {
      colors: {
        bg: c('bg'), surface: c('surface'), 'surface-2': c('surface-2'), border: c('border'),
        fg: c('fg'), 'fg-muted': c('fg-muted'),
        primary: { DEFAULT: c('primary'), fg: c('on-primary') },
        secondary: { DEFAULT: c('secondary'), fg: c('on-secondary') },
        success: { DEFAULT: c('success'), fg: c('on-success') },
        warning: { DEFAULT: c('warning'), fg: c('on-warning') },
        error: { DEFAULT: c('error'), fg: c('on-error') },
      },
      fontFamily: { sans: ['var(--font-sans)'] },
      fontSize: {
        xs: 'var(--text-xs)', sm: 'var(--text-sm)', base: 'var(--text-base)', lg: 'var(--text-lg)',
        xl: 'var(--text-xl)', '2xl': 'var(--text-2xl)', '3xl': 'var(--text-3xl)',
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)' },
      boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)' },
      spacing: { nav: 'var(--nav-h)', rail: 'var(--rail-w)', sidebar: 'var(--sidebar-w)', 'sidebar-c': 'var(--sidebar-w-collapsed)' },
      minHeight: { touch: 'var(--touch)' },
      minWidth: { touch: 'var(--touch)' },
    },
  },
  plugins: [],
} satisfies Config
