import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SelectField, TextArea, TextField } from '../components/admin/form.jsx'
import { BagIcon, CertificateIcon, ShieldIcon, TruckIcon } from '../components/icons.jsx'
import Price from '../components/Price.jsx'
import ProductImage from '../components/product/ProductImage.jsx'
import { useApi } from '../hooks/useApi.js'
import { api } from '../lib/api.js'
import { rememberOrder } from '../lib/deviceOrders.js'
import { COUNTRIES, PK_PROVINCES } from '../lib/geo.js'
import { useAuth } from '../store/authStore.js'
import { useCart } from '../store/cartStore.js'
import { formatMoney } from '../store/currencyStore.js'

const DRAFT_KEY = 'gk-checkout'
const EMPTY = {
  contact: { name: '', email: '', phone: '' },
  address: { fullName: '', phone: '', line1: '', line2: '', city: '', province: '', postalCode: '', country: 'PK' },
  paymentMethod: '',
  notes: '',
  sameRecipient: true, // deliver to the contact person
}

const METHODS = [
  { key: 'cod', title: 'Cash on delivery', body: 'Pay in cash when your parcel arrives. Pakistan only.' },
  { key: 'bank', title: 'Bank transfer', body: 'Transfer to our bank account, then upload a screenshot.' },
  { key: 'jazzcash', title: 'JazzCash', body: 'Send to our JazzCash account, then upload a screenshot.' },
  { key: 'easypaisa', title: 'Easypaisa', body: 'Send to our Easypaisa account, then upload a screenshot.' },
  { key: 'card', title: 'Credit or debit card', body: 'Pay securely with Stripe. Charged in US dollars.' },
]

function loadDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null')
    return d ? { ...EMPTY, ...d, contact: { ...EMPTY.contact, ...d.contact }, address: { ...EMPTY.address, ...d.address } } : EMPTY
  } catch {
    return EMPTY
  }
}

// Server field paths -> form keys, e.g. "shippingAddress.city" -> "address.city"
const fieldKey = (path) => path.replace(/^shippingAddress\./, 'address.')

function clientErrors(f) {
  const e = {}
  const req = (key, value, msg) => !String(value ?? '').trim() && (e[key] = msg)
  req('contact.email', f.contact.email, 'Enter your email')
  if (f.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact.email.trim())) e['contact.email'] = 'Enter a valid email address'
  req('contact.name', f.contact.name, 'Enter your name')
  req('contact.phone', f.contact.phone, 'Enter a phone number')
  if (!f.sameRecipient) {
    req('address.fullName', f.address.fullName, 'Enter the recipient’s name')
    req('address.phone', f.address.phone, 'Enter a phone number for delivery')
  }
  req('address.line1', f.address.line1, 'Enter the street address')
  req('address.city', f.address.city, 'Enter the city')
  if (f.address.country === 'PK') req('address.province', f.address.province, 'Choose a province')
  if (!f.paymentMethod) e.paymentMethod = 'Choose how you would like to pay'
  return e
}

