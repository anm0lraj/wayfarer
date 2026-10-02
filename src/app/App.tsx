import { useMemo } from 'react'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Bootstrap } from './providers/Bootstrap'
import { createRouter } from './router'
import { Toaster } from '@/components/feedback/Toaster'
import { LiveRegion } from '@/lib/a11y/announcer'
import { ServicesProvider } from '@/services'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Reads come from IndexedDB, so they work offline; network-backed reads retry with backoff.
      networkMode: 'offlineFirst',
      retry: (count, error) => count < 2 && !(error instanceof Error && error.name === 'PermissionError'),
    },
    mutations: { networkMode: 'offlineFirst' },
  },
})

// Mirror the browser's connectivity into TanStack Query so queries pause/resume correctly.
if (typeof window !== 'undefined') {
  onlineManager.setEventListener((setOnline) => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  })
}

export function App() {
  const router = useMemo(createRouter, [])
  return (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider>
        <Bootstrap>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </Bootstrap>
        <Toaster />
        <LiveRegion />
      </ServicesProvider>
    </QueryClientProvider>
  )
}
