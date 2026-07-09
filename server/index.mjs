/**
 * Vast Release Notes — bundled server.
 *
 * Lets the app run with NO Azure admin involvement:
 *   - Reads the Azure DevOps wiki with a Personal Access Token (ADO_PAT),
 *     which any DevOps user can create in their own profile settings.
 *     The PAT stays on the server; browsers never see it.
 *   - Gates access behind a simple access code (APP_ACCESS_CODE) with an
 *     HttpOnly session cookie.
 *   - Serves the built SPA from dist/ with an SPA fallback.
 *
 * Run: npm run build && npm start   (reads .env if present)
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

// Load .env from the project root (works on any Node version, no dependency).
const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2')
  }
}

const PORT = Number(process.env.PORT || 3001)
const PAT = process.env.ADO_PAT || ''
const ACCESS_CODE = process.env.APP_ACCESS_CODE || ''
const ORG = process.env.ADO_ORG || 'mamsoftglobal'
const PROJECT = process.env.ADO_PROJECT || 'vast-online'
const WIKI = process.env.ADO_WIKI || 'vast-online.wiki'
const ROOT_PATH = process.env.ADO_ROOT_PATH || '/Vast Online Core'
const ADO_BASE = (process.env.ADO_BASE_URL || 'https://dev.azure.com').replace(/\/$/, '')
const API_VERSION = '7.1'

const authRequired = ACCESS_CODE.length > 0
// Sessions are a shared HMAC token; a server restart signs everyone out.
const sessionSecret = crypto.randomBytes(32)
const sessionToken = () => crypto.createHmac('sha256', sessionSecret).update('session-v1').digest('hex')

const timingSafeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

const cookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((c) => c.trim().split('='))
      .filter((p) => p.length === 2),
  )

const isAuthed = (req) => !authRequired || cookies(req).session === sessionToken()

const app = express()
app.disable('x-powered-by')
app.use(express.json())

app.post('/api/login', (req, res) => {
  if (!authRequired) return res.json({ ok: true })
  const { accessCode } = req.body || {}
  if (typeof accessCode === 'string' && accessCode && timingSafeEqual(accessCode, ACCESS_CODE)) {
    res.setHeader(
      'Set-Cookie',
      `session=${sessionToken()}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200`,
    )
    return res.json({ ok: true })
  }
  res.status(401).json({ error: "That access code isn't right. Check with your team lead." })
})

app.post('/api/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0')
  res.json({ ok: true })
})

app.get('/api/me', (req, res) => {
  res.json({
    mode: 'server',
    authRequired,
    authenticated: isAuthed(req),
    configured: Boolean(PAT),
  })
})

const requireAuth = (req, res, next) => {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Sign in required' })
  if (!PAT) {
    return res.status(503).json({
      error:
        'The server has no Azure DevOps token. Set ADO_PAT in the server environment (create one at dev.azure.com → User settings → Personal access tokens).',
    })
  }
  next()
}

async function ado(res, url) {
  try {
    const upstream = await fetch(url, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(':' + PAT).toString('base64'),
        Accept: 'application/json',
      },
    })
    if (!upstream.ok) {
      let message = `Azure DevOps request failed (${upstream.status})`
      try {
        message = (await upstream.json()).message || message
      } catch {
        /* non-JSON body */
      }
      // 401/203 from ADO usually means the PAT is wrong/expired
      const status = upstream.status === 401 || upstream.status === 203 ? 502 : upstream.status
      return res.status(status).json({
        error:
          upstream.status === 401 || upstream.status === 203
            ? 'Azure DevOps rejected the server token — the ADO_PAT is likely expired or missing scopes.'
            : message,
      })
    }
    return await upstream.json()
  } catch {
    res.status(502).json({ error: 'Could not reach Azure DevOps.' })
    return null
  }
}

const wikiApi = `${ADO_BASE}/${ORG}/${encodeURIComponent(PROJECT)}/_apis`

app.get('/api/versions', requireAuth, async (_req, res) => {
  const page = await ado(
    res,
    `${wikiApi}/wiki/wikis/${encodeURIComponent(WIKI)}/pages?path=${encodeURIComponent(ROOT_PATH)}&recursionLevel=oneLevel&api-version=${API_VERSION}`,
  )
  if (!page || res.headersSent) return
  res.json(
    (page.subPages || []).map((p) => ({
      name: (p.path || '').split('/').filter(Boolean).pop() || p.path,
      path: p.path,
      remoteUrl: p.remoteUrl,
    })),
  )
})

