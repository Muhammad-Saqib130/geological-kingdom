import { create } from 'zustand'

let nextId = 1

export const useToasts = create((set, get) => ({
  toasts: [],
  // tone: 'success' | 'error' | 'info'
  push: (message, tone = 'success') => {
    const id = nextId++
    set({ toasts: [...get().toasts, { id, message, tone }] })
    setTimeout(() => get().dismiss(id), tone === 'error' ? 7000 : 4000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = {
  success: (m) => useToasts.getState().push(m, 'success'),
  error: (m) => useToasts.getState().push(m, 'error'),
  info: (m) => useToasts.getState().push(m, 'info'),
}
