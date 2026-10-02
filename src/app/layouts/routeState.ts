/**
 * The page the user was last on, shared by every layout's `RouteEffects`. The app shell, the public layout and
 * onboarding each mount their own copy, so remembering this per copy made a move *between* layouts look like a
 * first load and skipped moving focus. Only the very first page of a session is a real "first load".
 */
export const routeState: { lastKey: string | null } = { lastKey: null }
