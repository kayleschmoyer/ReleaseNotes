/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useMode } from '../lib/mode'
import { ADO_SCOPES } from './msal'

export interface AuthUser {
  name: string
  email: string
}

export interface SignInOptions {
  /** Access code, used in server mode. */
  accessCode?: string
  /** Display name to remember, used in server mode. */
  name?: string
}

export interface AuthContextValue {
  /** null = not signed in */
  user: AuthUser | null
  /** Whether the sign-in form needs an access code (server mode only). */
  needsAccessCode: boolean
  /** Throws with a friendly message when sign-in fails. */
  signIn: (opts?: SignInOptions) => void | Promise<void>
  signOut: () => void
  /** Access token for the Azure DevOps REST API (entra mode). */
  getToken: () => Promise<string>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

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

function MsalAuthProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  const value = useMemo<AuthContextValue>(() => {
    const account = accounts[0] ?? null
    return {
      user:
        isAuthenticated && account
          ? { name: account.name ?? account.username, email: account.username }
          : null,
      needsAccessCode: false,
      signIn: () => {
        void instance.loginRedirect({ scopes: ADO_SCOPES })
      },
      signOut: () => {
        void instance.logoutRedirect()
      },
      getToken: async () => {
        if (!account) throw new Error('Not signed in')
        try {
          const result = await instance.acquireTokenSilent({ scopes: ADO_SCOPES, account })
          return result.accessToken
        } catch (err) {
          if (err instanceof InteractionRequiredAuthError) {
            await instance.acquireTokenRedirect({ scopes: ADO_SCOPES, account })
          }
          throw err
        }
      },
    }
  }, [instance, accounts, isAuthenticated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = useMode()
  if (mode === 'entra') return <MsalAuthProvider>{children}</MsalAuthProvider>
  if (mode === 'server') return <ServerAuthProvider>{children}</ServerAuthProvider>
  return <DemoAuthProvider>{children}</DemoAuthProvider>
}
