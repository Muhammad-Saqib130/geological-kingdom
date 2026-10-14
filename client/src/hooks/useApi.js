import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

// Fetches `path` whenever it (or `refreshKey`) changes; ignores stale responses.
// Pass a counter as refreshKey to refetch the same path after a mutation.
export function useApi(path, refreshKey = 0) {
  const key = `${path}#${refreshKey}`
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path), key })

  if (state.key !== key) setState({ data: state.data, error: null, loading: Boolean(path), key })

  useEffect(() => {
    if (!path) return
    const ctrl = new AbortController()
    api(path, { signal: ctrl.signal })
      .then((data) => setState({ data, error: null, loading: false, key }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false, key })
      })
    return () => ctrl.abort()
  }, [path, key])

  return state
}
