import { create } from 'zustand'
import { api } from '../lib/api.js'

// status: 'idle' (not checked yet) | 'loading' | 'ready'
export const useAuth = create((set, get) => ({
  user: null,
  status: 'idle',

  // Restores the session from the httpOnly cookie (once per page load unless forced)
  load: async ({ force = false } = {}) => {
    if (!force && get().status !== 'idle') return
    set({ status: 'loading' })
    try {
      const { user } = await api('/auth/me')
      set({ user, status: 'ready' })
    } catch {
      set({ user: null, status: 'ready' })
    }
  },

  login: async (email, password) => {
    const { user } = await api('/auth/login', { method: 'POST', json: { email, password } })
    set({ user, status: 'ready' })
    return user
  },

  logout: async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    set({ user: null, status: 'ready' })
  },
}))
