import { Link } from 'react-router-dom'
import { Block, Code, Rules, Table } from '../ui'

export function LayoutPage() {
  return (
    <div className="space-y-12">
      <Block title="Breakpoints and layout classes" id="layout-classes">
        <p className="text-fg-muted">Three layouts, each designed on purpose rather than stretched. Tailwind screens: <Code>sm</Code> 640, <Code>lg</Code> 1024, <Code>xl</Code> 1280 (there is no <Code>md</Code>). In code, prefer CSS; use <Code>useLayoutClass()</Code> only when behaviour differs (sheet vs panel).</p>
        <Table caption="Layout classes" head={['Class', 'Width', 'Navigation', 'Pattern']} rows={[
          ['Phone', '< 640 px', 'Bottom bar (5 + Live)', 'One column, bottom sheets, full-screen flows, horizontally scrolling card rows, itinerary and map as separate tabs'],
          ['Tablet', '640–1023 px', 'Rail on the left, icons with labels', 'Two panes where useful; side panels; card grids of 2; itinerary + map side by side in landscape, a collapsible map strip in portrait'],
          ['Desktop', '≥ 1024 px', 'Collapsible sidebar', 'Multi-column; itinerary and map side by side; AI as a docked, resizable panel; filters as a sidebar; dialogs centred'],
        ]} />
        <p><Link to="/_design/components/navigation" className="font-semibold text-primary hover:underline">See the three navigations in real viewports →</Link></p>
      </Block>
      <Block title="Overlays by layout" id="layout-overlays">
        <Table caption="Overlay placement" head={['Overlay', 'Phone', 'Tablet', 'Desktop']} rows={[
          ['ResponsiveSheet (default)', 'Bottom sheet', 'Right side panel', 'Right side panel'],
          ['ResponsiveSheet wide="dialog"', 'Bottom sheet (or full screen)', 'Centred dialog', 'Centred dialog'],
          ['Filters', 'Sheet', 'Sheet', 'Sidebar'],
          ['AI assistant', 'Full screen', 'Full screen', 'Docked panel'],
          ['Toasts', 'Above the bottom bar', 'Bottom centre', 'Bottom right'],
        ]} />
      </Block>
      <Block title="Rules" id="layout-rules">
        <Rules items={[
          'Every screen has a real URL; tabs and open sheets that matter are in the URL so back/forward work.',
          <>Respect safe areas in the installed app: <Code>pb-safe</Code>, <Code>pt-safe</Code>, and the bottom bar’s padding.</>,
          'No horizontal page scroll at 390 px; long rows scroll inside themselves with a fade.',
          'Support portrait and landscape, and 200 % zoom without loss of content.',
          'Touch targets ≥ 44 × 44 px, 8 px apart.',
        ]} />
      </Block>
    </div>
  )
}
