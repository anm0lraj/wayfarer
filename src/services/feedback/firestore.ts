import { getAuth } from 'firebase/auth'
import { addDoc, collection } from 'firebase/firestore'
import { APP_VERSION } from '@/config/version'
import { getFirebaseApp } from '@/services/firebase/app'
import { getDb } from '@/services/firebase/firestore'
import { FEEDBACK_MAX, type FeedbackService } from './types'

/** Stores feedback as `feedback/{id}`. The rules let a signed-in person add their own and nobody read it back from the app. */
export const firestoreFeedback: FeedbackService = {
  async send({ message, route }) {
    const uid = getAuth(getFirebaseApp()).currentUser?.uid
    if (!uid) throw new Error('Sign in to send feedback.')
    await addDoc(collection(getDb(), 'feedback'), {
      uid, message: message.trim().slice(0, FEEDBACK_MAX), route: route.slice(0, 200), version: APP_VERSION,
      agent: navigator.userAgent.slice(0, 200), createdAt: new Date().toISOString(),
    })
  },
}
