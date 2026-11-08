import type { ComponentPropsWithoutRef } from 'react'
import type * as RadixTabs from '@radix-ui/react-tabs'
import type { NavLinkProps } from 'react-router-dom'
import { TabLink, TabNav, Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'

const tabs = defineDoc({
  id: 'tabs',
  title: 'Tabs',
  group: 'selection',
  source: 'src/components/ui/Tabs.tsx',
  summary: 'In-page tabs that switch panels without changing the URL (e.g. Add activity: Places / Custom). When a tab is a place someone could link to, use TabNav instead.',
  parts: [
    part<typeof Tabs, ComponentPropsWithoutRef<typeof RadixTabs.Root>>('Tabs', Tabs, { inherits: 'Radix Tabs.Root: value / defaultValue, onValueChange, orientation, activationMode.', props: {} }),
    part<typeof TabsList, ComponentPropsWithoutRef<typeof RadixTabs.List>>('TabsList', TabsList, { inherits: 'Radix Tabs.List. Give it an aria-label.', props: {} }),
    part<typeof TabsTrigger, ComponentPropsWithoutRef<typeof RadixTabs.Trigger>>('TabsTrigger', TabsTrigger, { inherits: 'Radix Tabs.Trigger: value (required), disabled.', props: {} }),
    part<typeof TabsContent, ComponentPropsWithoutRef<typeof RadixTabs.Content>>('TabsContent', TabsContent, { inherits: 'Radix Tabs.Content: value (required), forceMount.', props: {} }),
  ],
  examples: [
    {
      id: 'tabs-basic',
      title: 'Add activity tabs',
      render: () => (
        <Cell label="interactive" wide>
          <Tabs defaultValue="places" className="max-w-md">
            <TabsList aria-label="Add activity from">
              <TabsTrigger value="places">Places</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
              <TabsTrigger value="ai" disabled>Ask AI</TabsTrigger>
            </TabsList>
            <TabsContent value="places" className="py-4 text-fg-muted">Search the catalogue of places near your stay.</TabsContent>
            <TabsContent value="custom" className="py-4 text-fg-muted">Add anything: a name, a time and a pin.</TabsContent>
          </Tabs>
        </Cell>
      ),
    },
    {
      id: 'tabs-states',
      title: 'Trigger states',
      render: () => (
        <>
          <Cell label="active"><Tabs value="a"><TabsList aria-label="Active tab"><TabsTrigger value="a">Overview</TabsTrigger></TabsList></Tabs></Cell>
          <Cell label="default"><Tabs value="x"><TabsList aria-label="Inactive tab"><TabsTrigger value="b">Itinerary</TabsTrigger></TabsList></Tabs></Cell>
          <Cell label="hover" force="hover"><Tabs value="x"><TabsList aria-label="Hovered tab"><TabsTrigger value="c">Map</TabsTrigger></TabsList></Tabs></Cell>
          <Cell label="focus-visible" force="focus"><Tabs value="x"><TabsList aria-label="Focused tab"><TabsTrigger value="d">Bookings</TabsTrigger></TabsList></Tabs></Cell>
          <Cell label="disabled"><Tabs value="x"><TabsList aria-label="Disabled tab"><TabsTrigger value="e" disabled>Memories</TabsTrigger></TabsList></Tabs></Cell>
        </>
      ),
    },
  ],
  a11y: {
    keyboard: [['Tab', 'Into the tab list (the active tab), then into the panel'], ['← →', 'Moves between tabs and activates them'], ['Home / End', 'First / last tab']],
    aria: ['role="tablist" (needs aria-label), role="tab" with aria-selected and aria-controls, role="tabpanel"'],
    announces: '“Places, tab, selected, 1 of 3”.',
    focus: 'Global focus outline on the tab.',
    pointer: '44 px tall triggers; the strip scrolls sideways when it doesn’t fit.',
  },
  guidance: {
    do: ['Use for 2–5 sibling views of the same thing.', 'Label the tab list.'],
    dont: ['Don’t use in-page tabs for top-level sections that need a URL (use TabNav).'],
  },
})

const tabNav = defineDoc({
  id: 'tab-nav',
  title: 'TabNav',
  group: 'navigation',
  source: 'src/components/ui/Tabs.tsx',
  summary: 'Route tabs: every tab is a real link, so the trip workspace tabs (Overview, Itinerary, Map, Bookings, Memories) are shareable URLs and back/forward just work. When they don’t fit, the strip scrolls and the hidden edge fades.',
  parts: [
    part('TabNav', TabNav, {
      props: {
        children: { type: 'ReactNode', required: true, description: 'TabLink elements.' },
        label: { type: 'string', required: true, description: 'Name of the navigation landmark, e.g. “Trip sections”.' },
        className: { type: 'string', required: false, description: 'Extra classes on the strip.' },
      },
    }),
    part<typeof TabLink, NavLinkProps>('TabLink', TabLink, { inherits: 'React Router NavLink props: to, end… The current route gets aria-current="page" and the blue underline.', props: {} }),
  ],
  examples: [
    {
      id: 'tabnav-trip',
      title: 'Trip workspace tabs',
      description: 'The current tab follows the URL; here, the library page itself, so none is current.',
      render: () => (
        <Cell label="links" wide>
          <TabNav label="Trip sections (example)" className="max-w-xl">
            <TabLink to="/_design/components/tab-nav" end>Overview</TabLink>
            <TabLink to="/_design/components/tab-nav/itinerary">Itinerary</TabLink>
            <TabLink to="/_design/components/tab-nav/map">Map</TabLink>
            <TabLink to="/_design/components/tab-nav/bookings">Bookings</TabLink>
            <TabLink to="/_design/components/tab-nav/memories">Memories</TabLink>
          </TabNav>
        </Cell>
      ),
    },
  ],
  a11y: {
    keyboard: [['Tab', 'Moves link to link'], ['Enter', 'Follows the link']],
    aria: ['<nav aria-label> landmark of links', 'aria-current="page" on the current tab'],
    announces: '“Itinerary, link, current page”.',
    focus: 'After navigation the app moves focus to #main and announces the page (RouteEffects); itinerary day changes don’t count as a page change.',
    pointer: 'On phones the five tabs share the width (smaller type) to fit 390 px.',
  },
  guidance: {
    do: ['Use for sections with their own URL.'],
    dont: ['Don’t give these role="tab": they are links.'],
  },
})

export default [tabs, tabNav]
