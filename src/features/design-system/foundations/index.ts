import type { GuidePage } from '../registry'
import { ColourPage } from './Colour'
import { LayoutPage } from './Layout'
import { IconographyPage, IllustrationsPage, ImageryPage } from './Media'
import { ElevationPage, MotionPage, RadiusPage, SpacingPage } from './Shape'
import { TypographyPage } from './Typography'
import { VoicePage } from './Voice'

export const foundationPages: GuidePage[] = [
  { id: 'colour', title: 'Colour', summary: 'Electric Blue for action, orange for “happening now”, outlined semantic tones, every token in light and dark with live contrast ratios.', Page: ColourPage },
  { id: 'typography', title: 'Typography', summary: 'Plus Jakarta Sans throughout, a fluid clamp() scale, weights, line height and tabular numbers.', Page: TypographyPage },
  { id: 'spacing', title: 'Spacing', summary: 'The 4 px scale, the steps we use, touch target and layout sizes.', Page: SpacingPage },
  { id: 'radius', title: 'Radius', summary: 'Generous corners: 8 / 12 / 16 / 24 px and pills.', Page: RadiusPage },
  { id: 'elevation', title: 'Elevation', summary: 'Layered, brand-tinted shadows in both themes.', Page: ElevationPage },
  { id: 'motion', title: 'Motion', summary: 'Fast, small, purposeful; reduced motion respected everywhere.', Page: MotionPage },
  { id: 'layout', title: 'Layout and breakpoints', summary: 'Phone, tablet and desktop, each designed on purpose: navigation and overlays per layout class.', Page: LayoutPage },
  { id: 'iconography', title: 'Iconography', summary: 'Lucide outline icons, sizes, colour and labelling.', Page: IconographyPage },
  { id: 'imagery', title: 'Imagery', summary: 'Self-hosted, credited photos, responsive images, fallback posters and the caption scrim.', Page: ImageryPage },
  { id: 'illustrations', title: '3D illustrations', summary: 'The five spot illustrations and where they belong.', Page: IllustrationsPage },
  { id: 'voice', title: 'Voice and copy', summary: 'Bold headings and empty states; plain controls, prices and errors; never pretend a booking.', Page: VoicePage },
]
