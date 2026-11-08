import { useState } from 'react'
import { BottomNav, NavRail, Sidebar } from './Navigation'
import { defineDoc, part } from '@/features/design-system/doc'

function SidebarDemo() {
  const [collapsed, setCollapsed] = useState(false)
  return <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
}

export default defineDoc({
  id: 'navigation',
  title: 'App navigation',
  group: 'navigation',
  source: 'src/app/nav/Navigation.tsx',
  summary: 'Three navigations for three layout classes, only one visible at a time: a bottom bar on phones (< 640 px), a rail on tablets (640–1023 px) and a collapsible sidebar on desktop (≥ 1024 px). Home, Trips, Explore, AI and Profile; Live comes first, in orange, while a trip is active. Each preview below is a real viewport, so only the navigation for that width shows; none is “current” because the frame’s URL is the library’s.',
  parts: [
    part('BottomNav', BottomNav, { props: {} }),
    part('NavRail', NavRail, { props: {} }),
    part('Sidebar', Sidebar, {
      props: {
        collapsed: { type: 'boolean', required: true, description: 'Icons only (labels kept for screen readers and as tooltips).' },
        onToggle: { type: '() => void', required: true, description: 'Collapse / expand; the app keeps the choice in useSidebarCollapsed.' },
      },
    }),
  ],
  examples: [
    { id: 'nav-phone', title: 'Phone: bottom bar', frame: { width: 390, height: 180 }, render: () => <BottomNav /> },
    { id: 'nav-tablet', title: 'Tablet: rail', frame: { width: 820, height: 520 }, render: () => <NavRail /> },
    { id: 'nav-desktop', title: 'Desktop: sidebar', description: 'Use Collapse at the bottom to try the icon-only state.', frame: { width: 1440, height: 560 }, render: () => <SidebarDemo /> },
  ],
  a11y: {
    keyboard: [['Tab', 'Link to link'], ['Enter', 'Navigate']],
    aria: ['<nav aria-label="Primary">', 'aria-current="page" on the current item (NavLink)', 'Collapse button: aria-expanded and aria-label “Collapse sidebar” / “Expand sidebar”', 'Icons aria-hidden; collapsed labels sr-only'],
    announces: '“Trips, link, current page”. After navigation the page title is announced and focus moves to #main.',
    pointer: 'Every item ≥ 44 px; the phone bar sits above the home indicator (safe-area padding).',
    motion: 'Only colour changes; the live dot pulses with motion allowed.',
  },
  guidance: {
    do: ['Keep five primary destinations (+ Live).', 'Current = blue pill (phone/tablet) or solid blue row (desktop); Live = light orange pill with deep-orange text.'],
    dont: ['Don’t add a sixth permanent item.', 'Don’t show two navigations at once.'],
  },
})
