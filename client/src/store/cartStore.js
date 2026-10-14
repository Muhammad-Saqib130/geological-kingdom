import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Cart lines keep a display snapshot (name, image, price) so the drawer renders instantly.
// The snapshot is refreshed from POST /api/cart/quote; the server always re-prices at checkout.
export const useCart = create(
  persist(
    (set, get) => ({
      items: [], // { productId, slug, name, category, carat, colorHex, image, pricePKR, qty, maxQty }
      drawerOpen: false,

      add: (product, qty = 1) => {
        const maxQty = Math.max(1, product.stock ?? product.maxQty ?? 1)
        const existing = get().items.find((i) => i.productId === product.id)
        const nextQty = Math.min(maxQty, (existing?.qty ?? 0) + qty)
        const line = {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category?.name ?? product.category,
          carat: product.carat,
          colorHex: product.colorHex,
          image: product.images?.[0] ? { url: product.images[0].url, alt: product.images[0].alt } : null,
          pricePKR: product.pricePKR,
          maxQty,
          qty: nextQty,
        }
        set({
          items: existing ? get().items.map((i) => (i.productId === product.id ? line : i)) : [...get().items, line],
          drawerOpen: true,
        })
      },
      setQty: (productId, qty) =>
        set({ items: get().items.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, Math.min(i.maxQty, qty)) } : i)) }),
      remove: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
      clear: () => set({ items: [] }),

      // Applies a server quote: fresh prices/names, stock limits; unavailable lines are kept but flagged.
      applyQuote: (quote) => {
        const byId = new Map(quote.lines.map((l) => [l.productId, l]))
        set({
          items: get().items.map((i) => {
            const l = byId.get(i.productId)
            if (!l) return i
            if (!l.available) return { ...i, unavailable: l.reason }
            const { slug, name, category, carat, colorHex, image, pricePKR, maxQty, qty } = l
            return { ...i, slug, name, category, carat, colorHex, image, pricePKR, maxQty, qty, unavailable: undefined }
          }),
        })
      },

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    { name: 'gk-cart', version: 1, partialize: (s) => ({ items: s.items }) },
  ),
)

export const cartCount = (items) => items.reduce((n, i) => n + (i.unavailable ? 0 : i.qty), 0)
export const cartSubtotal = (items) => items.reduce((sum, i) => sum + (i.unavailable ? 0 : i.qty * i.pricePKR), 0)
