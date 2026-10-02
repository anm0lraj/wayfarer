import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/services'
import type { Session } from '@/services/auth/types'

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ initial, children }: { initial: Session | null; children: ReactNode }) {
  const { auth } = useServices()
  const qc = useQueryClient()
  const [session, setSession] = useState(initial)
  useEffect(
    () =>
      auth.onAuthChange((s) => {
        setSession(s)
        void qc.invalidateQueries() // data visibility depends on who is signed in
      }),
    [auth, qc],
  )
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSession = () => useContext(SessionContext)
