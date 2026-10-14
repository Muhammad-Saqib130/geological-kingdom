const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }

  // { field: message } for form validation errors, e.g. { name: 'Name is required' }
  get fieldErrors() {
    const out = {}
    for (const d of this.details ?? []) if (d?.path && !out[d.path]) out[d.path] = d.message
    return out
  }
}

export const DEMO = import.meta.env.VITE_DEMO === 'true'

// api('/products') or api('/admin/products', { method: 'POST', json: {...} })
export async function api(path, { json, headers, ...init } = {}) {
  // Demo build: answered in the browser (no server); this branch is removed from normal builds
  if (DEMO) {
    const { handle } = await import('../demo/backend.js')
    return handle(path, { method: init.method, body: json })
  }
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: 'include',
    ...init,
    headers: { ...(json !== undefined && { 'Content-Type': 'application/json' }), ...headers },
    ...(json !== undefined && { body: JSON.stringify(json) }),
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText, data?.details)
  return data
}

export const toQuery = (params) => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    // Arrays become repeated params (?origin=a&origin=b); values may contain commas
    for (const item of Array.isArray(v) ? v : [v]) qs.append(k, item)
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}
