import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useDialog } from '../../hooks/useDialog.js'
import { useApi } from '../../hooks/useApi.js'
import { useAuth } from '../../store/authStore.js'
import { cartCount, useCart } from '../../store/cartStore.js'
import CurrencyToggle from '../CurrencyToggle.jsx'
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from '../icons.jsx'
import Logo from '../Logo.jsx'
import SearchBox from './SearchBox.jsx'

const links = [
  { to: '/shop', label: 'Shop' },
  { to: '/investigation', label: 'Gem Investigation' },
  { to: '/about', label: 'Our Story' },
]

const navClass = ({ isActive }) =>
  `text-[13px] uppercase tracking-[0.16em] transition-colors ${isActive ? 'text-gold-600' : 'text-emerald-900 hover:text-gold-600'}`

const iconButton = 'relative inline-flex h-10 w-10 items-center justify-center text-emerald-900 hover:text-gold-600'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()
  const items = useCart((s) => s.items)
  const openDrawer = useCart((s) => s.openDrawer)
  const user = useAuth((s) => s.user)
  const count = cartCount(items)

  // Close overlays when navigating
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMenuOpen(false)
    setSearchOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ivory-200 bg-ivory-50/95 backdrop-blur supports-[backdrop-filter]:bg-ivory-50/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-20">
        <button type="button" className={`${iconButton} -ml-2 lg:hidden`} aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          <MenuIcon className="h-6 w-6" />
        </button>

        <Logo />

        <nav aria-label="Main" className="ml-8 hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchBox className="mr-2 hidden w-64 xl:block xl:w-72" />
          <button type="button" className={`${iconButton} xl:hidden`} aria-label="Search" onClick={() => setSearchOpen(true)}>
            <SearchIcon className="h-5 w-5" />
          </button>
          <div className="hidden sm:block">
            <CurrencyToggle />
          </div>
          <Link
            to={user ? (user.role === 'admin' ? '/admin/products' : '/') : '/login'}
            className={`${iconButton} hidden sm:inline-flex`}
            aria-label={user ? `Signed in as ${user.name}` : 'Sign in'}
            title={user ? user.name : 'Sign in'}
          >
            <UserIcon className="h-5 w-5" />
          </Link>
          <button type="button" className={`${iconButton} -mr-2`} onClick={openDrawer} aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
            <BagIcon className="h-6 w-6" />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-semibold text-emerald-950" aria-hidden="true">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} user={user} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}

function MobileMenu({ open, onClose, user }) {
  const ref = useDialog(open, onClose)
  const categories = useApi(open ? '/categories' : null).data?.items ?? []
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-[fadein_.2s_ease] bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-[slidein-left_.25s_ease] flex-col bg-ivory-50">
        <div className="flex h-16 items-center justify-between border-b border-ivory-200 px-4">
          <Logo />
          <button type="button" onClick={onClose} className="p-2 text-emerald-900" aria-label="Close menu" data-autofocus>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 py-6">
          <ul className="space-y-5">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} className={({ isActive }) => `font-serif text-2xl ${isActive ? 'text-gold-600' : 'text-emerald-900'}`}>{l.label}</NavLink>
              </li>
            ))}
          </ul>
          {categories.length > 0 && (
            <>
              <p className="eyebrow mt-10">Shop by gemstone</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link to={`/shop?category=${c.slug}`} className="flex items-center gap-2 text-sm text-ink hover:text-gold-600">
                      <span className="h-2.5 w-2.5 rotate-45" style={{ background: c.colorHex ?? '#c9a24b' }} aria-hidden="true" />
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
        <div className="flex items-center justify-between border-t border-ivory-200 px-6 py-4">
          <CurrencyToggle />
          <Link to={user ? (user.role === 'admin' ? '/admin/products' : '/') : '/login'} className="text-sm text-emerald-900 underline-offset-4 hover:underline">
            {user ? user.name : 'Sign in'}
          </Link>
        </div>
      </div>
    </div>
  )
}

function SearchOverlay({ open, onClose }) {
  const ref = useDialog(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <div className="absolute inset-0 animate-[fadein_.2s_ease] bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Search" className="relative animate-[slidein-top_.25s_ease] border-b border-ivory-200 bg-ivory-50 px-4 pb-6 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-start gap-3">
          <SearchBox autoFocus onDone={onClose} className="flex-1" />
          <button type="button" onClick={onClose} className="p-2 text-emerald-900" aria-label="Close search">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
