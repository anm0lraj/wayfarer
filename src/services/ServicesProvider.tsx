import type { ReactNode } from 'react'
import { defaultServices, ServicesContext, type Services } from './container'

/** Supplies services to the tree. Tests pass `services` overrides to swap in fakes. */
export function ServicesProvider({ services, children }: { services?: Partial<Services>; children: ReactNode }) {
  return <ServicesContext.Provider value={{ ...defaultServices, ...services }}>{children}</ServicesContext.Provider>
}
