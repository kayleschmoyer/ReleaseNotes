import { PublicClientApplication } from '@azure/msal-browser'
import { config } from '../lib/config'

/**
 * Azure DevOps resource ID (fixed, first-party). Requesting this scope with
 * the signed-in user's account yields a token the Azure DevOps REST API
 * accepts, with the user's own permissions applied.
 */
export const ADO_SCOPES = ['499b84ac-1321-427f-aa17-267ca6975798/user_impersonation']

export function createMsalInstance(): PublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  })
}
