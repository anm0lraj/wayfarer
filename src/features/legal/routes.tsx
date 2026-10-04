import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { env } from '@/config/env'

/**
 * The privacy notice and terms. They describe what the app really does today (the code is the source of truth: keep this
 * in step when a service, a stored field or a provider changes). They are a plain-language draft written for a small
 * beta, not legal advice: have them reviewed for the operator's own situation before a public launch.
 */
export const LEGAL_UPDATED = '4 October 2026'

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-6 py-6 leading-relaxed">
      <header>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">Last updated {LEGAL_UPDATED}</p>
      </header>
      {children}
    </article>
  )
}

const H = ({ children }: { children: ReactNode }) => <h2 className="mt-2 text-xl font-semibold">{children}</h2>
const List = ({ items }: { items: ReactNode[] }) => <ul className="list-disc space-y-1.5 pl-6">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>

const contact = () => env.contactEmail
  ? <>write to <a className="text-primary underline" href={`mailto:${env.contactEmail}`}>{env.contactEmail}</a></>
  : <>use <Link className="text-primary underline" to="/settings">Settings</Link>, where you can download or delete your data yourself</>

export function PrivacyPage() {
  return (
    <Doc title="Privacy notice">
      <p>Wayfarer helps you plan trips, travel, and keep memories. This page says what we keep about you, who handles it, and how you stay in control. We keep it short and specific on purpose.</p>

      <H>What we keep</H>
      <List items={[
        <><strong>Your Google account details</strong>: name, email address and profile picture, when you sign in with Google. We never see your Google password.</>,
        <><strong>What you create</strong>: trips, itineraries, saved places, bookings you note down (these are plans, not purchases), checklists, memories (photos, voice notes, text), stories, and your settings and travel preferences.</>,
        <><strong>Your assistant chats</strong> with the travel assistant, and a daily count of how much you have used it.</>,
        <><strong>A device record</strong> if you turn on reminders: a token that lets our server send notifications to that browser, and its time zone.</>,
        <><strong>Feedback</strong> you choose to send from Settings: your message with your account id, the page you were on and the app version.</>,
        <><strong>People you share with</strong>: the email addresses you invite, and the role you give them.</>,
      ]} />
      <p>We do not use advertising or tracking cookies, and we do not run analytics on what you do in the app. If the app crashes it sends one small report to our server log: the error message, the page path (without any details after it), and your browser type. It contains no account details.</p>

      <H>Where it is kept, and who handles it</H>
      <List items={[
        <><strong>Google Firebase</strong> (sign-in and database), in Google’s Mumbai data centre in India. Your trips and photos are stored there so they sync between your devices.</>,
        <><strong>Vercel</strong> hosts the app and runs our small server functions (in Mumbai).</>,
        <><strong>Your device</strong> also keeps a full copy of your data, so the app works offline. Signing out removes it from that device.</>,
      ]} />

      <H>The travel assistant</H>
      <p>When you use the assistant or ask it to draft an itinerary, we send your message and the details of that trip it needs to help (the trip title, destination, dates, travellers, interests and budget, your hotel name, and the activities in your plan) to <strong>Google’s Gemini service</strong>. We do not send your private notes. On the free tier we use for now, Google may use that content to improve its products, so please do not put sensitive personal information in assistant messages. The assistant only suggests changes: nothing is changed until you confirm.</p>

      <H>Maps, weather and routes</H>
      <List items={[
        'Map pictures are loaded from OpenStreetMap’s servers, which see your IP address and which area of the map you are looking at.',
        'Weather forecasts come from Open-Meteo, and road routes from the OSRM project. They receive the coordinates of the place or stops being looked up, not your name or account.',
        'Your position is used only on your device, when you press “Use my location”. We do not store it.',
      ]} />

      <H>Sharing and published pages</H>
      <p>Trips are private. If you publish one, its page is visible to anyone: with “Anyone with the link” it is not listed, with “Public” it appears in the feed. A published page contains the itinerary and the photos you chose, and leaves out your notes, booking details and the GPS location of photos. You can unpublish it at any time and the page, its photos and its link are removed. People you invite to a trip can see and (if you allow it) edit that trip.</p>

      <H>Your choices</H>
      <List items={[
        <><strong>Download your data</strong> from Settings → Account.</>,
        <><strong>Delete your account</strong> from Settings → Account. This removes, from our servers, your trips and their photos, pages you published, saves and likes, settings, assistant chats, feedback and devices, and then your sign-in. People you shared a trip with lose access to trips you owned. It cannot be undone.</>,
        <><strong>Reminders and location</strong> are off until you turn them on, and you can turn them off again in Settings or your browser.</>,
        <>For anything else about your data, {contact()}.</>,
      ]} />

      <H>How long we keep things</H>
      <p>Until you delete them or your account. We do not keep backups of deleted accounts.</p>

      <H>Children</H>
      <p>Wayfarer is for people aged 18 and over.</p>

      <H>Changes</H>
      <p>If this notice changes in a way that matters, we will say so in the app. The date at the top shows the latest version. See also the <Link className="text-primary underline" to="/terms">terms of use</Link>.</p>
    </Doc>
  )
}

export function TermsPage() {
  return (
    <Doc title="Terms of use">
      <p>By using Wayfarer you agree to these terms. They are short because the product is simple.</p>

      <H>What Wayfarer is</H>
      <p>A planner and companion for your trips. It is a tool to help you organise: it does not book flights, hotels or activities. Anything saved in the Bookings area is a note of your plan, labelled as such, and is not a reservation. Always confirm with the airline, property or provider.</p>

      <H>Suggestions can be wrong</H>
      <p>Itineraries, travel times, weather, opening hours and anything the assistant says are suggestions, and may be out of date or mistaken. Check what matters (visas, health, safety, transport, opening hours) with official sources before you rely on it. Use your own judgement, especially about safety.</p>

      <H>Your content</H>
      <p>Your trips, photos and notes stay yours. You give us permission to store them, process them, and show them to the people you choose to share with, so that the app can work. If you publish a trip, you give anyone permission to view that page while it is published. Only upload things you have the right to share, and do not publish other people’s private information.</p>

      <H>Using it properly</H>
      <List items={[
        'Do not break the law, harass anyone, or publish content that is unlawful or that violates others’ rights.',
        'Do not try to break, overload or get around the app’s limits (for example the daily assistant allowance), or access other people’s data.',
        'We may remove content or close accounts that break these rules.',
      ]} />

      <H>Availability</H>
      <p>We work to keep Wayfarer running, but it is provided as is, and during this beta it may change, pause or have mistakes. Keep your own copy of anything important: you can download your data from Settings.</p>

      <H>Responsibility</H>
      <p>To the extent the law allows, we are not responsible for losses that come from relying on suggestions, from a service being unavailable, or from third-party services (maps, weather, the assistant). Nothing here limits rights you have by law that cannot be limited.</p>

      <H>Ending</H>
      <p>You can stop using Wayfarer and delete your account at any time from Settings. How we handle your data is explained in the <Link className="text-primary underline" to="/privacy">privacy notice</Link>.</p>
    </Doc>
  )
}
