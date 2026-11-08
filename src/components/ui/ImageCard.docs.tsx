import { ImageCard } from './ImageCard'
import { Badge } from './Chip'
import { Cell } from '@/features/design-system/Cell'
import { defineDoc, part } from '@/features/design-system/doc'
import { img } from '@/lib/photos'
import { placeholderImage } from '@/lib/placeholder'

export default defineDoc({
  id: 'image-card',
  title: 'ImageCard',
  group: 'media',
  source: 'src/components/ui/ImageCard.tsx',
  summary: 'A large photo with its title on the caption scrim. The ratio is fixed, so the space is reserved before the photo loads (no layout shift); srcset 640/1280 lets a phone fetch the small file.',
  parts: [
    part('ImageCard', ImageCard, {
      props: {
        src: { type: 'string', required: true, description: 'Photo URL (`img(id)` for catalogue photos). A photo that fails to load is redrawn as its illustration.' },
        alt: { type: 'string', required: true, description: 'Alt text. "" when the title already says what the picture shows (the usual case on a card).' },
        title: { type: 'string', required: true, description: 'Bold white title on the scrim (one line, truncated).' },
        subtitle: { type: 'string', required: false, description: 'Up to two lines under the title.' },
        meta: { type: 'string', required: false, description: 'A short second fact on its own line, e.g. a price.' },
        badge: { type: 'ReactNode', required: false, description: 'Top-left badge (give non-live badges bg-surface/95).' },
        ratio: { type: "'16/9' | '4/3' | '3/4' | '1/1'", required: false, default: "'4/3'", description: 'Fixed aspect ratio.' },
        className: { type: 'string', required: false, description: 'Extra classes on the frame.' },
        priority: { type: 'boolean', required: false, default: 'false', description: 'In view when the page opens: load eagerly with fetchpriority=high (it is usually the LCP).' },
        sizes: { type: 'string', required: false, default: 'CARD_SIZES', description: 'The `sizes` attribute: how wide the card is drawn at each breakpoint.' },
      },
    }),
  ],
  examples: [
    {
      id: 'image-ratios',
      title: 'Ratios',
      render: () => (
        <>
          <Cell label="4/3 (default)"><div className="w-64"><ImageCard src={img('p-uluwatu-temple')} alt="" title="Uluwatu Temple" subtitle="Clifftop temple · sunset Kecak" /></div></Cell>
          <Cell label="16/9 + meta"><div className="w-72"><ImageCard src={img('bali')} alt="" ratio="16/9" title="Bali" subtitle="Indonesia" meta="from ₹4,500/day" /></div></Cell>
          <Cell label="3/4 + badge"><div className="w-48"><ImageCard src={img('p-tegallalang')} alt="" ratio="3/4" title="Tegallalang" badge={<Badge tone="primary" className="bg-surface/95 shadow-sm">Nature</Badge>} /></div></Cell>
          <Cell label="1/1"><div className="w-48"><ImageCard src={img('r-warung-sari')} alt="" ratio="1/1" title="Warung Sari" subtitle="Balinese · ₹₹" /></div></Cell>
        </>
      ),
    },
    {
      id: 'image-fallback',
      title: 'Illustration fallback and long text',
      description: 'A place with no photo gets a generated poster; long titles truncate and subtitles clamp to two lines.',
      render: () => (
        <>
          <Cell label="generated illustration"><div className="w-64"><ImageCard src={placeholderImage('ds-temple-hike', '', [4, 3])} alt="" title="Hidden temple hike" subtitle="Custom activity" /></div></Cell>
          <Cell label="long text"><div className="w-64"><ImageCard src={img('p-tanah-lot')} alt="" title="Tanah Lot Temple at low tide, west coast" subtitle="A sea temple on a rock just off the shore, reachable on foot when the tide is out. Busy at sunset." /></div></Cell>
        </>
      ),
    },
  ],
  a11y: {
    aria: ['Not interactive by itself: wrap it in one <Link> (with class `group` for the zoom)', 'alt="" when the title names the place; the title is real text, not part of the image'],
    announces: 'The title, subtitle and meta as text.',
    pointer: 'Inside a link the whole card is the target.',
    motion: 'The photo zooms to 104 % on hover of the wrapping `group`; none with reduced motion.',
  },
  guidance: {
    do: ['Use real, self-hosted photos (img(id)), credited on /credits.', 'Pass priority to the first visible cards only.', 'Keep white text on the scrim (≥ 55 % black behind every line).'],
    dont: ['Don’t put text on a photo without the scrim.', 'Don’t use hotlinked or branded photos.', 'Don’t remove the fixed ratio.'],
  },
})
