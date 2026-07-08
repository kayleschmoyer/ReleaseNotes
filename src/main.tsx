import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import type { PublicClientApplication } from '@azure/msal-browser'
import App from './App'
import { createMsalInstance } from './auth/msal'
import { isDemoMode } from './lib/config'
// Self-hosted brand fonts (Inter + mono call-outs) — no external requests.
import '@fontsource-variable/inter/index.css'
import '@fontsource/roboto-mono/400.css'
import '@fontsource/roboto-mono/500.css'
import './styles/index.css'

const root = createRoot(document.getElementById('root')!)

if (isDemoMode) {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else {
  const msal: PublicClientApplication = createMsalInstance()
  void msal.initialize().then(async () => {
    // Complete a redirect sign-in if we're returning from one.
    const result = await msal.handleRedirectPromise().catch(() => null)
    const account = result?.account ?? msal.getAllAccounts()[0]
    if (account) msal.setActiveAccount(account)
    root.render(
      <StrictMode>
        <MsalProvider instance={msal}>
          <App />
        </MsalProvider>
      </StrictMode>,
    )
  })
}
