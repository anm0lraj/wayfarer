import { env } from '@/config/env'
import { sendBatchToApi, type SendBatch } from '../syncEngine'

/** Where queued changes go in this environment: the real Firestore, or the in-page demo API. */
export const sendBatch: SendBatch =
  env.backend === 'firebase' ? async (ops) => (await import('./firestoreSync')).sendBatchToFirestore(ops) : sendBatchToApi

/** Downloads remote changes (real backend only). Returns how many local records changed. */
export async function pullRemote(uid: string): Promise<number> {
  if (env.backend !== 'firebase') return 0
  return (await import('./firestoreSync')).pullFromFirestore(uid)
}
