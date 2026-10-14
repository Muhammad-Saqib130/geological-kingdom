import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { phoneDisplay, phoneHref } from '../../lib/contact.js'
import { useAuth } from '../../store/authStore.js'
import CurrencyToggle from '../CurrencyToggle.jsx'
import { PhoneIcon } from '../icons.jsx'

const MESSAGES = [
  { text: 'Natural gemstones, hand-selected in Namak Mandi, Peshawar' },
  { text: 'Origin and treatment disclosed on every stone' },
  { text: 'Bought a gem elsewhere? Verify it for $10', to: '/investigation' },
]

// Top utility bar: contact on the left, rotating message in the middle, account and currency on the right.
export default function AnnouncementBar() {
  const [index, setIndex] = useState(0)
  const user = useAuth((s) => s.user)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 5000)
    return () => clearInterval(t)
  }, [])

  const m = MESSAGES[index]
  return (
    <div className="bg-emerald-950 text-ivory-50">
      <div className="mx-auto grid max-w-7xl items-center px-4 py-2 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
        <div className="hidden lg:block">
          {phoneDisplay && (
            <a href={phoneHref} className="inline-flex items-center gap-2 text-xs text-ivory-200/80 hover:text-gold-300">
              <PhoneIcon className="h-3.5 w-3.5" /> {phoneDisplay}
            </a>
          )}
        </div>
        <p key={index} className="animate-[fadein_.6s_ease] text-center text-[11px] uppercase tracking-[0.16em] sm:text-xs">
          {m.to ? <Link to={m.to} className="underline-offset-4 hover:text-gold-300 hover:underline">{m.text}</Link> : m.text}
        </p>
        <div className="hidden items-center justify-end gap-5 lg:flex">
          <Link to={user ? (user.role === 'admin' ? '/admin/products' : '/') : '/login'} className="text-xs text-ivory-200/80 hover:text-gold-300">
            {user ? `Hello, ${user.name.split(' ')[0]}` : 'Sign in'}
          </Link>
          <CurrencyToggle dark />
        </div>
      </div>
    </div>
  )
}
