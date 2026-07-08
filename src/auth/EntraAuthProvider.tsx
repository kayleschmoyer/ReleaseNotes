/* eslint-disable react-refresh/only-export-components */
/**
 * Microsoft (Entra ID) sign-in. This module is loaded ONLY via dynamic import
 * when a valid app registration is configured, so MSAL never affects the
 * demo/server modes.
 */
import { useMemo, type ComponentType, type ReactNode } from 'react'
import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider, useIsAuthenticated, useMsal } from '@azure/msal-react'
import { config } from '../lib/config'
import { AuthContext, type AuthContextValue } from './context'

/**
 * Azure DevOps resource ID (fixed, first-party). Requesting this scope with
 * the signed-in user's account yields a token the Azure DevOps REST API
 * accepts, with the user's own permissions applied.
 */
const ADO_SCOPES = ['499b84ac-1321-427f-aa17-267ca6975798/user_impersonation']

function MsalAuthBridge({ children }: { children: ReactNode }) {
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

/** Initialise MSAL and return a ready-to-render provider component. */
export async function createEntraProvider(): Promise<ComponentType<{ children: ReactNode }>> {
  const msal = new PublicClientApplication({
    auth: {
      clientId: config.clientId.trim(),
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'sessionStorage' },
  })
  await msal.initialize()
  // Complete a redirect sign-in if we're returning from one.
  const result = await msal.handleRedirectPromise().catch(() => null)
  const account = result?.account ?? msal.getAllAccounts()[0]
  if (account) msal.setActiveAccount(account)

  return function EntraAuthProvider({ children }: { children: ReactNode }) {
    return (
      <MsalProvider instance={msal}>
        <MsalAuthBridge>{children}</MsalAuthBridge>
      </MsalProvider>
    )
  }
}
