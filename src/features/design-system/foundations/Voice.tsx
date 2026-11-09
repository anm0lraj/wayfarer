import { Badge } from '@/components/ui/Chip'
import { Block, Code, Rules, Table } from '../ui'

export function VoicePage() {
  return (
    <div className="space-y-12">
      <Block title="Two registers" id="voice-registers">
        <Rules items={[
          <><strong>Bold and friendly</strong> where it sets the mood: headings, greetings, empty states, page descriptions. “Your next adventure starts here”, “Your story starts with one photo”, “Looks like we took a wrong turn”.</>,
          <><strong>Plain and clear</strong> where people act or need facts: buttons and controls (name the action), prices, bookings, safety and emergency information, errors, search with no results.</>,
          'AI-assisted, not AI-dominated: say what the assistant proposes and that nothing changes until the traveller confirms.',
          <>Write in British English with Indian number grouping for rupees (₹60,000); curly quotes and apostrophes (’); an en dash for ranges (12–17 Oct).</>,
        ]} />
      </Block>
      <Block title="Bookings: never pretend" id="voice-bookings">
        <p>Every saved booking carries exactly this label: <Badge tone="warning">Saved to trip — not booked</Badge></p>
        <Rules items={[
          'Nothing in the app is purchased. Never say “Booked”, “Confirmed”, “Paid” or “Reserved” about a demo booking.',
          <>Local transport fares are estimates (“about ₹350–450”), never quotes; sample timetables say “Sample timetable for the demo. Times and fares are not live.”</>,
          'Never fake a live location: say “Use my location” and explain why before asking.',
        ]} />
      </Block>
      <Block title="Examples" id="voice-examples">
        <Table caption="Copy examples" head={['Where', 'Write', 'Not']} rows={[
          ['Empty trips', '“Your next adventure starts here”', '“No data”'],
          ['Button', '“Add hotel”, “Save”, “Delete trip”', '“Let’s go!”, “Submit”'],
          ['Error', '“Couldn’t load hotels. Check your connection and try again.”', '“Oops! Something broke!”'],
          ['No results', '“No places match “ramen”. Try a shorter search.”', '“Nothing here, explorer!”'],
          ['Toast', '“Activity deleted” + Undo', '“Your activity has been successfully deleted.”'],
          ['Loading', '“Saving…”', '“Please wait while we…”'],
          ['Permission', '“Use my location to see how far the next stop is. We only check while this page is open.”', 'A browser prompt on page load'],
        ]} />
        <p className="text-sm text-fg-muted">Tests assert some of this text: change the test when you change the copy (<Code>grep</Code> for the old string).</p>
      </Block>
    </div>
  )
}
