import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useMode } from '../lib/mode'
import { Logo, Marque } from '../components/Logo'
import { MicrosoftIcon } from '../components/icons'

export function SignIn() {
  const { user, signIn, needsAccessCode } = useAuth()
  const mode = useMode()
  const [name, setName] = useState(() => localStorage.getItem('display-name') ?? '')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn({ accessCode, name: name.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-charcoal/15 bg-white px-4 py-3 text-[15px] text-charcoal placeholder:text-stone-brand focus:border-magenta'

  return (
    <div className="flex min-h-screen bg-biscuit">
      {/* Left: sign-in */}
      <div className="relative flex w-full flex-col justify-between px-8 py-10 sm:px-14 lg:w-[46%]">
        <Logo size="sm" />

        <div className="rise-in mx-auto w-full max-w-md lg:mx-0">
          <h1 className="text-4xl leading-tight font-bold tracking-tight text-charcoal sm:text-5xl">
            Release notes.
            <br />
            Finally connected.
          </h1>
          <p className="mt-5 font-mono text-sm text-slate-brand">
            {'>>'} every Vast Online Core release, in one place
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-brand">
            See what shipped in each version — new features, fixes and deployment notes — pulled
            straight from the source, always up to date.
          </p>

          {mode === 'server' ? (
            <form onSubmit={submit} className="mt-9 max-w-sm space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                aria-label="Your name"
                autoComplete="name"
                className={inputCls}
              />
              {needsAccessCode && (
                <input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Access code"
                  aria-label="Access code"
                  type="password"
                  autoComplete="current-password"
                  required
                  data-testid="access-code"
                  className={inputCls}
                />
              )}
              {error && (
                <p className="text-sm text-scarlet" role="alert" data-testid="signin-error">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                data-testid="signin-button"
                className="w-full rounded-xl bg-magenta px-6 py-3.5 text-[15px] font-semibold text-white shadow-card transition-all hover:bg-magenta-deep hover:shadow-card-hover disabled:opacity-60"
              >
                {busy ? 'Signing in…' : 'View release notes'}
              </button>
            </form>
          ) : (
            <button
              onClick={() => void signIn()}
              data-testid="signin-button"
              className="mt-9 inline-flex items-center gap-3 rounded-xl bg-charcoal px-6 py-3.5 text-[15px] font-semibold text-white shadow-card transition-all hover:bg-black hover:shadow-card-hover"
            >
              <MicrosoftIcon className="h-5 w-5" />
              Sign in with Microsoft
            </button>
          )}

          {mode === 'demo' && (
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-stone-brand">
              Demo mode — nothing configured yet, so you'll browse bundled sample data. Start the
              bundled server with an <code className="font-mono">ADO_PAT</code> to see live wiki
              content.
            </p>
          )}
        </div>

        <p className="font-mono text-xs text-stone-brand">Vast Online Core · Release Notes</p>
      </div>

      {/* Right: Living Magenta brand panel */}
      <div className="living-magenta relative hidden overflow-hidden lg:block lg:w-[54%]">
        <div className="brand-grid-light absolute inset-0" aria-hidden="true" />
        {/* Layered brand marques, per the composition guidance */}
        <Marque className="absolute top-[12%] -right-24 h-72 opacity-20" stroke="#FFFFFF" />
        <Marque className="absolute bottom-[-10%] left-[-6%] h-[28rem] opacity-15" stroke="#FFFFFF" />
        <div className="absolute right-14 bottom-14 left-14">
          <p className="text-3xl leading-snug font-bold text-white xl:text-4xl">
            Know what changed.
            <br />
            Ship with confidence.
          </p>
          <p className="mt-4 font-mono text-sm text-white/80">{'>>'} powered by your Azure DevOps wiki</p>
        </div>
      </div>
    </div>
  )
}
