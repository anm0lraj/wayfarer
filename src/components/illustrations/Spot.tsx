import { useId } from 'react'
import { cn } from '@/lib/cn'

/*
 * Small "3D" spot illustrations for empty states and onboarding, drawn inline (no image request, ~1 KB each, crisp at
 * any size). Each object is lit from the top left: a gradient body inside one hue family, a white gloss highlight,
 * a darker side for depth and a soft contact shadow on the ground. Brand colours only: Electric Blue, sunny orange,
 * turquoise sea and fresh green. Decorative: always aria-hidden, the text next to it carries the meaning.
 */
export type SpotArt = 'suitcase' | 'pin' | 'globe' | 'camera' | 'plane'

const BLUE = { light: '#7EA0FF', mid: '#1A50F0', dark: '#0F37B5', deep: '#0A2687' }
const ORANGE = { light: '#FFCB78', mid: '#FF9F1C', dark: '#E06F00' }

function Ground({ id, rx = 36, cy = 105 }: { id: string; rx?: number; cy?: number }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-sh`}>
          <stop offset="0" stopColor="#101834" stopOpacity="0.28" />
          <stop offset="1" stopColor="#101834" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy={cy} rx={rx} ry="7" fill={`url(#${id}-sh)`} />
    </>
  )
}

function Suitcase({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BLUE.light} /><stop offset="0.55" stopColor={BLUE.mid} /><stop offset="1" stopColor={BLUE.dark} />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ORANGE.light} /><stop offset="1" stopColor={ORANGE.dark} />
        </linearGradient>
        <clipPath id={`${id}-c`}><rect x="20" y="32" width="80" height="66" rx="16" /></clipPath>
      </defs>
      <Ground id={id} />
      <circle cx="34" cy="101" r="5" fill="#16204A" />
      <circle cx="86" cy="101" r="5" fill="#16204A" />
      <path d="M46 34V24a8 8 0 0 1 8-8h12a8 8 0 0 1 8 8v10" fill="none" stroke={BLUE.dark} strokeWidth="7" strokeLinecap="round" />
      <rect x="20" y="32" width="80" height="66" rx="16" fill={`url(#${id}-b)`} />
      <g clipPath={`url(#${id}-c)`}>
        <rect x="87" y="32" width="13" height="66" fill={BLUE.deep} fillOpacity="0.35" />
        <rect x="38" y="32" width="9" height="66" fill={`url(#${id}-s)`} />
        <rect x="73" y="32" width="9" height="66" fill={`url(#${id}-s)`} />
        <rect x="20" y="32" width="80" height="12" fill="#fff" fillOpacity="0.18" />
      </g>
      <rect x="26" y="42" width="6" height="40" rx="3" fill="#fff" fillOpacity="0.4" />
      <circle cx="60" cy="66" r="10" fill="#fff" />
      <circle cx="60" cy="66" r="5.5" fill={ORANGE.mid} />
    </>
  )
}

