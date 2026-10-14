// Public contact details from client env (all optional).
// (The WhatsApp/phone number is in lib/whatsapp.js: it is editable in Admin > Settings.)
export const email = import.meta.env.VITE_CONTACT_EMAIL || null

// Social profiles; only the ones configured are shown
export const socials = [
  { name: 'Instagram', url: import.meta.env.VITE_INSTAGRAM_URL },
  { name: 'Facebook', url: import.meta.env.VITE_FACEBOOK_URL },
  { name: 'TikTok', url: import.meta.env.VITE_TIKTOK_URL },
  { name: 'YouTube', url: import.meta.env.VITE_YOUTUBE_URL },
].filter((s) => s.url)
