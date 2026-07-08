import { StrictMode, type ComponentType, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { detectMode, detectServerOrDemo, ModeContext, type AppMode } from './lib/mode'
// Self-hosted brand fonts (Inter + mono call-outs) — no external requests.
import '@fontsource-variable/inter/index.css'
import '@fontsource/roboto-mono/400.css'
import '@fontsource/roboto-mono/500.css'
import './styles/index.css'

const root = createRoot(document.getElementById('root')!)

function render(mode: AppMode, Provider: ComponentType<{ children: ReactNode }>) {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ModeContext.Provider value={mode}>
          <Provider>
            <App />
          </Provider>
        </ModeContext.Provider>
      </ErrorBoundary>
    </StrictMode>,
  )
}

async function boot() {
  const mode = await detectMode()
  if (mode !== 'entra') {
    render(mode, AuthProvider)
    return
  }
  try {
    // MSAL is only ever loaded here, when Microsoft sign-in is configured.
    const { createEntraProvider } = await import('./auth/EntraAuthProvider')
    render('entra', await createEntraProvider())
  } catch (err) {
    // A broken Entra setup must never blank the app — fall back.
    console.error('Microsoft sign-in setup failed; falling back:', err)
    render(await detectServerOrDemo(), AuthProvider)
  }
}

void boot()
