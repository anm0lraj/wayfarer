import { describe, expect, it } from 'vitest'
import { placeName } from './places'

describe('placeName', () => {
  it('adds the country unless the place is the country', () => {
    expect(placeName({ name: 'Bali', country: 'Indonesia' })).toBe('Bali, Indonesia')
    expect(placeName({ name: 'Japan', country: 'Japan' })).toBe('Japan')
    expect(placeName({ name: 'Goa' })).toBe('Goa')
  })
})
