import { createContext, useContext } from 'react'

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

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an auth provider')
  return ctx
}