app.get('/api/release', requireAuth, async (req, res) => {
  const pagePath = String(req.query.path || '')
  if (!pagePath.startsWith(ROOT_PATH)) return res.status(400).json({ error: 'Invalid page path' })
  const page = await ado(
    res,
    `${wikiApi}/wiki/wikis/${encodeURIComponent(WIKI)}/pages?path=${encodeURIComponent(pagePath)}&includeContent=True&api-version=${API_VERSION}`,
  )
  if (!page || res.headersSent) return
  res.json({ content: page.content || '' })
})

app.get('/api/workitems', requireAuth, async (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0)
  if (ids.length === 0) return res.json({ value: [] })
  const value = []
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const data = await ado(
      res,
      `${wikiApi}/wit/workitems?ids=${chunk.join(',')}&fields=System.Title,System.State,System.WorkItemType&errorPolicy=omit&api-version=${API_VERSION}`,
    )
    if (!data || res.headersSent) return
    value.push(...(data.value || []))
  }
  res.json({ value })
})

app.get('/api/wiki-asset', requireAuth, async (req, res) => {
  const src = String(req.query.src || '').trim()
  if (!src) return res.status(400).json({ error: 'Missing src' })

  let target
  try {
    if (/^https?:\/\//i.test(src)) target = new URL(src)
    else if (src.startsWith('/')) target = new URL(src, `${ADO_BASE}/`)
    else return res.status(400).json({ error: 'Invalid src' })
  } catch {
    return res.status(400).json({ error: 'Invalid src' })
  }

  const adoHost = new URL(ADO_BASE).host
  if (target.host !== adoHost) {
    return res.status(400).json({ error: 'Only Azure DevOps assets are allowed' })
  }

  try {
    const authHeaders = {
      Authorization: 'Basic ' + Buffer.from(':' + PAT).toString('base64'),
      Accept: '*/*',
    }

    // Short wiki attachment paths (/.attachments/...) need to be fetched via
    // the wiki repository Items API endpoint.
    let fetchUrl = target.toString()
    const attachmentPathIndex = target.pathname.indexOf('/.attachments/')
    if (attachmentPathIndex >= 0) {
      const attachmentPath = target.pathname.slice(attachmentPathIndex)
      const wikiInfoRes = await fetch(
        `${wikiApi}/wiki/wikis/${encodeURIComponent(WIKI)}?api-version=${API_VERSION}`,
        { headers: authHeaders },
      )
      if (!wikiInfoRes.ok) {
        return res.status(wikiInfoRes.status).json({ error: `Could not resolve wiki repository (${wikiInfoRes.status})` })
      }

      const wikiInfo = await wikiInfoRes.json()
      const repoId = wikiInfo.repositoryId || wikiInfo.repository?.id
      if (!repoId) return res.status(502).json({ error: 'Wiki repository id not found' })

      const params = new URLSearchParams({
        path: attachmentPath,
        download: 'false',
        resolveLfs: 'true',
        '$format': 'octetStream',
        'api-version': API_VERSION,
        sanitize: 'true',
      })
      params.set('versionDescriptor.version', 'wikiMaster')

      fetchUrl = `${wikiApi}/git/repositories/${encodeURIComponent(repoId)}/items?${params.toString()}`
    }

    const upstream = await fetch(fetchUrl, {
      headers: {
        ...authHeaders,
      },
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Asset request failed (${upstream.status})` })
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const bytes = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.send(bytes)
  } catch {
    return res.status(502).json({ error: 'Could not load wiki asset.' })
  }
})

// ── Static SPA ──────────────────────────────────────────────────────────────
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
app.use(express.static(dist))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) {
      res
        .status(503)
        .send('App not built yet — run <code>npm run build</code> first, then restart the server.')
    }
  })
})

app.listen(PORT, () => {
  console.log(`Vast Release Notes server → http://localhost:${PORT}`)
  console.log(`  wiki      ${ADO_BASE}/${ORG}/${PROJECT} · ${WIKI} · root "${ROOT_PATH}"`)
  console.log(`  ADO token ${PAT ? 'configured' : 'MISSING — set ADO_PAT'}`)
  console.log(`  login     ${authRequired ? 'access code required' : 'open (set APP_ACCESS_CODE to require sign-in)'}`)
})
