import { transitCity } from './transitCities'
import type { TransitMode, TransitService } from '@/types'

/**
 * Sample timetable for the demo — static, bundled, never seeded into IndexedDB, and loaded lazily by the booking
 * mock. Times and fares are made up to look realistic; none of it is live. Fares are per person, in INR.
 * One row serves both directions: each end lists when the service leaves from there.
 */
type End = [city: string, code: string, stop: string, departs: string]
interface Row {
  mode: TransitMode
  number: string
  operator: string
  name: string
  seatClass: string
  fare: number
  durationMin: number
  a: End
  b: End
  note?: string
}

const IR = 'Indian Railways'
const FERRY = 'Includes the Gilimanuk–Ketapang ferry crossing'
const train = (number: string, operator: string, name: string, seatClass: string, fare: number, durationMin: number, a: End, b: End): Row =>
  ({ mode: 'train', number, operator, name, seatClass, fare, durationMin, a, b })
const bus = (number: string, operator: string, name: string, seatClass: string, fare: number, durationMin: number, a: End, b: End, note?: string): Row =>
  ({ mode: 'bus', number, operator, name, seatClass, fare, durationMin, a, b, note })

const ROWS: Row[] = [
  // Trains. Udaipur–Jodhpur, anything to Manali and Bali (rail) deliberately have no direct service.
  train('12015', IR, 'Ajmer Shatabdi', 'AC Chair Car', 890, 265, ['delhi', 'NDLS', 'New Delhi', '06:05'], ['jaipur', 'JP', 'Jaipur Jn', '17:50']),
  train('12958', IR, 'Swarna Jayanti Rajdhani', 'AC 3 Tier', 1365, 255, ['delhi', 'NDLS', 'New Delhi', '19:40'], ['jaipur', 'JP', 'Jaipur Jn', '18:45']),
  train('12951', IR, 'Mumbai Rajdhani', 'AC 3 Tier', 3280, 910, ['delhi', 'NDLS', 'New Delhi', '16:55'], ['mumbai', 'MMCT', 'Mumbai Central', '17:00']),
  train('12963', IR, 'Mewar Express', 'AC 3 Tier', 1640, 745, ['delhi', 'NZM', 'Hazrat Nizamuddin', '19:00'], ['udaipur', 'UDZ', 'Udaipur City', '18:30']),
  train('12461', IR, 'Mandore Express', 'AC 3 Tier', 1320, 690, ['delhi', 'NDLS', 'New Delhi', '19:10'], ['jodhpur', 'JU', 'Jodhpur Jn', '19:25']),
  train('12780', IR, 'Goa Express', 'AC 3 Tier', 2520, 1650, ['delhi', 'NZM', 'Hazrat Nizamuddin', '15:00'], ['goa', 'MAO', 'Madgaon Jn', '08:50']),
  train('12465', IR, 'Jaipur–Jodhpur Intercity', 'AC Chair Car', 495, 330, ['jaipur', 'JP', 'Jaipur Jn', '05:50'], ['jodhpur', 'JU', 'Jodhpur Jn', '17:30']),
  train('12991', IR, 'Udaipur City Express', 'AC Chair Car', 745, 540, ['jaipur', 'JP', 'Jaipur Jn', '06:15'], ['udaipur', 'UDZ', 'Udaipur City', '17:20']),
  train('12956', IR, 'Jaipur SF Express', 'AC 3 Tier', 2140, 1100, ['mumbai', 'BDTS', 'Bandra Terminus', '18:50'], ['jaipur', 'JP', 'Jaipur Jn', '17:45']),
  train('10103', IR, 'Mandovi Express', 'AC Chair Car', 1180, 720, ['mumbai', 'CSMT', 'Mumbai CSMT', '07:10'], ['goa', 'MAO', 'Madgaon Jn', '09:30']),
  train('12051', IR, 'Jan Shatabdi', 'Chair Car', 640, 490, ['mumbai', 'CSMT', 'Mumbai CSMT', '05:25'], ['goa', 'MAO', 'Madgaon Jn', '14:05']),
  train('KA71', 'KAI', 'Sancaka (Executive)', 'Executive', 1460, 310, ['surabaya', 'SGU', 'Surabaya Gubeng', '07:20'], ['yogyakarta', 'YK', 'Yogyakarta', '13:30']),
  train('KA73', 'KAI', 'Sancaka (Economy)', 'Economy', 640, 335, ['surabaya', 'SGU', 'Surabaya Gubeng', '15:10'], ['yogyakarta', 'YK', 'Yogyakarta', '09:15']),

  // Buses.
  bus('V101', 'RSRTC', 'Volvo AC day service', 'AC Seater', 720, 330, ['delhi', 'DKG', 'Kashmere Gate ISBT', '06:30'], ['jaipur', 'JSC', 'Sindhi Camp', '15:00']),
  bus('V103', 'RSRTC', 'Volvo AC night sleeper', 'AC Sleeper', 1050, 360, ['delhi', 'DKG', 'Kashmere Gate ISBT', '22:30'], ['jaipur', 'JSC', 'Sindhi Camp', '22:00']),
  bus('V240', 'RSRTC', 'Volvo overnight', 'AC Sleeper', 1150, 480, ['jaipur', 'JSC', 'Sindhi Camp', '21:30'], ['udaipur', 'UBS', 'Udaipur Bus Stand', '20:30']),
  bus('V150', 'RSRTC', 'Volvo day service', 'AC Seater', 520, 345, ['jaipur', 'JSC', 'Sindhi Camp', '07:00'], ['jodhpur', 'JBS', 'Jodhpur Raika Bagh', '14:00']),
  bus('V310', 'RSRTC', 'Volvo day service', 'AC Seater', 480, 345, ['udaipur', 'UBS', 'Udaipur Bus Stand', '07:30'], ['jodhpur', 'JBS', 'Jodhpur Raika Bagh', '08:15']),
  bus('V312', 'RSRTC', 'Express', 'Non-AC Seater', 340, 400, ['udaipur', 'UBS', 'Udaipur Bus Stand', '13:00'], ['jodhpur', 'JBS', 'Jodhpur Raika Bagh', '12:30']),
  bus('H55', 'HRTC', 'Volvo AC', 'AC Seater', 1450, 840, ['delhi', 'DKG', 'Kashmere Gate ISBT', '18:00'], ['manali', 'MNB', 'Manali Bus Stand', '17:00']),
  bus('H58', 'Private operator', 'Overnight sleeper', 'AC Sleeper', 1850, 810, ['delhi', 'DKG', 'Kashmere Gate ISBT', '20:00'], ['manali', 'MNB', 'Manali Bus Stand', '19:30']),
  bus('G22', 'Private operator', 'Overnight sleeper', 'AC Sleeper', 1350, 840, ['mumbai', 'MBB', 'Borivali', '18:00'], ['goa', 'PNJ', 'Panaji Bus Stand', '17:00']),
  bus('B07', 'Safari Dharma Raya', 'Executive bus + ferry', 'Executive', 1300, 660, ['bali', 'UBG', 'Ubung Terminal', '17:00'], ['surabaya', 'PBY', 'Purabaya Terminal', '18:30'], FERRY),
  bus('B12', 'Safari Dharma Raya', 'Sleeper bus + ferry', 'Sleeper', 2100, 1080, ['bali', 'UBG', 'Ubung Terminal', '12:00'], ['yogyakarta', 'GWG', 'Giwangan Terminal', '14:00'], FERRY),
]

