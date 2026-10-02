import { useState } from 'react'

const COLLAPSE_KEY = 'sidebar-collapsed'

/** Desktop sidebar collapsed state, remembered across visits. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1') } catch { /* ignore */ }
      return !c
    })
  }
  return [collapsed, toggle] as const
}
