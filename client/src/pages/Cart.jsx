import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CartLine from '../components/cart/CartLine.jsx'
import { BagIcon, WhatsAppIcon } from '../components/icons.jsx'
import Price from '../components/Price.jsx'
import { api } from '../lib/api.js'
import { whatsappLink } from '../lib/whatsapp.js'
import { cartSubtotal, useCart } from '../store/cartStore.js'
import { formatMoney, useCurrency, useDisplayCurrency } from '../store/currencyStore.js'

export default function Cart() {
  const items = useCart((s) => s.items)
  const applyQuote = useCart((s) => s.applyQuote)
  const [status, setStatus] = useState('checking') // checking | ok | error
  const [notices, setNotices] = useState([])
  const currency = useDisplayCurrency()
  const fromPKR = useCurrency((s) => s.fromPKR)

  // Re-price whenever the set of products or quantities changes
  const signature = useMemo(() => items.map((i) => `${i.productId}:${i.qty}`).join(','), [items])

  useEffect(() => {
    const current = useCart.getState().items
    if (!current.length) return
    let cancelled = false
    api('/cart/quote', { method: 'POST', json: { items: current.map((i) => ({ productId: i.productId, qty: i.qty })) } })
      .then((quote) => {
        if (cancelled) return
        const before = new Map(current.map((i) => [i.productId, i]))
        const changes = []
        for (const l of quote.lines) {
          const old = before.get(l.productId)
          if (l.available && old && old.pricePKR !== l.pricePKR) changes.push(`The price of ${l.name} has changed.`)
          if (l.adjusted) changes.push(`Only ${l.qty} of ${l.name} available; quantity updated.`)
        }
        setNotices(changes)
        applyQuote(quote)
        setStatus('ok')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [signature, applyQuote])

  if (!items.length) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <title>Your cart · Geological Kingdom</title>
        <BagIcon className="mx-auto h-12 w-12 text-gold-500" />
        <h1 className="mt-6 text-5xl">Your cart is empty</h1>
        <p className="mt-3 text-muted">Find a stone you love: every one in our collection is one of a kind.</p>
        <Link to="/shop" className="btn-primary mt-8">Explore the collection</Link>
      </section>
    )
  }

  const available = items.filter((i) => !i.unavailable)
  const subtotal = cartSubtotal(items)
  const orderText = [
    'Hello Geological Kingdom, I would like to order:',
    ...available.map((i) => `• ${i.name} (${i.carat} ct)${i.qty > 1 ? ` × ${i.qty}` : ''}: ${formatMoney(i.pricePKR * i.qty, 'PKR')}`),
    `Subtotal: ${formatMoney(subtotal, 'PKR')}${currency === 'USD' ? ` (≈ ${formatMoney(fromPKR(subtotal), 'USD')})` : ''}`,
  ].join('\n')
  const whatsappOrder = whatsappLink(orderText)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <title>Your cart · Geological Kingdom</title>
      <h1 className="text-5xl">Your cart</h1>

      {notices.length > 0 && (
        <ul role="status" className="mt-6 space-y-1 border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-ink">
          {notices.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
      {status === 'error' && (
        <p role="alert" className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          We couldn't confirm current prices. Showing the prices from when you added each stone.
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-ivory-200 border-y border-ivory-200" aria-busy={status === 'checking'}>
          {items.map((item) => <CartLine key={item.productId} item={item} />)}
        </ul>

        <aside className="h-fit border border-ivory-200 bg-white p-6 lg:sticky lg:top-28" aria-labelledby="summary">
          <h2 id="summary" className="text-2xl">Order summary</h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal ({available.length} {available.length === 1 ? 'stone' : 'stones'})</dt>
              <dd><Price pkr={subtotal} className="text-ink" /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd className="text-muted">Calculated at checkout</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-ivory-200 pt-4">
              <dt className="font-medium text-ink">Estimated total</dt>
              <dd><Price pkr={subtotal} className="font-serif text-3xl text-emerald-900" /></dd>
            </div>
          </dl>
          {currency === 'USD' && <p className="mt-2 text-xs text-muted">USD shown at today's rate. Orders are priced in PKR.</p>}

          <button type="button" disabled className="btn-primary mt-6 w-full" title="Online checkout is coming soon">
            Secure checkout · coming soon
          </button>
          {whatsappOrder && available.length > 0 && (
            <a href={whatsappOrder} target="_blank" rel="noopener noreferrer" className="btn mt-3 w-full border border-[#1f8f4e] text-[#17703d] hover:bg-[#1f8f4e] hover:text-white">
              <WhatsAppIcon className="h-5 w-5" /> Order on WhatsApp
            </a>
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Until online checkout opens, send us your order on WhatsApp and we will confirm availability, shipping and payment (bank transfer, JazzCash, Easypaisa or cash on delivery in Pakistan).
          </p>
          <Link to="/shop" className="mt-6 block text-center text-xs uppercase tracking-[0.15em] text-emerald-900 underline-offset-4 hover:underline">Continue shopping</Link>
        </aside>
      </div>
    </div>
  )
}
