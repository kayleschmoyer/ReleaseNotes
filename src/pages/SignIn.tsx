import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { isDemoMode } from '../lib/config'
import { Logo, Marque } from '../components/Logo'
import { MicrosoftIcon } from '../components/icons'

export function SignIn() {
  const { user, signIn } = useAuth()
  if (user) return <Navigate to="/" replace />

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

          <button
            onClick={signIn}
            data-testid="signin-button"
            className="mt-9 inline-flex items-center gap-3 rounded-xl bg-charcoal px-6 py-3.5 text-[15px] font-semibold text-white shadow-card transition-all hover:bg-black hover:shadow-card-hover"
          >
            <MicrosoftIcon className="h-5 w-5" />
            Sign in with Microsoft
          </button>

          {isDemoMode && (
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-stone-brand">
              Demo mode — no Entra app registration configured, so you'll browse bundled sample
              data. Set <code className="font-mono">VITE_ENTRA_CLIENT_ID</code> to connect to Azure
              DevOps.
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
