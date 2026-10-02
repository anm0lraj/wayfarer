import type { CollaboratorRole } from '@/types'

export type TripAction = 'view' | 'edit' | 'delete' | 'invite' | 'publish'

const matrix: Record<CollaboratorRole, ReadonlySet<TripAction>> = {
  owner: new Set(['view', 'edit', 'delete', 'invite', 'publish']),
  editor: new Set(['view', 'edit']),
  viewer: new Set(['view']),
}

export function can(role: CollaboratorRole | null | undefined, action: TripAction): boolean {
  return !!role && matrix[role].has(action)
}

export class PermissionError extends Error {
  constructor(action: TripAction) {
    super(`You don't have permission to ${action} this trip.`)
    this.name = 'PermissionError'
  }
}
