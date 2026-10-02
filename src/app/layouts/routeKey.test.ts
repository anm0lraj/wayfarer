import { describe, expect, it } from 'vitest'
import { routeKey, titleFor } from './routeKey'

describe('routeKey', () => {
  it('treats in-page changes as the same page', () => {
    expect(routeKey('/trips/t1/itinerary/day/2/add')).toBe(routeKey('/trips/t1/itinerary'))
    expect(routeKey('/trips/t1/itinerary/items/x')).toBe('trips/t1/itinerary')
  })
  it('treats trip tabs and other sections as different pages', () => {
    expect(routeKey('/trips/t1/map')).not.toBe(routeKey('/trips/t1/itinerary'))
    expect(routeKey('/explore/bali')).not.toBe(routeKey('/explore/goa'))
    expect(routeKey('/trips/new/dates')).toBe('trips/new')
  })
})

describe('titleFor', () => {
  it('prefixes the trip tab', () => {
    expect(titleFor('/trips/t1/map', '5 Days in Bali')).toBe('Map · 5 Days in Bali')
    expect(titleFor('/trips/t1', '5 Days in Bali')).toBe('5 Days in Bali')
    expect(titleFor('/explore', 'Explore')).toBe('Explore')
    expect(titleFor('/x', null)).toBe('Wayfarer')
  })

  it('does not repeat the app name when a trip tab has no heading yet', () => {
    expect(titleFor('/trips/t1/live', null)).toBe('Live trip')
  })
})
