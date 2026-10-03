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
  /** Every day of the plan with its activities, so the assistant can move, remove and reorder across days. */
  plan?: Array<{ dayNumber: number; items: Array<{ id: string; title: string; startTime: string; durationMin: number }> }>
}

/** A place the assistant may recommend (the real model only knows the places it is sent). */
export interface CatalogueEntry {
  id: string
  name: string
  kind: string
  tags: string[]
  rating?: number
  lat: number
  lng: number
  durationMin?: number
  costInr?: number
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

/** The traveller has used today's assistant allowance. It renews at midnight (India time). */
export class AIQuotaError extends AIUnavailableError {
  constructor() {
    super('You’ve used today’s assistant allowance. It renews at midnight.')
    this.name = 'AIQuotaError'
  }
}