export default function Checkout() {
  const navigate = useNavigate()
  const items = useCart((s) => s.items)
  const clearCart = useCart((s) => s.clear)
  const user = useAuth((s) => s.user)
  const settings = useApi('/settings/checkout').data
  const [form, setForm] = useState(loadDraft)
  const [errors, setErrors] = useState({})
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [quoteKey, setQuoteKey] = useState(0)
  const [placed, setPlaced] = useState(false) // keeps the page from flashing 'empty cart' after ordering

  const cartItems = useMemo(() => items.filter((i) => !i.unavailable).map((i) => ({ productId: i.productId, qty: i.qty })), [items])
  const signature = cartItems.map((i) => `${i.productId}:${i.qty}`).join(',')
  const country = form.address.country

  // Prefill contact details for signed-in customers
  const [prefilled, setPrefilled] = useState(false)
  if (user && !prefilled) {
    setPrefilled(true)
    setForm((f) => ({ ...f, contact: { ...f.contact, name: f.contact.name || user.name, email: f.contact.email || user.email, phone: f.contact.phone || user.phone || '' } }))
  }

  // Keep a draft for this tab (e.g. when coming back from the card page)
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    } catch {
      // ignore
    }
  }, [form])

  // Server quote whenever the cart or destination changes
  useEffect(() => {
    if (!cartItems.length) return
    let cancelled = false
    api('/checkout/quote', { method: 'POST', json: { items: cartItems, country } })
      .then((q) => !cancelled && (setQuote(q), setQuoteError(null)))
      .catch((err) => !cancelled && setQuoteError(err.message))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, country, quoteKey])

  // COD is Pakistan-only; card only when the store has Stripe configured
  const available = (key) => (key === 'cod' ? country === 'PK' : key === 'card' ? Boolean(settings?.methods.card) : true)
  if (form.paymentMethod && settings && !available(form.paymentMethod)) {
    setForm((f) => ({ ...f, paymentMethod: '' }))
  }

  const set = (group, key) => (e) => {
    const value = e.target.value
    setForm((f) => (group ? { ...f, [group]: { ...f[group], [key]: value } } : { ...f, [key]: value }))
    const errKey = group ? `${group}.${key}` : key
    if (errors[errKey]) setErrors(({ [errKey]: _removed, ...rest }) => rest)
  }

  const focusFirst = (errs) => {
    const first = Object.keys(errs)[0]
    if (first) requestAnimationFrame(() => document.querySelector(`[data-field="${first}"] input, [data-field="${first}"] select, [data-field="${first}"] textarea`)?.focus())
  }

  const placeOrder = async (e) => {
    e.preventDefault()
    const errs = clientErrors(form)
    setErrors(errs)
    setNotice(null)
    if (Object.keys(errs).length) return focusFirst(errs)
    if (!quote || quote.unavailable.length) return setNotice({ tone: 'error', text: 'Please remove unavailable items before placing your order.' })

    setPlacing(true)
    try {
      const { contact, paymentMethod, notes, sameRecipient } = form
      const address = sameRecipient ? { ...form.address, fullName: contact.name, phone: contact.phone } : form.address
      const res = await api('/orders', {
        method: 'POST',
        json: {
          items: cartItems,
          contact,
          shippingAddress: { ...address, line2: address.line2 || undefined, postalCode: address.postalCode || undefined, province: address.province || undefined },
          paymentMethod,
          notes: notes.trim() || undefined,
          expectedTotalPKR: quote.totalPKR,
        },
      })
      setPlaced(true)
      rememberOrder(res.orderNumber, res.token)
      clearCart()
      sessionStorage.removeItem(DRAFT_KEY)
      if (res.checkoutUrl) window.location.assign(res.checkoutUrl)
      else navigate(`/order/${res.orderNumber}?token=${encodeURIComponent(res.token)}&placed=1`, { replace: true })
    } catch (err) {
      if (err.status === 409) {
        setQuoteKey((k) => k + 1) // refresh prices and availability
        setNotice({ tone: 'error', text: err.message })
      } else if (err.status === 400 && err.details?.length) {
        // Recipient errors belong to the contact fields when delivering to the contact person
        const remap = (k) => (form.sameRecipient ? { 'address.fullName': 'contact.name', 'address.phone': 'contact.phone' }[k] ?? k : k)
        const fieldErrs = Object.fromEntries(err.details.map((d) => [remap(fieldKey(d.path)), d.message]))
        setErrors(fieldErrs)
        focusFirst(fieldErrs)
      } else {
        setNotice({ tone: 'error', text: err.message })
      }
    } finally {
      setPlacing(false)
    }
  }

  if (!items.length && !placed) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <title>Checkout · Geological Kingdom</title>
        <BagIcon className="mx-auto h-12 w-12 text-gold-500" />
        <h1 className="mt-6 section-title">Your cart is empty</h1>
        <Link to="/shop" className="btn-primary mt-8">Explore the collection</Link>
      </section>
    )
  }

  const err = (k) => errors[k]
  const usd = quote && settings ? formatMoney(quote.totalPKR / quote.pkrPerUsd, 'USD') : null
  const method = form.paymentMethod

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <title>Checkout · Geological Kingdom</title>
      <h1 className="section-title">Checkout</h1>
      <span className="mx-auto mt-5 block h-px w-14 bg-gold-500" aria-hidden="true" />

      {notice && (
        <p role="alert" className={`mx-auto mt-8 max-w-3xl border px-4 py-3 text-sm ${notice.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-gold-500/40 bg-gold-500/10'}`}>
          {notice.text}
        </p>
      )}

      <form onSubmit={placeOrder} noValidate className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <Step n={1} title="Contact">
            {!user && (
              <p className="-mt-2 mb-5 text-sm text-muted">
                Have an account? <Link to="/login?next=/checkout" className="text-emerald-900 underline underline-offset-4">Sign in</Link> to see this order in My orders. Or continue as a guest.
              </p>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <div data-field="contact.email" className="sm:col-span-2">
                <TextField label="Email" type="email" autoComplete="email" required value={form.contact.email} onChange={set('contact', 'email')} error={err('contact.email')} hint="We send your order confirmation here" />
              </div>
              <div data-field="contact.name">
                <TextField label="Full name" autoComplete="name" required value={form.contact.name} onChange={set('contact', 'name')} error={err('contact.name')} />
              </div>
              <div data-field="contact.phone">
                <TextField label="Phone / WhatsApp" type="tel" autoComplete="tel" required value={form.contact.phone} onChange={set('contact', 'phone')} error={err('contact.phone')} placeholder="+92 300 1234567" />
              </div>
            </div>
          </Step>

          <Step n={2} title="Shipping address">
            <div className="grid gap-5 sm:grid-cols-2">
              <div data-field="address.country" className="sm:col-span-2">
                <SelectField label="Country" required value={country} onChange={set('address', 'country')} error={err('address.country')} options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.sameRecipient} onChange={(e) => setForm((f) => ({ ...f, sameRecipient: e.target.checked }))} className="h-4 w-4 accent-emerald-900" />
                Deliver to me{form.contact.name ? ` (${form.contact.name})` : ''}
              </label>
              {!form.sameRecipient && (
                <>
                  <div data-field="address.fullName">
                    <TextField label="Recipient name" autoComplete="shipping name" required value={form.address.fullName} onChange={set('address', 'fullName')} error={err('address.fullName')} />
                  </div>
                  <div data-field="address.phone">
                    <TextField label="Recipient phone" type="tel" autoComplete="shipping tel" required value={form.address.phone} onChange={set('address', 'phone')} error={err('address.phone')} hint="For the courier" />
                  </div>
                </>
              )}
              <div data-field="address.line1" className="sm:col-span-2">
                <TextField label="Address" autoComplete="shipping address-line1" required value={form.address.line1} onChange={set('address', 'line1')} error={err('address.line1')} placeholder="House / street" />
              </div>
              <div data-field="address.line2" className="sm:col-span-2">
                <TextField label="Apartment, area, landmark (optional)" autoComplete="shipping address-line2" value={form.address.line2} onChange={set('address', 'line2')} error={err('address.line2')} />
              </div>
              <div data-field="address.city">
                <TextField label="City" autoComplete="shipping address-level2" required value={form.address.city} onChange={set('address', 'city')} error={err('address.city')} />
              </div>
              <div data-field="address.province">
                {country === 'PK' ? (
                  <SelectField label="Province" required value={form.address.province} onChange={set('address', 'province')} error={err('address.province')} placeholder="Choose…" options={PK_PROVINCES.map((p) => ({ value: p, label: p }))} />
                ) : (
                  <TextField label="State / region" autoComplete="shipping address-level1" value={form.address.province} onChange={set('address', 'province')} error={err('address.province')} />
                )}
              </div>
              <div data-field="address.postalCode">
                <TextField label="Postal code" autoComplete="shipping postal-code" value={form.address.postalCode} onChange={set('address', 'postalCode')} error={err('address.postalCode')} />
              </div>
            </div>
          </Step>

          <Step n={3} title="Payment">
            <fieldset data-field="paymentMethod">
              <legend className="sr-only">Payment method</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {METHODS.filter((m) => m.key !== 'card' || settings?.methods.card).map((m) => {
                  const ok = available(m.key)
                  const checked = method === m.key
                  return (
                    <label
                      key={m.key}
                      className={`relative flex cursor-pointer gap-3 border p-4 transition-colors ${checked ? 'border-emerald-900 bg-emerald-900/5' : 'border-ivory-200 bg-white hover:border-emerald-700'} ${ok ? '' : 'cursor-not-allowed opacity-50'}`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={m.key}
                        checked={checked}
                        disabled={!ok}
                        onChange={() => {
                          setForm((f) => ({ ...f, paymentMethod: m.key }))
                          setErrors(({ paymentMethod: _removed, ...rest }) => rest)
                        }}
                        className="mt-1 h-4 w-4 accent-emerald-900"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{m.title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                          {m.key === 'cod' && !ok ? 'Available for deliveries within Pakistan.' : m.body}
                          {m.key === 'card' && usd && ` About ${usd}.`}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
              {err('paymentMethod') && <p className="mt-2 text-xs text-red-700">{err('paymentMethod')}</p>}
              {['bank', 'jazzcash', 'easypaisa'].includes(method) && (
                <p className="mt-4 border-l-2 border-gold-500 bg-ivory-100 px-4 py-3 text-sm text-muted">
                  After you place the order we show our account details and email them to you. Your stones are reserved for {settings?.holdHours.manual ?? 48} hours while you transfer and upload a screenshot.
                </p>
              )}
            </fieldset>
          </Step>

          <Step n={4} title="Notes (optional)">
            <div data-field="notes">
              <TextArea label="Anything we should know?" maxLength={500} value={form.notes} onChange={set(null, 'notes')} placeholder="Gift wrapping, delivery instructions…" className="[&_textarea]:min-h-24" />
            </div>
          </Step>
        </div>

        <aside className="h-fit border border-ivory-200 bg-white p-6 lg:sticky lg:top-20" aria-labelledby="summary">
          <h2 id="summary" className="font-serif text-2xl uppercase tracking-[0.12em]">Order summary</h2>
          <ul className="mt-5 divide-y divide-ivory-200">
            {items.map((i) => {
              const gone = quote?.unavailable.find((u) => u.productId === i.productId)
              return (
                <li key={i.productId} className="flex gap-3 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden bg-ivory-100">
                    <ProductImage product={{ name: i.name, carat: i.carat, colorHex: i.colorHex, images: i.image ? [i.image] : [] }} width={160} sizes="64px" className={`h-full w-full ${gone || i.unavailable ? 'opacity-40 grayscale' : ''}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-lg text-emerald-900">{i.name}</p>
                    <p className="text-xs text-muted">{[i.carat && `${i.carat} ct`, i.qty > 1 && `× ${i.qty}`].filter(Boolean).join(' · ')}</p>
                    {(gone || i.unavailable) && (
                      <p className="text-xs text-red-700">
                        No longer available ·{' '}
                        <button type="button" className="underline" onClick={() => useCart.getState().remove(i.productId)}>Remove</button>
                      </p>
                    )}
                  </div>
                  <Price pkr={i.pricePKR * i.qty} className="shrink-0 text-sm text-ink" />
                </li>
              )
            })}
          </ul>

          {quoteError && <p className="mt-3 text-sm text-red-700">{quoteError}</p>}
          <dl className="mt-4 space-y-2 border-t border-ivory-200 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{quote ? <Price pkr={quote.subtotalPKR} /> : '…'}</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping {quote && <span className="text-xs">({quote.shipping.zone === 'domestic' ? 'Pakistan' : 'international'})</span>}</dt>
              <dd>{quote ? (quote.shipping.feePKR ? <Price pkr={quote.shipping.feePKR} /> : <span className="text-emerald-800">Free</span>) : '…'}</dd>
            </div>
            {quote?.shipping.zone === 'domestic' && settings?.shipping.freeDomesticOverPKR > 0 && !quote.shipping.free && (
              <p className="text-xs text-muted">Free shipping in Pakistan on orders over {formatMoney(settings.shipping.freeDomesticOverPKR, 'PKR')}.</p>
            )}
            <div className="flex items-baseline justify-between border-t border-ivory-200 pt-3">
              <dt className="font-medium">Total</dt>
              <dd>{quote ? <Price pkr={quote.totalPKR} className="font-serif text-3xl text-emerald-900" /> : '…'}</dd>
            </div>
            {method === 'card' && usd && <p className="text-right text-xs text-muted">Charged in USD: about {usd}</p>}
          </dl>

          <button type="submit" className="btn-primary mt-6 w-full" disabled={placing || !quote}>
            {placing ? 'Placing order…' : method === 'card' ? 'Continue to card payment' : 'Place order'}
          </button>
          <ul className="mt-6 space-y-2 text-xs text-muted">
            <li className="flex items-center gap-2"><ShieldIcon className="h-4 w-4 text-gold-600" /> Prices confirmed by our server at checkout</li>
            <li className="flex items-center gap-2"><TruckIcon className="h-4 w-4 text-gold-600" /> Insured, tracked shipping</li>
            <li className="flex items-center gap-2"><CertificateIcon className="h-4 w-4 text-gold-600" /> Origin and treatment disclosed</li>
          </ul>
        </aside>
      </form>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <section aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-5 flex items-center gap-3 font-serif text-2xl uppercase tracking-[0.12em]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900 font-sans text-sm text-ivory-50">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}
