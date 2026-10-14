// Guest orders placed on this device, so "My orders" can show them without an account.
const KEY = 'gk-orders'
const MAX = 20

export function rememberOrder(orderNumber, token) {
  if (!orderNumber || !token) return
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]').filter((o) => o.orderNumber !== orderNumber)
    list.unshift({ orderNumber, token, savedAt: Date.now() })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    // storage unavailable (private mode): the emailed link still works
  }
}

export function deviceOrders() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export const orderLink = (orderNumber, token) => `/order/${orderNumber}${token ? `?token=${encodeURIComponent(token)}` : ''}`
