import type { FeedbackService } from './types'

/** Demo: nothing leaves the device, so there is nothing to store. */
export const feedbackService: FeedbackService = { send: async () => { await new Promise((r) => setTimeout(r, 150)) } }
