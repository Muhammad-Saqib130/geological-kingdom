import { Link } from 'react-router-dom'
import { useDialog } from '../../hooks/useDialog.js'
import { cartSubtotal, useCart } from '../../store/cartStore.js'
import { BagIcon, CloseIcon } from '../icons.jsx'
import Price from '../Price.jsx'
import CartLine from './CartLine.jsx'

export default function CartDrawer() {
  const open = useCart((s) => s.drawerOpen)
  const close = useCart((s) => s.closeDrawer)
  const items = useCart((s) => s.items)
  const ref = useDialog(open, close)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-[fadein_.2s_ease] bg-ink/40" onClick={close} aria-hidden="true" />
      <aside ref={ref} role="dialog" aria-modal="true" aria-labelledby="cart-title" className="absolute inset-y-0 right-0 flex w-full max-w-md animate-[slidein-right_.25s_ease] flex-col bg-ivory-50 shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-ivory-200 px-5">
          <h2 id="cart-title" className="text-2xl">Your cart</h2>
          <button type="button" onClick={close} className="p-2 text-emerald-900" aria-label="Close cart" data-autofocus>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <BagIcon className="h-10 w-10 text-gold-500" />
            <p className="mt-4 font-serif text-2xl text-emerald-900">Your cart is empty</p>
            <p className="mt-2 text-sm text-muted">Every stone in our collection is one of a kind.</p>
            <Link to="/shop" onClick={close} className="btn-primary mt-8">Explore the collection</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ivory-200 overflow-y-auto px-5">
              {items.map((item) => (
                <CartLine key={item.productId} item={item} compact onNavigate={close} />
              ))}
            </ul>
            <div className="border-t border-ivory-200 px-5 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm uppercase tracking-[0.15em] text-muted">Subtotal</span>
                <Price pkr={cartSubtotal(items)} className="font-serif text-2xl text-emerald-900" />
              </div>
              <p className="mt-1 text-xs text-muted">Shipping and final prices are confirmed at checkout.</p>
              <div className="mt-5 grid gap-2">
                <Link to="/cart" onClick={close} className="btn-primary">View cart & checkout</Link>
                <button type="button" onClick={close} className="btn-outline">Continue shopping</button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
