import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api.js'

const formatters = {
  PKR: new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
}

export const useCurrency = create(
  persist(
    (set, get) => ({
      currency: 'PKR',
      pkrPerUsd: null, // loaded from the server; never persisted
      setCurrency: (currency) => set({ currency }),
      loadRate: async () => {
        try {
          const { pkrPerUsd } = await api('/settings/currency')
          set({ pkrPerUsd })
        } catch {
          // Leave null: prices fall back to PKR until the rate is known
        }
      },
      // Converts a PKR amount to the active currency
      fromPKR: (pkr) => {
        const { currency, pkrPerUsd } = get()
        return currency === 'USD' && pkrPerUsd ? pkr / pkrPerUsd : pkr
      },
      // Converts an amount typed in the active currency back to PKR (for filters)
      toPKR: (amount) => {
        const { currency, pkrPerUsd } = get()
        return currency === 'USD' && pkrPerUsd ? Math.round(amount * pkrPerUsd) : amount
      },
    }),
    { name: 'gk-currency', partialize: (s) => ({ currency: s.currency }) },
  ),
)

// The currency actually shown: USD needs a known rate.
export const useDisplayCurrency = () =>
  useCurrency((s) => (s.currency === 'USD' && s.pkrPerUsd ? 'USD' : 'PKR'))

export function formatMoney(amount, currency) {
  return formatters[currency].format(amount)
}
