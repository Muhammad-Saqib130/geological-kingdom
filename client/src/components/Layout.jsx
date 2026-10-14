import { Outlet } from 'react-router-dom'
import CurrencyToggle from './CurrencyToggle.jsx'
import Header from './Header.jsx'
import Footer from './Footer.jsx'

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ivory-50 focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header actions={<CurrencyToggle />} />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
