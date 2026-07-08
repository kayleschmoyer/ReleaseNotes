import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Logo } from './Logo'

interface State {
  error: Error | null
}

/** Last line of defence: never show users a blank white page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected app error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-biscuit px-6 text-center">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold text-charcoal">Something broke on our side</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-brand">
          The app hit an unexpected error. Reloading usually fixes it — if it keeps happening,
          share this with whoever runs the app:
        </p>
        <code className="mt-3 max-w-lg rounded-lg bg-charcoal/5 px-3 py-2 font-mono text-xs break-all text-slate-brand">
          {this.state.error.message}
        </code>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-full bg-magenta px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-magenta-deep"
        >
          Reload
        </button>
      </div>
    )
  }
}
