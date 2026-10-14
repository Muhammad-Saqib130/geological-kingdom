import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/authStore.js'
import Logo from '../Logo.jsx'

const nav = [
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/homepage', label: 'Homepage' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout() {
  const { user, status, load, logout } = useAuth()
  const location = useLocation()

  useEffect(() => {
    load()
  }, [load])

  if (status !== 'ready') {
    return <p className="p-10 text-center text-sm text-muted" role="status">Checking your session…</p>
  }
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  if (user.role !== 'admin') {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl">Admins only</h1>
        <p className="mt-3 text-muted">You are signed in as {user.email}, which does not have access to the admin panel.</p>
        <Link to="/" className="btn-outline mt-8">Back to the store</Link>
      </section>
    )
  }

  return (
    // Admin keeps square buttons (storefront buttons are pills)
    <div className="min-h-dvh bg-ivory-100" style={{ '--btn-radius': 0 }}>
      <header className="sticky top-0 z-40 border-b border-ivory-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
          <Logo />
          <span className="hidden text-xs uppercase tracking-[0.2em] text-gold-600 sm:inline">Admin</span>
          <nav aria-label="Admin" className="flex flex-1 gap-5">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `text-sm ${isActive ? 'font-semibold text-emerald-900' : 'text-muted hover:text-emerald-900'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Link to="/" className="hidden text-sm text-muted hover:text-emerald-900 sm:inline">View store</Link>
          <button type="button" onClick={logout} className="whitespace-nowrap text-sm text-muted hover:text-emerald-900">Sign out</button>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
