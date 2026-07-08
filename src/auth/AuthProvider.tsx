/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMode } from '../lib/mode'
import { AuthContext, type AuthContextValue, type SignInOptions } from './context'

export { useAuth } from './context'
export type { AuthContextValue, AuthUser, SignInOptions } from './context'

function DemoAuthProvider({ children }: { children: ReactNode }) {
  // Demo sign-in still walks through the sign-in page so the full flow is visible.
  const [signedIn, setSignedIn] = useState(() => sessionStorage.getItem('demo-signed-in') === '1')
  const value = useMemo<AuthContextValue>(
    () => ({
      user: signedIn ? { name: 'Demo User', email: 'demo@example.com' } : null,
      needsAccessCode: false,
      signIn: () => {
        sessionStorage.setItem('demo-signed-in', '1')
        setSignedIn(true)
      },
      signOut: () => {
        sessionStorage.removeItem('demo-signed-in')
        setSignedIn(false)
      },
      getToken: async () => 'demo-token',
    }),
    [signedIn],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

interface ServerMe {
  authRequired: boolean
  authenticated: boolean
}

function ServerAuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<ServerMe | null>(null)
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('display-name') ?? '')

  useEffect(() => {
    fetch('/api/me', { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((data: ServerMe) => setMe(data))
      .catch(() => setMe({ authRequired: true, authenticated: false }))

    // API rejected our session (server restart, expiry) — back to sign-in.
    const onUnauthorized = () =>
      setMe((m) => (m ? { ...m, authenticated: false } : { authRequired: true, authenticated: false }))
    window.addEventListener('app:unauthorized', onUnauthorized)
    return () => window.removeEventListener('app:unauthorized', onUnauthorized)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user:
        me?.authenticated === true
          ? { name: displayName || 'Vast Online user', email: 'signed in with access code' }
          : null,
      needsAccessCode: me?.authRequired ?? true,
      signIn: async ({ accessCode = '', name = '' }: SignInOptions = {}) => {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Sign-in failed. Try again.')
        }
        if (name) {
          localStorage.setItem('display-name', name)
          setDisplayName(name)
        }
        setMe((m) => ({ authRequired: m?.authRequired ?? true, authenticated: true }))
      },
      signOut: () => {
        void fetch('/api/logout', { method: 'POST' })
        setMe((m) => ({ authRequired: m?.authRequired ?? true, authenticated: false }))
      },
      getToken: async () => '',
    }),
    [me, displayName],
  )

  // Hold rendering until we know whether the user has a session.
  if (me === null) return null
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Demo/server auth only. Entra mode is handled entirely by the lazily-loaded
 * EntraAuthProvider (see main.tsx) so that no MSAL code is ever loaded — let
 * alone executed — unless Microsoft sign-in is actually configured.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = useMode()
  if (mode === 'server') return <ServerAuthProvider>{children}</ServerAuthProvider>
  return <DemoAuthProvider>{children}</DemoAuthProvider>
}
