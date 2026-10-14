import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import GemDetail from './pages/GemDetail.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import Shop from './pages/Shop.jsx'
import { useCurrency } from './store/currencyStore.js'

export default function App() {
  const loadRate = useCurrency((s) => s.loadRate)
  useEffect(() => { loadRate() }, [loadRate])

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="gems/:slug" element={<GemDetail />} />
          <Route
            path="investigation"
            element={<ComingSoon eyebrow="Gem Investigation · $10" title="Verify a gem you bought elsewhere" body="Our authenticity request form is on its way. In the meantime, contact us on WhatsApp to arrange an investigation." />}
          />
          <Route
            path="about"
            element={<ComingSoon eyebrow="Our story" title="From Namak Mandi to the world" body="The story of Geological Kingdom is being written. Check back soon." />}
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
