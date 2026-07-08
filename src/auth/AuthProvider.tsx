/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { isDemoMode } from '../lib/config'
import { ADO_SCOPES } from './msal'

export interface AuthUser {
  name: string
  email: string
}

export interface AuthContextValue {
  /** null = not signed in */
  user: AuthUser | null
  signIn: () => void
  signOut: () => void
  /** Access token for the Azure DevOps REST API. */
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
  return isDemoMode ? (
    <DemoAuthProvider>{children}</DemoAuthProvider>
  ) : (
    <MsalAuthProvider>{children}</MsalAuthProvider>
  )
}
