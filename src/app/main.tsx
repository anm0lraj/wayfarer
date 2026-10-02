import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { installMockApi } from '@/mocks/install'
import { initTheme } from '@/lib/theme'
import '@/styles/globals.css'

initTheme()
installMockApi() // serves /api/* in-page until a real backend proxy exists

if (import.meta.env.PROD) {
  // `prompt` mode: a waiting update is applied on next launch; an in-app "Update available" prompt arrives in Phase 8.
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
