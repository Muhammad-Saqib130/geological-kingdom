import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

// Fetches `path` whenever it changes; ignores stale responses.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true, path })

  if (state.path !== path) setState({ data: state.data, error: null, loading: true, path })

  useEffect(() => {
    if (!path) return
    const ctrl = new AbortController()
    api(path, { signal: ctrl.signal })
      .then((data) => setState({ data, error: null, loading: false, path }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false, path })
      })
    return () => ctrl.abort()
  }, [path])

  return state
}
