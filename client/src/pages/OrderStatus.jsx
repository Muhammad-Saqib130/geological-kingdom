import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckIcon, WhatsAppIcon } from '../components/icons.jsx'
import StatusBadge from '../components/order/StatusBadge.jsx'
import ProductImage from '../components/product/ProductImage.jsx'
import { useApi } from '../hooks/useApi.js'
import { api, toQuery } from '../lib/api.js'
import { rememberOrder } from '../lib/deviceOrders.js'
import { countryName } from '../lib/geo.js'
import { imageUrl } from '../lib/images.js'
import { METHOD_LABELS } from '../lib/orderLabels.js'
import { uploadImage } from '../lib/upload.js'
import { useWhatsapp } from '../lib/whatsapp.js'
import { formatMoney } from '../store/currencyStore.js'
import NotFound from './NotFound.jsx'

const MANUAL = ['bank', 'jazzcash', 'easypaisa']
const STEPS = ['pending', 'paid', 'shipped', 'delivered']
const fmtDate = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function OrderStatus() {
  const { number } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') ?? undefined
  const sessionId = params.get('session_id') ?? undefined
  const [refresh, setRefresh] = useState(0)
  const [override, setOverride] = useState(null) // latest order from an action
  const { data, error, loading } = useApi(`/orders/${encodeURIComponent(number)}${toQuery({ token, session_id: sessionId })}`, refresh)
  const order = override?.orderNumber === number && override.updatedAt >= (data?.order.updatedAt ?? '') ? override : data?.order

  useEffect(() => {
    if (token) rememberOrder(number, token)
  }, [number, token])

  // Back from Stripe: the webhook may take a few seconds; check again briefly.
  const confirming = Boolean(sessionId) && order?.payment.method === 'card' && order.payment.status !== 'paid' && order.status === 'pending'
  useEffect(() => {
    if (!confirming || refresh >= 10) return
    const t = setTimeout(() => setRefresh((r) => r + 1), 2000)
    return () => clearTimeout(t)
  }, [confirming, refresh])

  if (error?.status === 404) return <NotFound />
  if (error) return <p className="mx-auto max-w-xl px-4 py-24 text-center text-muted">We couldn't load this order. Please check the link and try again.</p>
  if (!order) return <p className="py-24 text-center text-sm text-muted" role="status">{loading ? 'Loading your order…' : ''}</p>

  const placed = params.has('placed') || (sessionId && order.payment.status === 'paid')
  const query = toQuery({ token })
  const act = async (path, init) => {
    const res = await api(`/orders/${order.orderNumber}${path}${query}`, init)
    if (res.order) setOverride(res.order)
    return res
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <title>{`Order ${order.orderNumber} · Geological Kingdom`}</title>

      <header className="text-center">
        {placed && order.status !== 'cancelled' ? (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900 text-ivory-50"><CheckIcon className="h-7 w-7" strokeWidth={2} /></span>
            <h1 className="mt-5 section-title">Thank you</h1>
            <p className="section-subtitle">Order {order.orderNumber}</p>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted">A confirmation has been sent to <strong className="text-ink">{order.contact.email}</strong>.</p>
          </>
        ) : (
          <>
            <h1 className="section-title">Order {order.orderNumber}</h1>
            <p className="section-subtitle">Placed {fmtDate(order.createdAt)}</p>
          </>
        )}
      </header>

      <Progress order={order} />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <PaymentPanel order={order} act={act} token={token} confirming={confirming} cancelledReturn={params.has('cancelled')} />

          {order.tracking?.number && (
            <section className="border border-ivory-200 bg-white p-6">
              <h2 className="font-serif text-2xl uppercase tracking-[0.12em]">Tracking</h2>
              <p className="mt-2 text-sm"><span className="text-muted">{order.tracking.carrier ?? 'Courier'}:</span> <strong>{order.tracking.number}</strong></p>
            </section>
          )}

          <section className="border border-ivory-200 bg-white p-6" aria-labelledby="items">
            <h2 id="items" className="font-serif text-2xl uppercase tracking-[0.12em]">Your stones</h2>
            <ul className="mt-4 divide-y divide-ivory-200">
              {order.items.map((i) => (
                <li key={`${i.product}-${i.name}`} className="flex gap-4 py-4">
                  <Link to={`/gems/${i.slug}`} className="h-20 w-20 shrink-0 overflow-hidden bg-ivory-100">
                    <ProductImage product={{ name: i.name, carat: i.carat, colorHex: i.colorHex, images: i.image?.url ? [i.image] : [] }} width={160} sizes="80px" className="h-full w-full" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gold-600">{[i.category, i.carat && `${i.carat} ct`].filter(Boolean).join(' · ')}</p>
                    <Link to={`/gems/${i.slug}`} className="font-serif text-xl text-emerald-900 hover:text-gold-600">{i.name}</Link>
                    {i.qty > 1 && <p className="text-xs text-muted">{formatMoney(i.unitPricePKR, 'PKR')} × {i.qty}</p>}
                  </div>
                  <span className="text-sm font-medium">{formatMoney(i.lineTotalPKR, 'PKR')}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-ivory-200 bg-white p-6">
            <h2 className="font-serif text-xl uppercase tracking-[0.12em]">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(order.subtotalPKR, 'PKR')}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{order.shipping.feePKR ? formatMoney(order.shipping.feePKR, 'PKR') : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-ivory-200 pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(order.totalPKR, 'PKR')}</dd></div>
              {order.payment.method === 'card' && order.payment.chargeAmount && (
                <div className="flex justify-between text-xs text-muted"><dt>Card charge</dt><dd>{formatMoney(order.payment.chargeAmount / 100, 'USD')}</dd></div>
              )}
            </dl>
            <p className="mt-4 text-xs text-muted">Payment: {METHOD_LABELS[order.payment.method]}</p>
          </section>

          <section className="border border-ivory-200 bg-white p-6">
            <h2 className="font-serif text-xl uppercase tracking-[0.12em]">Shipping to</h2>
            <address className="mt-3 text-sm not-italic leading-relaxed text-muted">
              <span className="text-ink">{order.shippingAddress.fullName}</span><br />
              {order.shippingAddress.line1}{order.shippingAddress.line2 && <>, {order.shippingAddress.line2}</>}<br />
              {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postalCode].filter(Boolean).join(', ')}<br />
              {countryName(order.shippingAddress.country)}<br />
              {order.shippingAddress.phone}
            </address>
          </section>

          <CustomerActions order={order} act={act} />
        </aside>
      </div>
    </div>
  )
}

function Progress({ order }) {
  if (order.status === 'cancelled') {
    const last = [...order.statusHistory].reverse().find((h) => h.status === 'cancelled')
    return (
      <div className="mx-auto mt-10 max-w-2xl border border-ivory-200 bg-white px-6 py-5 text-center">
        <StatusBadge status="cancelled" />
        <p className="mt-2 text-sm text-muted">{last?.note ?? 'This order was cancelled.'}</p>
        {order.payment.needsRefund && <p className="mt-2 text-sm text-ink">Your payment arrived after the order was cancelled. We will refund it in full; we will contact you shortly.</p>}
      </div>
    )
  }
  // COD orders skip "paid" before shipping
  const steps = order.payment.method === 'cod' ? ['pending', 'shipped', 'delivered'] : STEPS
  const current = Math.max(0, steps.indexOf(order.status))
  const labels = { pending: 'Placed', paid: 'Paid', shipped: 'Shipped', delivered: 'Delivered' }

  return (
    <ol className="mx-auto mt-10 flex max-w-2xl items-start" aria-label="Order progress">
      {steps.map((s, i) => (
        <li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === current ? 'step' : undefined}>
          {i > 0 && <span className={`absolute right-1/2 top-4 h-px w-full ${i <= current ? 'bg-emerald-900' : 'bg-ivory-200'}`} aria-hidden="true" />}
          <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs ${i <= current ? 'bg-emerald-900 text-ivory-50' : 'border border-ivory-200 bg-white text-muted'}`}>
            {i < current ? <CheckIcon className="h-4 w-4" strokeWidth={2} /> : i + 1}
          </span>
          <span className={`mt-2 text-[11px] uppercase tracking-[0.16em] ${i <= current ? 'text-emerald-900' : 'text-muted'}`}>{labels[s]}</span>
        </li>
      ))}
    </ol>
  )
}

function PaymentPanel({ order, act, token, confirming, cancelledReturn }) {
  const settings = useApi(MANUAL.includes(order.payment.method) ? '/settings/checkout' : null).data
  const { method, status } = order.payment
  const box = 'border p-6'

  if (order.status === 'cancelled') return null

  if (status === 'paid') {
    return (
      <section className={`${box} border-emerald-900/20 bg-emerald-900/5`}>
        <p className="flex items-center gap-2 font-medium text-emerald-900"><CheckIcon className="h-5 w-5" strokeWidth={2} /> Payment received{order.payment.paidAt ? ` · ${fmtDate(order.payment.paidAt)}` : ''}</p>
        <p className="mt-1 text-sm text-muted">We are preparing your stones for insured shipping.</p>
      </section>
    )
  }

  if (method === 'cod') {
    return (
      <section className={`${box} border-ivory-200 bg-white`}>
        <h2 className="font-serif text-2xl uppercase tracking-[0.12em]">Cash on delivery</h2>
        <p className="mt-2 text-sm text-muted">Please keep <strong className="text-ink">{formatMoney(order.totalPKR, 'PKR')}</strong> ready in cash when your parcel arrives. We will call to confirm before dispatch.</p>
      </section>
    )
  }

  if (method === 'card') {
    return <CardPanel order={order} act={act} confirming={confirming} cancelledReturn={cancelledReturn} />
  }

  // Manual transfers
  const lastProof = order.payment.proofs.at(-1)
  const accounts = settings?.paymentAccounts?.[method] ?? {}
  const rows =
    method === 'bank'
      ? [['Bank', accounts.bankName], ['Account title', accounts.accountTitle], ['Account number', accounts.accountNumber], ['IBAN', accounts.iban]]
      : [['Account title', accounts.accountTitle], [`${METHOD_LABELS[method]} number`, accounts.number]]

  if (status === 'awaiting_review') {
    return (
      <section className={`${box} border-amber-200 bg-amber-50`}>
        <h2 className="font-serif text-2xl uppercase tracking-[0.12em]">Proof received</h2>
        <p className="mt-2 text-sm text-ink">Thank you. We are checking your payment and will confirm shortly, usually within a few hours.</p>
        {lastProof && <img src={imageUrl(lastProof.image.url, { width: 400 })} alt="Your payment screenshot" className="mt-4 max-h-48 border border-amber-200 bg-white object-contain" />}
      </section>
    )
  }

  return (
    <section className={`${box} border-gold-500/40 bg-white`} aria-labelledby="pay-heading">
      <h2 id="pay-heading" className="font-serif text-2xl uppercase tracking-[0.12em]">Complete your payment</h2>
      {status === 'rejected' && lastProof?.reason && (
        <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          We could not confirm your last screenshot: <strong>{lastProof.reason}</strong>. Please upload a new one.
        </p>
      )}
      <p className="mt-3 text-sm text-muted">
        Send <strong className="text-ink">{formatMoney(order.totalPKR, 'PKR')}</strong> by {method === 'bank' ? 'bank transfer' : METHOD_LABELS[method]} and use <strong className="text-ink">{order.orderNumber}</strong> as the reference.
        {order.expiresAt && <> Your stones are reserved until <strong className="text-ink">{fmtDate(order.expiresAt)}</strong>.</>}
      </p>
      <dl className="mt-4 divide-y divide-ivory-200 border-y border-ivory-200 bg-ivory-50 text-sm">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
            <dt className="text-muted">{k}</dt>
            <dd className="flex items-center gap-2 font-semibold tabular-nums">
              {v}
              <CopyButton text={v} label={k} />
            </dd>
          </div>
        ))}
        {!settings && <p className="h-10 animate-pulse bg-ivory-100" aria-label="Loading account details" />}
        {settings && !rows.some(([, v]) => v) && <p className="px-4 py-3 text-muted">We will send our account details on WhatsApp.</p>}
      </dl>
      <ProofUpload order={order} act={act} token={token} />
    </section>
  )
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // clipboard unavailable
        }
      }}
      className="rounded-full border border-ivory-200 px-2 py-0.5 text-[10px] font-normal uppercase tracking-[0.12em] text-muted hover:text-emerald-900"
      aria-label={`Copy ${label}`}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function ProofUpload({ order, act, token }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [reference, setReference] = useState('')
  const [state, setState] = useState({ status: 'idle', message: '', progress: 0 })

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const pick = (f) => {
    setFile(f ?? null)
    setPreview(f ? URL.createObjectURL(f) : null)
    setState({ status: 'idle', message: '', progress: 0 })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return setState({ status: 'error', message: 'Choose a screenshot of your payment', progress: 0 })
    try {
      setState({ status: 'uploading', message: '', progress: 0 })
      const image = await uploadImage(file, 'payment-proofs', {
        signPath: `/orders/${order.orderNumber}/proof/sign${toQuery({ token })}`,
        onProgress: (progress) => setState((s) => ({ ...s, progress })),
      })
      setState({ status: 'saving', message: '', progress: 1 })
      await act('/proof', { method: 'POST', json: { image, reference: reference.trim() || undefined } })
    } catch (err) {
      setState({ status: 'error', message: err.message, progress: 0 })
    }
  }

  const busy = state.status === 'uploading' || state.status === 'saving'
  return (
    <form onSubmit={submit} className="mt-6" noValidate>
      <p className="text-sm font-semibold text-ink">Then upload your payment screenshot</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-[160px_1fr]">
        <label className={`flex h-36 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed text-center text-xs text-emerald-900 sm:h-auto sm:aspect-square ${preview ? 'border-emerald-700' : 'border-ivory-200 hover:border-emerald-700'}`}>
          {preview ? <img src={preview} alt="Selected screenshot" className="h-full w-full object-contain sm:object-cover" /> : <span className="px-3">+ Choose screenshot<br /><span className="text-muted">JPG, PNG or WebP</span></span>}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,.heic" hidden onChange={(e) => pick(e.target.files[0])} aria-label="Choose payment screenshot" />
        </label>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Transaction ID (optional)</span>
            <input type="text" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} className="w-full border border-ivory-200 bg-white px-3 py-2 text-sm" placeholder="e.g. TID 1234567890" />
          </label>
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy}>
            {state.status === 'uploading' ? `Uploading ${Math.round(state.progress * 100)}%` : state.status === 'saving' ? 'Sending…' : 'Send payment proof'}
          </button>
          {state.status === 'error' && <p role="alert" className="text-sm text-red-700">{state.message}</p>}
        </div>
      </div>
    </form>
  )
}

function CardPanel({ order, act, confirming, cancelledReturn }) {
  const [state, setState] = useState({ busy: false, error: null })
  const pay = async () => {
    setState({ busy: true, error: null })
    try {
      const { checkoutUrl } = await act('/pay', { method: 'POST' })
      window.location.assign(checkoutUrl)
    } catch (err) {
      setState({ busy: false, error: err.message })
    }
  }

  if (confirming) {
    return (
      <section className="border border-ivory-200 bg-white p-6" role="status">
        <p className="flex items-center gap-3 text-sm text-ink"><span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-900 border-t-transparent" aria-hidden="true" /> Confirming your card payment…</p>
        <p className="mt-2 text-xs text-muted">This usually takes a few seconds. You can safely refresh this page.</p>
      </section>
    )
  }

  return (
    <section className="border border-gold-500/40 bg-white p-6">
      <h2 className="font-serif text-2xl uppercase tracking-[0.12em]">{cancelledReturn ? 'Payment not completed' : 'Awaiting card payment'}</h2>
      <p className="mt-2 text-sm text-muted">
        Your stones are reserved{order.expiresAt ? ` until ${fmtDate(order.expiresAt)}` : ''}. Complete the payment to confirm your order.
      </p>
      <button type="button" onClick={pay} disabled={state.busy} className="btn-primary mt-5">{state.busy ? 'Opening secure payment…' : 'Pay now by card'}</button>
      {state.error && <p role="alert" className="mt-3 text-sm text-red-700">{state.error}</p>}
    </section>
  )
}

function CustomerActions({ order, act }) {
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const canCancel = order.status === 'pending' && ['unpaid', 'rejected'].includes(order.payment.status)
  const whatsappApi = useWhatsapp()
  const help = whatsappApi.link(`Hello Geological Kingdom, I have a question about order ${order.orderNumber}.`)

  return (
    <section className="space-y-3">
      {help && (
        <a href={help} target="_blank" rel="noopener noreferrer" className="btn w-full border border-[#1f8f4e] text-[#17703d] hover:bg-[#1f8f4e] hover:text-white">
          <WhatsAppIcon className="h-5 w-5" /> Questions? WhatsApp us
        </a>
      )}
      {canCancel && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="block w-full text-center text-xs uppercase tracking-[0.15em] text-muted underline-offset-4 hover:text-red-700 hover:underline"
        >
          Cancel this order
        </button>
      )}
      {canCancel && confirming && (
        <div className="border border-red-200 bg-red-50 p-4 text-center text-sm" role="group" aria-label="Confirm cancellation">
          <p className="text-red-900">Cancel this order? The stones will be released for other buyers.</p>
          <div className="mt-3 flex justify-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await act('/cancel', { method: 'POST' })
                } finally {
                  setBusy(false)
                  setConfirming(false)
                }
              }}
              className="btn-sm border border-red-700 bg-red-700 text-white hover:bg-red-800"
            >
              {busy ? 'Cancelling…' : 'Yes, cancel'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="btn-sm border border-ivory-200 bg-white text-ink">Keep order</button>
          </div>
        </div>
      )}
      <Link to="/account/orders" className="block text-center text-xs uppercase tracking-[0.15em] text-emerald-900 underline-offset-4 hover:underline">My orders</Link>
    </section>
  )
}
