const NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER

export const whatsappEnabled = Boolean(NUMBER)

// https://wa.me/<number>?text=<message>; returns null when no number is configured.
export function whatsappLink(message) {
  if (!NUMBER) return null
  return `https://wa.me/${NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
