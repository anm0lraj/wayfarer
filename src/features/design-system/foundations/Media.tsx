import { Link } from 'react-router-dom'
import {
  Bed, Bookmark, Bot, CalendarDays, Camera, Check, Compass, Home, Luggage, MapPin, Plane, Plus, Radio, Search, Share2, Sparkles,
  Trash2, User, Users, Utensils, type LucideIcon,
} from 'lucide-react'
import { ImageCard } from '@/components/ui/ImageCard'
import { Spot, type SpotArt } from '@/components/illustrations/Spot'
import { img } from '@/lib/photos'
import { CARD_SIZES, FEED_SIZES } from '@/lib/photos/responsive'
import { placeholderImage } from '@/lib/placeholder'
import { Block, Code, DoDont, Rules, Table } from '../ui'

const ICONS: [string, LucideIcon][] = [
  ['Home', Home], ['Luggage', Luggage], ['Compass', Compass], ['Bot', Bot], ['User', User], ['Radio', Radio], ['MapPin', MapPin],
  ['CalendarDays', CalendarDays], ['Users', Users], ['Plane', Plane], ['Bed', Bed], ['Utensils', Utensils], ['Camera', Camera],
  ['Search', Search], ['Plus', Plus], ['Check', Check], ['Trash2', Trash2], ['Share2', Share2], ['Bookmark', Bookmark], ['Sparkles', Sparkles],
]

