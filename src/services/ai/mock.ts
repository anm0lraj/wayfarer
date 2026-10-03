import { createAiClient } from './client'

/** The demo backend's assistant: the same client, answered by the in-page mock (src/mocks/handlers/ai.ts). */
export const aiService = createAiClient()
