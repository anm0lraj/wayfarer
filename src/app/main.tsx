import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { installMockApi } from '@/mocks/install'
import { initInstallPrompt, usePwa } from '@/lib/pwa'
import { env } from '@/config/env'
import { initTheme } from '@/lib/theme'
import '@/styles/globals.css'

initTheme()
// Serves /api/* in-page. The live assistant, push (test notification) and account deletion are real functions, so their paths go through.
installMockApi({ passThrough: [...(env.ai === 'live' ? ['/api/ai/'] : []), ...(env.pushKey ? ['/api/push/'] : []), ...(env.backend === 'firebase' ? ['/api/account/'] : [])] })

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
