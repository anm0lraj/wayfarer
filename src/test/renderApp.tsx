import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '@/app/router'
import { Bootstrap } from '@/app/providers/Bootstrap'
import { Toaster } from '@/components/feedback/Toaster'
import { ServicesProvider, type Services } from '@/services'

/** Renders the real route tree (with data layer and mocked API) at `path`. */
export function renderApp(path: string, services?: Partial<Services>) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ServicesProvider services={services}>
        <Bootstrap><RouterProvider router={router} /></Bootstrap>
        <Toaster />
      </ServicesProvider>
    </QueryClientProvider>,
  )
  return router
}
