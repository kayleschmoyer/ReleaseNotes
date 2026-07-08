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

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Server if the bundled backend answers, demo otherwise. */
export async function detectServerOrDemo(): Promise<AppMode> {
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

/** Decide the mode once at boot. */
export async function detectMode(): Promise<AppMode> {
  const clientId = config.clientId.trim()
  if (clientId) {
    if (GUID.test(clientId)) return 'entra'
    console.warn(
      `VITE_ENTRA_CLIENT_ID is set ("${clientId}") but is not a valid application (client) ID — ignoring it. ` +
        'Leave it empty unless you have an Entra app registration.',
    )
  }
  return detectServerOrDemo()
}
