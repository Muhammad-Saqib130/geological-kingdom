// Public contact details from client env (all optional).
const NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER // e.g. 923001234567

// "923001234567" -> "+92 300 1234567"
export const phoneDisplay = NUMBER ? `+${NUMBER.slice(0, 2)} ${NUMBER.slice(2, 5)} ${NUMBER.slice(5)}` : null
export const phoneHref = NUMBER ? `tel:+${NUMBER}` : null
export const email = import.meta.env.VITE_CONTACT_EMAIL || null

// Social profiles; only the ones configured are shown
export const socials = [
  { name: 'Instagram', url: import.meta.env.VITE_INSTAGRAM_URL },
  { name: 'Facebook', url: import.meta.env.VITE_FACEBOOK_URL },
  { name: 'TikTok', url: import.meta.env.VITE_TIKTOK_URL },
  { name: 'YouTube', url: import.meta.env.VITE_YOUTUBE_URL },
].filter((s) => s.url)
