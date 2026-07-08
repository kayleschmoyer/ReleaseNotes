import { createContext, useContext } from 'react'
import { config } from './config'

/**
 * How the app talks to Azure DevOps:
 *  - 'entra'  — Microsoft sign-in (MSAL); the user's own token calls ADO directly.
 *               Requires an Entra app registration (VITE_ENTRA_CLIENT_ID).
 *  - 'server' — the bundled Node server proxies ADO with a PAT and gates access
 *               with an access code. No Azure admin needed.
 *  - 'demo'   — no configuration at all; bundled sample data.
 */
export type AppMode = 'demo' | 'server' | 'entra'

export const ModeContext = createContext<AppMode>('demo')
export const useMode = () => useContext(ModeContext)

/** Decide the mode once at boot. */
export async function detectMode(): Promise<AppMode> {
  if (config.clientId) return 'entra'
  try {
    const res = await fetch('/api/me', { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const me = (await res.json()) as { mode?: string }
      if (me.mode === 'server') return 'server'
    }
  } catch {
    // No backend answering — fall through to demo.
  }
  return 'demo'
}
