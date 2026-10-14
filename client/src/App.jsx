import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import Toaster from './components/Toaster.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import MyOrders from './pages/account/MyOrders.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import Home from './pages/Home.jsx'
import InfoPage from './pages/InfoPage.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import OrderStatus from './pages/OrderStatus.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Register from './pages/Register.jsx'
import Shop from './pages/Shop.jsx'
import { useCurrency } from './store/currencyStore.js'

// Admin code is split into its own bundle so shoppers never download it.
const AdminLayout = lazy(() => import('./components/admin/AdminLayout.jsx'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'))
const ProductForm = lazy(() => import('./pages/admin/ProductForm.jsx'))
const AdminHomepage = lazy(() => import('./pages/admin/AdminHomepage.jsx'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'))
const AdminOrderDetail = lazy(() => import('./pages/admin/AdminOrderDetail.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'))

const Loading = () => <p className="p-10 text-center text-sm text-muted" role="status">Loading…</p>

export default function App() {
  const loadRate = useCurrency((s) => s.loadRate)
  useEffect(() => { loadRate() }, [loadRate])

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="gems/:slug" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:number" element={<OrderStatus />} />
            <Route path="account/orders" element={<MyOrders />} />
            <Route path="register" element={<Register />} />
            <Route path="info/:slug" element={<InfoPage />} />
            <Route path="login" element={<Login />} />
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

          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminProducts />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="homepage" element={<AdminHomepage />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:number" element={<AdminOrderDetail />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </>
  )
}
