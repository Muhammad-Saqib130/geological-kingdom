import { create } from 'zustand'
import { api } from '../lib/api.js'

// Bumped on every sign-in, sign-up and sign-out, so a session check that started earlier
// cannot overwrite the newer state when it finally answers.
let generation = 0

// status: 'idle' (not checked yet) | 'loading' | 'ready'
export const useAuth = create((set, get) => ({
  user: null,
  status: 'idle',

  // Restores the session from the httpOnly cookie (once per page load unless forced).
  // /auth/session answers 200 { user: null } for guests, so no console error per visit.
  load: async ({ force = false } = {}) => {
    if (!force && get().status !== 'idle') return
    const started = generation
    set({ status: 'loading' })
    let user = null
    try {
      ;({ user } = await api('/auth/session'))
    } catch {
      user = null
    }
    if (started === generation) set({ user, status: 'ready' })
  },

  login: async (email, password) => {
    const { user } = await api('/auth/login', { method: 'POST', json: { email, password } })
    generation += 1
    set({ user, status: 'ready' })
    return user
  },

  register: async (fields) => {
    const { user } = await api('/auth/register', { method: 'POST', json: fields })
    generation += 1
    set({ user, status: 'ready' })
    return user
  },

  logout: async () => {
    generation += 1
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    set({ user: null, status: 'ready' })
  },
}))
