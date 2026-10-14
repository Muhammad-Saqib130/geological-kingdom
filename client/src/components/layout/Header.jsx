import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useApi } from '../../hooks/useApi.js'
import { useDialog } from '../../hooks/useDialog.js'
import { toQuery } from '../../lib/api.js'
import { phoneDisplay } from '../../lib/contact.js'
import { whatsappLink } from '../../lib/whatsapp.js'
import { useAuth } from '../../store/authStore.js'
import { cartCount, useCart } from '../../store/cartStore.js'
import CurrencyToggle from '../CurrencyToggle.jsx'
import { BagIcon, ChevronDown, CloseIcon, MenuIcon, SearchIcon, UserIcon, WhatsAppIcon } from '../icons.jsx'
import Logo from '../Logo.jsx'
import SearchBox from './SearchBox.jsx'

const iconButton = 'relative inline-flex h-10 w-10 items-center justify-center text-emerald-900 hover:text-gold-600'
const navItem = 'inline-flex items-center gap-1 py-4 text-[12px] font-medium uppercase tracking-[0.18em] transition-colors'
const navClass = ({ isActive }) => `${navItem} ${isActive ? 'text-gold-600' : 'text-emerald-900 hover:text-gold-600'}`

function CartButton({ className = '' }) {
  const items = useCart((s) => s.items)
  const openDrawer = useCart((s) => s.openDrawer)
  const count = cartCount(items)
  return (
    <button type="button" className={`${iconButton} ${className}`} onClick={openDrawer} aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
      <BagIcon className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-semibold text-emerald-950" aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  )
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [stuck, setStuck] = useState(false)
  const logoRow = useRef(null)
  const { pathname, search } = useLocation()
  const user = useAuth((s) => s.user)
  const categories = useApi('/categories').data?.items ?? []
  const origins = useApi('/products/filters').data?.origins ?? []
  const help = whatsappLink('Hello Geological Kingdom, I would like help choosing a gemstone.')

  // Close overlays when navigating
  const [lastPath, setLastPath] = useState(pathname + search)
  if (lastPath !== pathname + search) {
    setLastPath(pathname + search)
    setMenuOpen(false)
    setSearchOpen(false)
  }

  // The desktop menu row sticks to the top; once the logo row has scrolled away it shows a mini logo and cart.
  useEffect(() => {
    const el = logoRow.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      {/* Logo row (sticky on mobile) */}
      <div ref={logoRow} className="sticky top-0 z-40 border-b border-ivory-200 bg-ivory-50/95 backdrop-blur lg:static lg:border-b-0 lg:bg-ivory-50">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 lg:h-24">
          <div className="flex items-center">
            <button type="button" className={`${iconButton} -ml-2 lg:hidden`} aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <MenuIcon className="h-6 w-6" />
            </button>
            {help && (
              <a href={help} target="_blank" rel="noopener noreferrer" className="group hidden items-center gap-3 lg:flex">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory-200 text-emerald-900 group-hover:border-gold-500 group-hover:text-gold-600">
                  <WhatsAppIcon className="h-4 w-4" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-muted">Need help choosing?</span>
                  <span className="text-sm text-emerald-900 group-hover:text-gold-600">{phoneDisplay ?? 'Chat with us'}</span>
                </span>
              </a>
            )}
          </div>

          <Logo size="lg" tagline />

          <div className="flex items-center justify-end gap-1">
            <SearchBox className="mr-1 hidden w-56 xl:block" />
            <button type="button" className={`${iconButton} xl:hidden`} aria-label="Search" onClick={() => setSearchOpen(true)}>
              <SearchIcon className="h-5 w-5" />
            </button>
            <Link
              to={user ? (user.role === 'admin' ? '/admin/products' : '/') : '/login'}
              className={`${iconButton} hidden sm:inline-flex`}
              aria-label={user ? `Signed in as ${user.name}` : 'Sign in'}
              title={user ? user.name : 'Sign in'}
            >
              <UserIcon className="h-5 w-5" />
            </Link>
            <CartButton className="-mr-2" />
          </div>
        </div>
      </div>

      {/* Menu row (desktop) */}
      <div className="sticky top-0 z-40 hidden border-y border-ivory-200 bg-ivory-50/95 backdrop-blur lg:block">
        <div className="relative mx-auto flex max-w-7xl items-center justify-center px-6">
          <div className={`absolute left-6 transition-opacity duration-300 ${stuck ? 'opacity-100' : 'pointer-events-none opacity-0'}`} aria-hidden={!stuck}>
            <Logo size="sm" />
          </div>
          <nav aria-label="Main">
            <ul className="flex items-center gap-8">
              <li><NavLink to="/" end className={navClass}>Home</NavLink></li>
              <li><NavLink to="/shop" end className={navClass}>Shop all</NavLink></li>
              <li>
                <Dropdown label="Gemstones" items={categories.map((c) => ({ key: c.id, label: c.name, to: `/shop?category=${c.slug}`, color: c.colorHex }))} all={{ label: 'All gemstones', to: '/shop' }} />
              </li>
              <li>
                <Dropdown label="Origins" items={origins.slice(0, 12).map((o) => ({ key: o, label: o, to: `/shop${toQuery({ origin: o })}` }))} />
              </li>
              <li><NavLink to="/investigation" className={navClass}>Gem Investigation</NavLink></li>
              <li><NavLink to="/about" className={navClass}>Our Story</NavLink></li>
            </ul>
          </nav>
          <div className={`absolute right-4 transition-opacity duration-300 ${stuck ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <CartButton />
          </div>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} user={user} categories={categories} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

// Hover or click to open; Escape or leaving closes. Links stay reachable by keyboard.
function Dropdown({ label, items, all }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!items.length) return null
  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(e) => e.pointerType === 'mouse' && (clearTimeout(timer.current), setOpen(true))}
      onPointerLeave={(e) => e.pointerType === 'mouse' && (timer.current = setTimeout(() => setOpen(false), 150))}
      onBlur={(e) => !ref.current?.contains(e.relatedTarget) && setOpen(false)}
    >
      <button type="button" className={`${navItem} ${open ? 'text-gold-600' : 'text-emerald-900 hover:text-gold-600'}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 animate-[fadein_.15s_ease] border border-ivory-200 bg-white py-3 shadow-xl">
          <ul>
            {items.map((i) => (
              <li key={i.key}>
                <Link to={i.to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-5 py-2 text-sm text-ink hover:bg-ivory-100 hover:text-emerald-900">
                  {i.color && <span className="h-2.5 w-2.5 rotate-45" style={{ background: i.color }} aria-hidden="true" />}
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
          {all && (
            <Link to={all.to} onClick={() => setOpen(false)} className="mx-5 mt-2 block border-t border-ivory-200 pt-3 text-[11px] uppercase tracking-[0.18em] text-gold-600 hover:text-emerald-900">
              {all.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function MobileMenu({ open, onClose, user, categories }) {
  const ref = useDialog(open, onClose)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-[fadein_.2s_ease] bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-[slidein-left_.25s_ease] flex-col bg-ivory-50">
        <div className="flex h-16 items-center justify-between border-b border-ivory-200 px-4">
          <Logo size="sm" />
          <button type="button" onClick={onClose} className="p-2 text-emerald-900" aria-label="Close menu" data-autofocus>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 py-6">
          <ul className="space-y-4">
            {[
              ['/', 'Home'],
              ['/shop', 'Shop all'],
              ['/investigation', 'Gem Investigation'],
              ['/about', 'Our Story'],
            ].map(([to, label]) => (
              <li key={to}>
                <NavLink to={to} end className={({ isActive }) => `font-serif text-2xl ${isActive ? 'text-gold-600' : 'text-emerald-900'}`}>{label}</NavLink>
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
