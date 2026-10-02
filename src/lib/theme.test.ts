import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, useTheme } from './theme'

function mockSystemDark(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: dark && q.includes('dark'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('theme', () => {
  it('"system" follows the device setting', () => {
    mockSystemDark(true)
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBe('dark')
    mockSystemDark(false)
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('an explicit choice overrides the device and is remembered', () => {
    mockSystemDark(true)
    useTheme.getState().setPreference('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
    useTheme.getState().setPreference('system')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