const pad = (n: number) => String(n).padStart(2, '0')
const offsetText = (min: number) => `${min < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(min) / 60))}:${pad(Math.abs(min) % 60)}`

/** An ISO time on `date` at a city's wall clock, carrying that city's offset. */
const stamp = (date: string, time: string, offsetMin: number): string => `${date}T${time}:00${offsetText(offsetMin)}`

/** The same instant plus `minutes`, written in another city's wall clock. */
export function shiftStamp(iso: string, minutes: number, offsetMin: number): string {
  const local = new Date(new Date(iso).getTime() + minutes * 60_000 + offsetMin * 60_000)
  return `${local.toISOString().slice(0, 19)}${offsetText(offsetMin)}`
}

const idOf = (mode: TransitMode, number: string, from: string, to: string, date: string) => `${mode === 'train' ? 'tr' : 'bs'}-${number}-${from}-${to}-${date}`

function service(row: Row, forward: boolean, date: string): TransitService {
  const [from, to] = forward ? [row.a, row.b] : [row.b, row.a]
  const fromOffset = transitCity(from[0])?.utcOffsetMin ?? 0
  const toOffset = transitCity(to[0])?.utcOffsetMin ?? 0
  const departAt = stamp(date, from[3], fromOffset)
  return {
    id: idOf(row.mode, row.number, from[1], to[1], date), mode: row.mode, operator: row.operator, number: row.number, name: row.name,
    from: { code: from[1], city: from[0], name: from[2] }, to: { code: to[1], city: to[0], name: to[2] },
    departAt, arriveAt: shiftStamp(departAt, row.durationMin, toOffset), durationMin: row.durationMin,
    seatClass: row.seatClass, price: { amount: row.fare, currency: 'INR' }, ...(row.note ? { note: row.note } : {}),
  }
}

/** Direct services between two cities (either direction) on a date, earliest departure first. */
export function searchTransit(mode: TransitMode, from: string, to: string, date: string): TransitService[] {
  const out: TransitService[] = []
  for (const row of ROWS) {
    if (row.mode !== mode) continue
    if (row.a[0] === from && row.b[0] === to) out.push(service(row, true, date))
    else if (row.b[0] === from && row.a[0] === to) out.push(service(row, false, date))
  }
  return out.sort((x, y) => x.departAt.slice(11, 16).localeCompare(y.departAt.slice(11, 16)))
}

export const TIMETABLE_ROWS: readonly Row[] = ROWS
