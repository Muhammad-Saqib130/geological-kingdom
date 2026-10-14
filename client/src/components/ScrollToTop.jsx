import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Scroll to top on page change, but not when only the query string changes (shop filters).
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}
