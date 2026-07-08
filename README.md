# Vast Online · Release Notes

A modern, enterprise release-notes portal for **Vast Online Core**. Users log in, pick a
version, and see what shipped — features, fixes, statuses and deployment notes — pulled
live from the Azure DevOps wiki. Styled to the Klipboard brand guidelines with the
Autowork One identity.

## What it does

- **Simple sign-in** — users enter an access code you choose (no Azure setup needed).
  Optional Microsoft Entra sign-in is also supported if your admin ever registers the app.
- **Version browser** — every release page under the wiki root, grouped by series (7.x, 6.x),
  newest first, filterable.
- **Beautiful release notes** — Main Changes / Minor Changes as cards with work-item links and
  **live status pills** (Done, In UAT…) fetched from the Work Items API. Anything else on the
  page (Deployment Notes, Change Log…) renders as rich markdown, so no page ever breaks.
- **Search everywhere** — press `/` and search across every release and change.
- **Filter** by type or text within a release.
- **Compare** — pick two versions and get the full rollup of everything shipped in between.
- **Share** — copy as Markdown or email-ready HTML, or print to a branded PDF.
- **Demo mode** — with nothing configured, the app runs on bundled sample data so you can
  preview the UI instantly.

## Get it running (no Azure admin needed)

The bundled Node server reads the wiki with a **Personal Access Token** — something any
Azure DevOps user can create for themselves — and gates the app behind an access code.
The token stays on the server; users never see it.

### 1. Create a PAT (2 minutes)

1. Go to `dev.azure.com/mamsoftglobal` → click your avatar (top right) → **…** →
   **User settings** → **Personal access tokens** → **New Token**
2. Name: `Release Notes`, Expiration: up to a year
3. Scopes: **Work Items (Read)** and **Code (Read)** — or *Full access* if unsure
4. Copy the token — you only see it once

### 2. Configure and run

```bash
npm install
cp .env.example .env     # set ADO_PAT=<your token> and APP_ACCESS_CODE=<pick one>
npm run build
npm start                # → http://localhost:3001
```

That's it. Share the URL and the access code with your team. It runs anywhere Node 18+
runs — your own machine, an internal VM, IIS behind a reverse proxy, a container, etc.
(A server restart signs everyone out; they just re-enter the code.)

Leave `APP_ACCESS_CODE` empty to skip the login gate entirely (e.g. on a trusted internal
network).

> **Wiki path note:** if the wiki root page path differs, adjust `ADO_ROOT_PATH` in `.env`
> — it must match the page path exactly, e.g. `/Vast-Online-Core` or `/Vast Online Core`.

### Local development

```bash
npm run dev:server       # terminal 1 — API on :3001 (reads .env)
npm run dev              # terminal 2 — UI on :5173, proxies /api to :3001
```

With no server running, `npm run dev` falls back to **demo mode** (bundled sample data).

## Optional: Microsoft Entra sign-in

If an Azure admin later registers the app (Entra ID → App registrations → SPA platform →
API permission *Azure DevOps / user_impersonation*), set `VITE_ENTRA_CLIENT_ID` and
`VITE_ENTRA_TENANT_ID` in `.env` and rebuild. The app then becomes a pure static site:
users sign in with their own Microsoft accounts, DevOps permissions apply per user, and
no server or PAT is needed. Deploy `dist/` to any static host with SPA fallback.

## Development

```bash
npm test           # unit tests (parser, version sort)
npm run lint       # eslint
npm run build      # typecheck + production build
```

### Project layout

```
server/         Node/Express server: access-code login + PAT proxy + static hosting
src/
├─ auth/        AuthProvider (demo / server / Entra) + MSAL config
├─ api/         Azure DevOps REST client + cached DataProvider
├─ lib/         parser, version sort, export, fixtures, mode detection, config
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
