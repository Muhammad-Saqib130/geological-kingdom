import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../store/authStore.js'
import CartDrawer from '../cart/CartDrawer.jsx'
import AnnouncementBar from './AnnouncementBar.jsx'
import Footer from './Footer.jsx'
import Header from './Header.jsx'

export default function Layout() {
  const loadUser = useAuth((s) => s.load)
  useEffect(() => {
    loadUser()
  }, [loadUser])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-ivory-50 focus:px-4 focus:py-2">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  )
}
