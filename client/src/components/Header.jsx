import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'

const links = [
  { to: '/shop', label: 'Shop Gems' },
  { to: '/investigation', label: 'Gem Investigation' },
  { to: '/about', label: 'Our Story' },
]

const navClass = ({ isActive }) =>
  `text-sm uppercase tracking-[0.15em] transition-colors ${isActive ? 'text-gold-600' : 'text-emerald-900 hover:text-gold-600'}`

export default function Header({ actions }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-ivory-200 bg-ivory-50/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {actions}
          <button
            type="button"
            className="p-2 text-emerald-900 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-ivory-200 px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-4">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} className={navClass} onClick={() => setOpen(false)}>{l.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
