# Vast Online · Release Notes

A modern, enterprise release-notes portal for **Vast Online Core**. Users sign in with
Microsoft, pick a version, and see what shipped — features, fixes, statuses and deployment
notes — pulled live from the Azure DevOps wiki. Styled to the Klipboard brand guidelines
with the Autowork One identity.

## What it does

- **Microsoft sign-in** (Entra ID / MSAL). The app calls Azure DevOps with the *signed-in
  user's own token*, so wiki permissions apply per user and there are no secrets to host.
- **Version browser** — every release page under the wiki root, grouped by series (7.x, 6.x),
  newest first, filterable.
- **Beautiful release notes** — Main Changes / Minor Changes as cards with work-item links and
  **live status pills** (Done, In UAT…) fetched from the Work Items API. Anything else on the
  page (Deployment Notes, Change Log…) renders as rich markdown, so no page ever breaks.
- **Search everywhere** — press `/` and search across every release and change.
- **Filter** by type or text within a release.
- **Compare** — pick two versions and get the full rollup of everything shipped in between.
- **Share** — copy as Markdown or email-ready HTML, or print to a branded PDF.
- **Demo mode** — with no Entra app configured, the app runs on bundled sample data so you can
  preview the UI instantly.

## Quick start (demo mode)

```bash
npm install
npm run dev        # http://localhost:5173 — sample data, no sign-in needed
```

## Connecting to Azure DevOps (production)

### 1. Register the Entra app (one-time, Azure admin)

1. **Azure Portal → Microsoft Entra ID → App registrations → New registration**
   - Name: `Vast Release Notes`
   - Supported account types: *Accounts in this organizational directory only*
   - Platform: **Single-page application (SPA)** with redirect URIs
     `http://localhost:5173` and your production URL
2. **API permissions → Add a permission → Azure DevOps → Delegated →
   `user_impersonation`**, then **Grant admin consent**
3. Copy the **Application (client) ID** and **Directory (tenant) ID**

### 2. Configure

```bash
cp .env.example .env
# set VITE_ENTRA_CLIENT_ID and VITE_ENTRA_TENANT_ID
```

The wiki source is also configurable there (`VITE_ADO_ORG`, `VITE_ADO_PROJECT`,
`VITE_ADO_WIKI`, `VITE_ADO_ROOT_PATH`) — defaults point at
`mamsoftglobal / vast-online / vast-online.wiki / "Vast Online Core"`.

> If the root page path differs (check the `path` shown by the wiki API), adjust
> `VITE_ADO_ROOT_PATH`. It must match the wiki page path exactly, e.g. `/Vast-Online-Core`
> or `/Vast Online Core`.

### 3. Build & deploy

```bash
npm run build      # static output in dist/
```

Deploy `dist/` to any static host (Azure Static Web Apps, App Service, IIS, nginx).
Configure SPA fallback so unknown routes serve `index.html`, and add the production URL
to the app registration's redirect URIs.

Users need **read access to the Azure DevOps wiki** to see notes — the app surfaces a
friendly "ask for access" screen otherwise.

## Development

```bash
npm run dev        # dev server
npm test           # unit tests (parser, version sort)
npm run lint       # eslint
npm run build      # typecheck + production build
```

### Project layout

```
src/
├─ auth/        MSAL config + AuthProvider (demo/live)
├─ api/         Azure DevOps REST client + cached DataProvider
├─ lib/         parser, version sort, export, fixtures, config
├─ components/  Logo, ItemCard, StatusPill, sidebar, search, icons…
├─ pages/       SignIn, AppShell, Release, Compare
└─ styles/      Tailwind theme with the brand design tokens
```

### Brand

Design tokens follow the Klipboard Brand Guidelines v2.0: Klipboard Magenta `#ED017F`,
Deep Magenta `#C40170`, Charcoal `#333333`, Biscuit `#F2F3EF` plus the supporting palette;
Inter for UI text, monospace call-outs, Living Magenta gradients and the grid texture.
The Autowork One logo is recreated in `src/components/Logo.tsx` — drop in the official
asset there when available.
