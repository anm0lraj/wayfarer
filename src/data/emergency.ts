export interface EmergencyContact {
  label: string
  /** Dial string, digits only. */
  number: string
}

export interface EmergencyInfo {
  country: string
  contacts: EmergencyContact[]
  notes: string[]
}

/**
 * Static emergency numbers, bundled with the app so they work with no connection. Keyed by destination
 * country. Always shown with a reminder to verify, since numbers can change.
 */
const BY_COUNTRY: Record<string, EmergencyInfo> = {
  Indonesia: {
    country: 'Indonesia',
    contacts: [
      { label: 'General emergency', number: '112' },
      { label: 'Police', number: '110' },
      { label: 'Ambulance', number: '118' },
      { label: 'Fire', number: '113' },
      { label: 'Search and rescue', number: '115' },
    ],
    notes: [
      'Keep a photo of your passport and visa on your phone and a paper copy in your hotel.',
      'Check your travel insurance helpline number and policy number before you leave.',
      'Your embassy or consulate can help with lost passports and serious emergencies.',
    ],
  },
}

const FALLBACK: EmergencyInfo = {
  country: 'Local',
  contacts: [{ label: 'General emergency', number: '112' }],
  notes: [
    '112 works in many countries, but not all. Look up the local numbers before you travel.',
    'Keep your insurance helpline and your embassy’s contact details saved offline.',
  ],
}

export const emergencyInfoFor = (country: string | undefined): EmergencyInfo => (country && BY_COUNTRY[country]) || FALLBACK
