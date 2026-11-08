import { EmptyState, ErrorState, OfflineBanner, OfflineState } from './States'
import { Button } from '@/components/ui/Button'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'
import { toast } from './toast'

const stateProps = {
  title: { type: 'string', required: true, description: 'Bold, friendly heading for empty states; plain for errors.' },
  description: { type: 'string', required: false, description: 'What happened and what to do next.' },
  action: { type: 'ReactNode', required: false, description: 'The next step, usually one Button.' },
  className: { type: 'string', required: false, description: 'Extra classes on the wrapper.' },
  as: { type: "'h1' | 'h2'", required: false, default: "'h2'", description: 'Heading level: h1 when the state is the whole page.' },
} as const

const states = defineDoc({
  id: 'states',
  title: 'Empty, error and offline states',
  group: 'feedback',
  source: 'src/components/feedback/States.tsx',
  summary: 'Every screen has these. Empty says what to do next with a 3D spot illustration; error offers a retry with a plain icon; offline says what still works.',
  parts: [
    part('EmptyState', EmptyState, {
      props: { ...stateProps, art: { type: "'suitcase' | 'pin' | 'globe' | 'camera' | 'plane'", required: false, default: "'suitcase'", description: 'Spot illustration: plane for flights, pin for places and maps, camera for memories, globe for discovery.' } },
    }),
    part('ErrorState', ErrorState, {
      props: {
        ...stateProps,
        title: { type: 'string', required: false, default: "'Something went wrong'", description: 'Plain and specific.' },
        description: { type: 'string', required: false, default: "'Please try again.'", description: 'What failed, without jargon.' },
        onRetry: { type: '() => void', required: false, description: 'Shows a “Try again” button.' },
      },
    }),
    part('OfflineState', OfflineState, {
      props: {
        ...stateProps,
        title: { type: 'string', required: false, default: "'You’re offline'", description: 'Heading.' },
        description: { type: 'string', required: false, default: 'This needs a connection…', description: 'Say what still works offline.' },
      },
    }),
  ],
  examples: [
    {
      id: 'state-empty',
      title: 'Empty',
      render: () => (
        <>
          <Cell label="art: camera"><EmptyState art="camera" title="Your story starts with one photo" description="Add a photo during your trip and it lands on the right day." action={<Button>Add a memory</Button>} /></Cell>
          <Cell label="art: plane"><EmptyState art="plane" title="No flights saved yet" description="Search flights and save one to your trip." /></Cell>
        </>
      ),
    },
    {
      id: 'state-error',
      title: 'Error and offline',
      render: () => (
        <>
          <Cell label="error + retry"><ErrorState title="Couldn’t load hotels" description="Check your connection and try again." onRetry={() => toast({ title: 'Retrying…' })} /></Cell>
          <Cell label="offline"><OfflineState /></Cell>
        </>
      ),
    },
  ],
  a11y: {
    aria: ['Error: role="alert" (read at once)', 'Offline: role="status"', 'Empty: no role (it is page content)', 'Illustrations and icons aria-hidden'],
    announces: 'Errors interrupt; offline is polite; empty is read in order.',
    focus: 'Retry is a normal Button.',
  },
  guidance: {
    do: ['Empty: bold and friendly, plus the next action.', 'Error: plain, say what failed, always offer a retry.'],
    dont: ['Don’t leave a screen blank.', 'Don’t joke in errors or about safety.'],
  },
})

const banner = defineDoc({
  id: 'offline-banner',
  title: 'OfflineBanner',
  group: 'feedback',
  source: 'src/components/feedback/States.tsx',
  summary: 'The app-wide strip under the header while the browser is offline (navigator.onLine). It renders nothing while online, so the preview below is empty unless you go offline (DevTools → Network → Offline).',
  parts: [part('OfflineBanner', OfflineBanner, { props: {} })],
  examples: [{ id: 'banner-live', title: 'Live (follows your connection)', render: () => <Cell label="shown only while offline" wide><OfflineBanner /></Cell> }],
  a11y: { aria: ['role="status"'], announces: '“Offline mode — changes are saved on this device and will sync when you’re back online.”' },
  guidance: { do: ['Keep it in the shell only (AppShell mounts it).'], dont: ['Don’t add another offline banner in a screen; use OfflineState for content that needs the network.'] },
})

export default [states, banner]
