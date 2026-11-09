import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach the merger our token names (tailwind.config.ts), so `shadow-primary` is a shadow (not a shadow colour) and
// `font-display` a font family: a later `shadow-none` / `font-sans` then replaces them as expected. `min-h-touch` /
// `min-w-touch` are sizes, so an override such as `min-h-14` on a Button replaces the 44 px minimum instead of fighting it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: { shadow: ['sm', 'md', 'lg', 'primary', 'accent'], font: ['sans', 'display'] },
    classGroups: { 'min-h': [{ 'min-h': ['touch'] }], 'min-w': [{ 'min-w': ['touch'] }] },
  },
})

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
