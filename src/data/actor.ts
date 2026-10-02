/** The signed-in user id, set by the auth service. Repositories use it for permission checks. */
let actorId: string | null = null

export const DEMO_USER_ID = 'user-demo'

export function setActorId(id: string | null) {
  actorId = id
}

export function getActorId(): string | null {
  return actorId
}
