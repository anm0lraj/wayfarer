export interface FeedbackInput { message: string; /** The page the person was on. */ route: string }

/** Where "Send feedback" goes. The demo backend keeps nothing; the real one stores it for the team (`feedback` in Firestore). */
export interface FeedbackService {
  send(input: FeedbackInput): Promise<void>
}

export const FEEDBACK_MAX = 2000
