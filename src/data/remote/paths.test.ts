import { describe, expect, it } from 'vitest'
import { docPathFor } from './paths'

const at = (entity: string, entityId: string, payload?: unknown) => docPathFor({ entity, entityId, payload }, 'u1')

describe('Firestore document paths', () => {
  it('puts trips and public trips at the top level', () => {
    expect(at('trips', 't1')).toBe('trips/t1')
    expect(at('publicTrips', 'p1')).toBe('publicTrips/p1')
  })

  it('nests trip contents under the trip, using the tripId carried with the change', () => {
    expect(at('items', 'i1', { tripId: 't1' })).toBe('trips/t1/items/i1')
    expect(at('collaborators', 'c1', { tripId: 't1' })).toBe('trips/t1/collaborators/c1')
  })

  it('will not guess a path for a trip item whose trip is unknown', () => {
    expect(at('items', 'i1')).toBeNull()
  })

  it('keeps personal data under the signed-in user', () => {
    expect(at('notifications', 'n1')).toBe('users/u1/notifications/n1')
    expect(at('aiMessages', 'm1')).toBe('users/u1/aiMessages/m1')
  })

  it('only writes your own profile', () => {
    expect(at('users', 'u1')).toBe('users/u1')
    expect(at('users', 'someone-else')).toBeNull()
  })

  it('never syncs the shipped catalogue', () => {
    for (const e of ['destinations', 'places', 'hotels', 'flights', 'blobs']) expect(at(e, 'x')).toBeNull()
  })
})
