import { create } from 'zustand'
import { api } from './api.js'
import { useCurrency } from '../store/currencyStore.js'

// The store's WhatsApp number comes from Admin > Settings (loaded on start). Until it loads,
// or when none is saved, the build-time VITE_WHATSAPP_NUMBER is used.
const FALLBACK = import.meta.env.VITE_WHATSAPP_NUMBER || null

const useNumber = create(() => ({ number: FALLBACK }))

// Applies store details right away (also used after the admin saves Settings)
export function setStoreInfo({ pkrPerUsd, whatsappNumber }) {
  if (pkrPerUsd) useCurrency.setState({ pkrPerUsd })
  useNumber.setState({ number: whatsappNumber || FALLBACK })
}

// Loads the public store details: exchange rate and WhatsApp number.
export async function loadStoreInfo() {
  try {
    setStoreInfo(await api('/settings/store'))
  } catch {
    // Keep the fallbacks: prices show in PKR, WhatsApp uses the build-time number
  }
}

// "923001234567" -> "+92 300 1234567" (other countries: "+<digits>")
const display = (n) => (n.startsWith('92') && n.length === 12 ? `+92 ${n.slice(2, 5)} ${n.slice(5)}` : `+${n}`)

// https://wa.me/<number>?text=<message>; link() returns null when no number is configured.
export function useWhatsapp() {
  const number = useNumber((s) => s.number)
  return {
    number,
    enabled: Boolean(number),
    display: number ? display(number) : null,
    telHref: number ? `tel:+${number}` : null,
    link: (message) => (number ? `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}` : null),
  }
}
