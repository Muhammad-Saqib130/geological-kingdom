import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const MESSAGES = [
  { text: 'Natural gemstones, hand-selected in Namak Mandi, Peshawar' },
  { text: 'Origin and treatment disclosed on every stone' },
  { text: 'Bought a gem elsewhere? Verify it for $10', to: '/investigation' },
]

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 5000)
    return () => clearInterval(t)
  }, [])

  const m = MESSAGES[index]
  return (
    <div className="bg-emerald-950 text-ivory-50">
      <p key={index} className="mx-auto max-w-7xl animate-[fadein_.6s_ease] px-4 py-2 text-center text-[11px] tracking-[0.18em] uppercase sm:text-xs" aria-live="off">
        {m.to ? (
          <Link to={m.to} className="underline-offset-4 hover:text-gold-300 hover:underline">{m.text}</Link>
        ) : (
          m.text
        )}
      </p>
    </div>
  )
}
