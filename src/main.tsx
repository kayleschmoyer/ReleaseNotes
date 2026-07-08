import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import App from './App'
import { createMsalInstance } from './auth/msal'
import { detectMode, ModeContext, type AppMode } from './lib/mode'
// Self-hosted brand fonts (Inter + mono call-outs) — no external requests.
import '@fontsource-variable/inter/index.css'
import '@fontsource/roboto-mono/400.css'
import '@fontsource/roboto-mono/500.css'
import './styles/index.css'

const root = createRoot(document.getElementById('root')!)

function render(mode: AppMode, app: React.ReactNode) {
  root.render(
    <StrictMode>
      <ModeContext.Provider value={mode}>{app}</ModeContext.Provider>
    </StrictMode>,
  )
}

void detectMode().then(async (mode) => {
  if (mode !== 'entra') {
    render(mode, <App />)
    return
  }
  const msal = createMsalInstance()
  await msal.initialize()
  // Complete a redirect sign-in if we're returning from one.
  const result = await msal.handleRedirectPromise().catch(() => null)
  const account = result?.account ?? msal.getAllAccounts()[0]
  if (account) msal.setActiveAccount(account)
  render(
    mode,
    <MsalProvider instance={msal}>
      <App />
    </MsalProvider>,
  )
})
