import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data?: T
  error?: unknown
  loading: boolean
}

/** Tiny fetch-on-mount hook with retry; ignores results from stale runs. */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ loading: true })
  const [attempt, setAttempt] = useState(0)
  const runId = useRef(0)

  useEffect(() => {
    const id = ++runId.current
    setState((s) => ({ ...s, loading: true, error: undefined }))
    fn().then(
      (data) => {
        if (runId.current === id) setState({ data, loading: false })
      },
      (error: unknown) => {
        if (runId.current === id) setState({ error, loading: false })
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { ...state, retry }
}
