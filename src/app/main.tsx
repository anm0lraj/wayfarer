import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { installMockApi } from '@/mocks/install'
import { initInstallPrompt, usePwa } from '@/lib/pwa'
import { installImageFallback } from '@/lib/stock/fallback'
import { initTheme } from '@/lib/theme'
import '@/styles/globals.css'

initTheme()
installImageFallback() // a photo that can't load becomes its illustration, not a broken icon
installMockApi() // serves /api/* in-page until a real backend proxy exists

initInstallPrompt()
if (import.meta.env.PROD) {
  // `prompt` mode: a waiting update is only applied when the traveller chooses to reload (see UpdateBanner).
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
    onOfflineReady: () => usePwa.setState({ offlineReady: true }),
  })
  usePwa.setState({ applyUpdate: () => updateSW(true) })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
