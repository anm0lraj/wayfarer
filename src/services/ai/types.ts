import type { AIMessage, Destination, ItineraryItem, NewDayInput, Trip } from '@/types'

/** What the assistant is told about the user's trip, so they never have to repeat it. */
export interface TripContext {
  trip: Pick<Trip, 'id' | 'title' | 'startDate' | 'endDate' | 'travellers' | 'budget' | 'interests'>
  destination?: Pick<Destination, 'id' | 'name'>
  hotelName?: string
  /** Today's date in the trip's timezone (honours the demo date simulator). */
  today: string
  /** Number of days in the trip. */
  days: number
  /** Which day of the trip it is right now. Absent before the trip starts or after it ends. */
  currentDay?: number
  /** The day the user is most likely talking about: the current day while travelling, otherwise day 1. */
  focusDay: number
  completed: string[]
  upcoming: string[]
  /** Activities on the focus day, in order. */
  items?: Pick<ItineraryItem, 'id' | 'title' | 'startTime' | 'dayId' | 'placeId'>[]
}

export type AIStreamEvent =
  | { type: 'token'; text: string }
  | { type: 'action'; action: unknown } // untrusted — validated with aiActionSchema before use
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface ChatRequest {
  conversationId: string
  messages: Pick<AIMessage, 'role' | 'content'>[]
  context?: TripContext
  signal?: AbortSignal
}

export interface ItineraryRequest {
  destinationId: string
  days: number
  interests: string[]
  budgetTotal?: number
  prompt?: string
}

export interface ItineraryPreview {
  days: NewDayInput[]
  summary: string
}

export interface DayDiff {
  dayNumber: number
  before: string[]
  after: NewDayInput
}

export interface AIService {
  /** Streams a reply. Throws `AIUnavailableError` when the proxy is unreachable. */
  streamChat(req: ChatRequest): AsyncIterable<AIStreamEvent>
  generateItinerary(req: ItineraryRequest, signal?: AbortSignal): Promise<ItineraryPreview>
  /** Returns a preview; the caller shows before/after and applies it through repositories only on confirm. */
  regenerateDay(req: ItineraryRequest & { dayNumber: number; current: string[] }, signal?: AbortSignal): Promise<DayDiff>
}

export class AIUnavailableError extends Error {
  constructor(message = 'The assistant is unavailable right now.') {
    super(message)
    this.name = 'AIUnavailableError'
  }
}