function Pin({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-p`} cx="0.35" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#9DB8FF" /><stop offset="0.45" stopColor={BLUE.mid} /><stop offset="1" stopColor={BLUE.deep} />
        </radialGradient>
        <radialGradient id={`${id}-h`} cx="0.6" cy="0.65" r="0.7">
          <stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#CFDBFF" />
        </radialGradient>
      </defs>
      <Ground id={id} rx={30} cy={101} />
      <ellipse cx="60" cy="100" rx="22" ry="5.5" fill="none" stroke={ORANGE.mid} strokeWidth="3" />
      <path d="M60 12c-19.3 0-34 14.7-34 33.5C26 70 60 98 60 98s34-28 34-52.5C94 26.7 79.3 12 60 12z" fill={`url(#${id}-p)`} />
      <circle cx="60" cy="45" r="13" fill={`url(#${id}-h)`} />
      <ellipse cx="44" cy="28" rx="8" ry="4.5" transform="rotate(-38 44 28)" fill="#fff" fillOpacity="0.55" />
    </>
  )
}

function Globe({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-g`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#B4F3F8" /><stop offset="0.5" stopColor="#26BCD0" /><stop offset="1" stopColor="#0B6F8C" />
        </radialGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8EE8AE" /><stop offset="1" stopColor="#1F9A55" />
        </linearGradient>
        <clipPath id={`${id}-c`}><circle cx="60" cy="56" r="34" /></clipPath>
      </defs>
      <Ground id={id} rx={32} />
      <g transform="rotate(-18 60 56)">
        <path d="M12 56a48 13 0 0 1 96 0" fill="none" stroke={ORANGE.dark} strokeWidth="3.5" strokeOpacity="0.55" />
      </g>
      <circle cx="60" cy="56" r="34" fill={`url(#${id}-g)`} />
      <g clipPath={`url(#${id}-c)`}>
        <path d="M30 40c6-8 16-10 22-6 4 3 2 8-3 10-4 2-3 7 1 10 3 3 0 8-6 8-6 0-10-6-14-12-2-4-2-7 0-10z" fill={`url(#${id}-l)`} />
        <path d="M66 28c8-2 18 2 22 10 2 5-2 8-7 7-4-1-7 2-6 6 1 5-3 8-8 6-5-3-6-9-5-15 0-7-1-12 4-14z" fill={`url(#${id}-l)`} />
        <path d="M60 72c6-2 14 0 16 5 1 4-3 8-8 9-6 1-12-1-12-6 0-4 1-7 4-8z" fill={`url(#${id}-l)`} />
        <ellipse cx="60" cy="56" rx="14" ry="34" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
        <ellipse cx="60" cy="56" rx="34" ry="11" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
      </g>
      <ellipse cx="46" cy="38" rx="10" ry="6" transform="rotate(-32 46 38)" fill="#fff" fillOpacity="0.5" />
      <g transform="rotate(-18 60 56)">
        <path d="M12 56a48 13 0 0 0 96 0" fill="none" stroke={ORANGE.mid} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="97" cy="64.4" r="5.5" fill={ORANGE.mid} stroke="#fff" strokeWidth="2" />
      </g>
    </>
  )
}

function Camera({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ORANGE.light} /><stop offset="0.5" stopColor={ORANGE.mid} /><stop offset="1" stopColor={ORANGE.dark} />
        </linearGradient>
        <radialGradient id={`${id}-l`} cx="0.38" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#A9C1FF" /><stop offset="0.4" stopColor={BLUE.mid} /><stop offset="1" stopColor="#081E70" />
        </radialGradient>
        <clipPath id={`${id}-c`}><rect x="16" y="36" width="88" height="60" rx="16" /></clipPath>
      </defs>
      <Ground id={id} rx={40} />
      <rect x="40" y="26" width="28" height="16" rx="6" fill={ORANGE.dark} />
      <rect x="78" y="29" width="12" height="9" rx="3" fill={BLUE.dark} />
      <rect x="16" y="36" width="88" height="60" rx="16" fill={`url(#${id}-b)`} />
      <g clipPath={`url(#${id}-c)`}>
        <rect x="16" y="36" width="88" height="10" fill="#fff" fillOpacity="0.28" />
        <rect x="16" y="84" width="88" height="12" fill={ORANGE.dark} fillOpacity="0.4" />
      </g>
      <rect x="82" y="45" width="14" height="8" rx="3" fill="#FFF6E0" />
      <circle cx="60" cy="66" r="24" fill="#fff" />
      <circle cx="60" cy="66" r="20" fill="#18244E" />
      <circle cx="60" cy="66" r="15" fill={`url(#${id}-l)`} />
      <circle cx="54" cy="60" r="4" fill="#fff" fillOpacity="0.85" />
      <circle cx="66" cy="72" r="2" fill="#fff" fillOpacity="0.5" />
      <rect x="22" y="44" width="6" height="30" rx="3" fill="#fff" fillOpacity="0.35" />
    </>
  )
}

function Plane({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#C4D3FF" />
        </linearGradient>
        <linearGradient id={`${id}-w`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BLUE.light} /><stop offset="1" stopColor={BLUE.dark} />
        </linearGradient>
      </defs>
      <Ground id={id} rx={26} cy={108} />
      <path d="M12 92a8 8 0 0 1 15-4 7 7 0 0 1 12 5 6 6 0 0 1-1 12H17a7 7 0 0 1-5-13z" fill="#DCE6FF" />
      <path d="M12 90a8 8 0 0 1 15-4 7 7 0 0 1 12 5 6 6 0 0 1-1 11H17a7 7 0 0 1-5-12z" fill="#fff" />
      <path d="M80 30a7 7 0 0 1 13-3 6 6 0 0 1 10 4 5 5 0 0 1-1 10H84a6 6 0 0 1-4-11z" fill="#fff" fillOpacity="0.9" />
      <g transform="rotate(-20 60 60)">
        <path d="M58 56 L46 34 L54 32 L72 55z" fill={BLUE.dark} />
        <path d="M18 60c0-6 6-10 14-10h50c12 0 22 4 22 10s-10 10-22 10H32c-8 0-14-4-14-10z" fill={`url(#${id}-f)`} />
        <path d="M22 52 L15 33 L25 33 L37 51z" fill={`url(#${id}-w)`} />
        <rect x="30" y="63" width="60" height="3" rx="1.5" fill={ORANGE.mid} />
        {[44, 52, 60, 68, 76].map((x) => <circle key={x} cx={x} cy="57.5" r="2.3" fill={BLUE.mid} />)}
        <path d="M92 53.5c5 1 9.5 3.2 10.5 6.5H91z" fill={BLUE.mid} />
        <path d="M56 64 L41 90 L51 92 L77 64z" fill={`url(#${id}-w)`} />
        <path d="M34 52h44" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.9" />
      </g>
    </>
  )
}

const ART: Record<SpotArt, (p: { id: string }) => JSX.Element> = { suitcase: Suitcase, pin: Pin, globe: Globe, camera: Camera, plane: Plane }

export function Spot({ art, className }: { art: SpotArt; className?: string }) {
  const id = `spot${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const Art = ART[art]
  return (
    <svg viewBox="0 0 120 120" aria-hidden focusable="false" className={cn('size-28', className)}>
      <Art id={id} />
    </svg>
  )
}
