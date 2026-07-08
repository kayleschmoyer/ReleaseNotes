const env = import.meta.env

export const config = {
  clientId: (env.VITE_ENTRA_CLIENT_ID as string | undefined) || '',
  tenantId: (env.VITE_ENTRA_TENANT_ID as string | undefined) || 'common',
  org: (env.VITE_ADO_ORG as string | undefined) || 'mamsoftglobal',
  project: (env.VITE_ADO_PROJECT as string | undefined) || 'vast-online',
  wiki: (env.VITE_ADO_WIKI as string | undefined) || 'vast-online.wiki',
  rootPath: (env.VITE_ADO_ROOT_PATH as string | undefined) || '/Vast Online Core',
}

/** No Entra app registration configured — run against bundled sample data. */
export const isDemoMode = !config.clientId

export const workItemUrl = (id: number) =>
  `https://dev.azure.com/${config.org}/${config.project}/_workitems/edit/${id}`
