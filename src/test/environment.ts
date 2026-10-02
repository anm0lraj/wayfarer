import type { Environment } from 'vitest'
import { builtinEnvironments } from 'vitest/environments'

/**
 * jsdom, but keeping Node's own AbortController/AbortSignal. jsdom's versions are rejected by Node's
 * `Request` (used by React Router and our fetch mock), which throws "emitter must be an EventTarget".
 */
const environment: Environment = {
  ...builtinEnvironments.jsdom,
  name: 'jsdom-node-abort',
  async setup(global, options) {
    const { AbortController, AbortSignal } = global as typeof globalThis
    const result = await builtinEnvironments.jsdom.setup(global, options)
    Object.assign(global, { AbortController, AbortSignal })
    return result
  },
}

export default environment