export function IconographyPage() {
  return (
    <div className="space-y-12">
      <Block title="Icons" id="icons-set">
        <p className="text-fg-muted">Lucide (<Code>lucide-react</Code>): one consistent outline set, imported per icon so only what is used ships. Some of the icons in use:</p>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {ICONS.map(([name, Icon]) => (
            <li key={name} className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface p-3 text-center">
              <Icon aria-hidden className="size-6 text-primary" />
              <span className="text-xs text-fg-muted">{name}</span>
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Sizes and weight" id="icons-sizes">
        <Table caption="Icon sizes" head={['Size', 'Sample', 'Use']} rows={[
          [<Code key="a">size-3.5</Code>, <Check key="s" aria-hidden className="size-3.5" />, 'Inside small badges and check marks'],
          [<Code key="b">size-4</Code>, <MapPin key="s" aria-hidden className="size-4" />, 'Inline with text, badges, menu items'],
          [<Code key="c">size-5</Code>, <Plus key="s" aria-hidden className="size-5" />, 'Buttons, navigation, inputs'],
          [<Code key="d">size-6 / size-7</Code>, <Camera key="s" aria-hidden className="size-7" />, 'Feature icons, error/offline discs'],
        ]} />
        <Rules items={[
          <>Stroke 2; the current navigation item uses 2.4.</>,
          <>Icons take the text colour; <Code>text-primary</Code> for an icon that marks an action or category, <Code>text-secondary</Code> only for live.</>,
          <><strong>Always <Code>aria-hidden</Code></strong>: the text beside it carries the meaning. An icon-only button needs an <Code>aria-label</Code> (and a title where a tooltip helps).</>,
          'No emoji as icons in the interface.',
        ]} />
      </Block>
    </div>
  )
}

const SCENES = ['ds-beach', 'ds-temple', 'ds-rice-terraces', 'ds-mountain', 'ds-city-street', 'ds-food', 'ds-hotel', 'ds-shrine', 'ds-fort']

export function ImageryPage() {
  return (
    <div className="space-y-12">
      <Block title="Photos" id="img-photos">
        <Rules items={[
          <>Real photos of the place, dish or kind of stay, freely licensed from Wikimedia Commons (CC0, PD, CC BY, CC BY-SA), <strong>self-hosted</strong> as WebP at 640 and 1280 px in <Code>public/photos</Code>. Fixtures call <Code>img(id)</Code>.</>,
          <>Every photo is credited on <Link to="/credits" className="font-semibold text-primary hover:underline">/credits</Link>; <Code>photos.test.ts</Code> fails on a missing credit, an NC/ND licence or a missing file.</>,
          'Bright, daytime, place-led. No people-led, dark, watermarked or branded pictures; hotels are fictional, so their photos are generic rooms and pools.',
          'The traveller’s own photos (memories, trip cover) replace stock photos wherever they exist.',
        ]} />
      </Block>
      <Block title="Responsive images" id="img-responsive">
        <p className="text-fg-muted"><Code>responsiveImage(src, sizes)</Code> adds <Code>srcset</Code> 640w/1280w and <Code>sizes</Code>; <Code>thumbnail(src)</Code> picks the small file for small pictures. Both work from the URL alone.</p>
        <Table caption="Image sizes" head={['Constant', 'sizes', 'Where']} rows={[
          [<Code key="a">CARD_SIZES</Code>, <Code key="b">{CARD_SIZES}</Code>, 'Card grids (1 / 2 / 3 columns)'],
          [<Code key="c">FEED_SIZES</Code>, <Code key="d">{FEED_SIZES}</Code>, 'Explore feed (1 / 2 / 3 / 4 columns)'],
        ]} />
        <Rules items={['Keep a fixed aspect ratio on every picture (no layout shift).', <>Pass <Code>priority</Code> to the first visible cards only (eager + fetchpriority=high).</>, 'Photos are cached at runtime by the service worker, never precached.']} />
      </Block>
      <Block title="Fallback illustrations" id="img-fallback">
        <p className="text-fg-muted">When there is no photo, or it can’t load offline, <Code>placeholderImage(id)</Code> draws a bright travel poster: a scene picked from keywords in the id (coast, temple, shrine, fort, terraces, mountains, city, food, hotel) and a palette from its hash.</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SCENES.map((id) => <li key={id}><img src={placeholderImage(id, '', [4, 3])} alt="" className="aspect-[4/3] w-full rounded-md object-cover" /><span className="mt-1 block text-xs text-fg-muted">{id.replace('ds-', '')}</span></li>)}
        </ul>
      </Block>
      <Block title="Captions on pictures" id="img-scrim">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ImageCard src={img('p-sanur-beach')} alt="" title="Sanur Beach" subtitle="Calm water, sunrise walks" />
          <ImageCard src={img('j-fushimi')} alt="" title="Fushimi Inari" subtitle="Thousands of vermilion gates" />
        </div>
        <Rules items={[
          <>White text on a photo sits on <Code>.scrim-text</Code>, set on the text block itself: 55–60 % black behind every line with a 1.25rem fade above, so white stays above 4.5:1 even over a white wall (4.75:1 over pure white). <Code>scrim.test.ts</Code> checks the numbers.</>,
          'Only the caption strip darkens; the rest of the photo stays bright. The story viewer uses a taller 3rem fade.',
        ]} />
      </Block>
    </div>
  )
}

const SPOTS: { art: SpotArt; use: string }[] = [
  { art: 'suitcase', use: 'Trips (default)' }, { art: 'pin', use: 'Places, maps' }, { art: 'globe', use: 'Discovery, Explore' }, { art: 'camera', use: 'Memories, stories' }, { art: 'plane', use: 'Flights, getting there' },
]

export function IllustrationsPage() {
  return (
    <div className="space-y-12">
      <Block title="3D spot illustrations" id="spot-set">
        <p className="text-fg-muted">Five small objects drawn in-house as inline SVG: lit from the top left, gradient bodies inside one hue family, a white gloss, a darker side and a soft contact shadow, in Electric Blue, sunny orange, turquoise and green. About 1 KB each, no request, nothing to credit.</p>
        <ul className="flex flex-wrap gap-6">
          {SPOTS.map((s) => <li key={s.art} className="flex flex-col items-center gap-1"><Spot art={s.art} /><Code>{s.art}</Code><span className="text-xs text-fg-muted">{s.use}</span></li>)}
        </ul>
        <DoDont
          dos={['Use in empty states (EmptyState art="…") and onboarding steps.', 'Pick the object that matches the content.']}
          donts={['Not for errors or offline: those keep a plain icon in a tinted disc.', 'Not as decoration on busy screens, and never more than one per view.']}
        />
        <p><Link to="/_design/components/spot" className="font-semibold text-primary hover:underline">Spot component →</Link></p>
      </Block>
    </div>
  )
}
