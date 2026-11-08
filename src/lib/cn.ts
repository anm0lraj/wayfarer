import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach the merger our token names (tailwind.config.ts), so `shadow-primary` is a shadow (not a shadow colour) and
// `font-display` a font family: a later `shadow-none` / `font-sans` then replaces them as expected.
const twMerge = extendTailwindMerge({
  extend: {
    theme: { shadow: ['sm', 'md', 'lg', 'primary', 'accent'], font: ['sans', 'display'] },
  },
})

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
