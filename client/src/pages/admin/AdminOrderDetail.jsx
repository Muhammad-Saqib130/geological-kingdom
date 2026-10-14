import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../components/admin/form.jsx'
import ProductImage from '../../components/product/ProductImage.jsx'
import StatusBadge from '../../components/order/StatusBadge.jsx'
import { useApi } from '../../hooks/useApi.js'
import { api } from '../../lib/api.js'
import { countryName } from '../../lib/geo.js'
import { imageUrl } from '../../lib/images.js'
import { METHOD_LABELS, STATUS_LABELS } from '../../lib/orderLabels.js'
import { formatMoney } from '../../store/currencyStore.js'
import { toast } from '../../store/toastStore.js'

// Mirrors server TRANSITIONS (pending -> shipped only for cash on delivery)
const NEXT = { pending: ['paid', 'shipped', 'cancelled'], paid: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] }
const fmt = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AdminOrderDetail() {
  const { number } = useParams()
  const [refresh, setRefresh] = useState(0)
  const [override, setOverride] = useState(null)
  const { data, error } = useApi(`/admin/orders/${number}`, refresh)
  const order = override?.orderNumber === number ? override : data?.order

  if (error) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl">{error.status === 404 ? 'Order not found' : 'Could not load the order'}</h1>
        <Link to="/admin/orders" className="btn-outline mt-6">Back to orders</Link>
      </div>
    )
  }
  if (!order) return <p className="py-16 text-center text-sm text-muted" role="status">Loading order…</p>

  const run = async (path, init, success) => {
    try {
      const res = await api(`/admin/orders/${order.orderNumber}${path}`, init)
      setOverride(res.order)
      toast.success(success)
      return true
    } catch (err) {
      toast.error(err.message)
      setRefresh((r) => r + 1)
      return false
    }
  }

  const a = order.shippingAddress
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin/orders" className="text-xs uppercase tracking-[0.15em] text-muted hover:text-emerald-900">← Orders</Link>
          <h1 className="text-4xl">{order.orderNumber}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            Placed {fmt(order.createdAt)} · <StatusBadge status={order.status} /> <StatusBadge kind="payment" status={order.payment.status} />
          </p>
        </div>
      </div>

      {order.payment.needsRefund && (
        <p role="alert" className="mb-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          This card payment arrived after the order was cancelled and a stone was no longer available. Refund {order.payment.chargeAmount ? formatMoney(order.payment.chargeAmount / 100, 'USD') : 'the payment'} in the Stripe dashboard.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <PaymentCard order={order} run={run} />

          <Card title="Stones">
            <ul className="divide-y divide-ivory-200">
              {order.items.map((i) => (
                <li key={`${i.product}-${i.name}`} className="flex items-center gap-4 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden bg-ivory-100">
                    <ProductImage product={{ name: i.name, carat: i.carat, colorHex: i.colorHex, images: i.image?.url ? [i.image] : [] }} width={112} sizes="56px" className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${i.product}`} className="font-medium text-emerald-900 hover:underline">{i.name}</Link>
                    <p className="text-xs text-muted">{[i.sku, i.category, i.carat && `${i.carat} ct`, i.qty > 1 && `× ${i.qty}`].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="tabular-nums">{formatMoney(i.lineTotalPKR, 'PKR')}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-ivory-200 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(order.subtotalPKR, 'PKR')}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping ({order.shipping.zone})</dt><dd>{order.shipping.feePKR ? formatMoney(order.shipping.feePKR, 'PKR') : 'Free'}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatMoney(order.totalPKR, 'PKR')}</dd></div>
              {order.payment.chargeAmount && <div className="flex justify-between text-xs text-muted"><dt>Card charge</dt><dd>{formatMoney(order.payment.chargeAmount / 100, 'USD')} at {order.pkrPerUsd} PKR/USD</dd></div>}
            </dl>
          </Card>

          <Card title="History">
            <ol className="space-y-3 text-sm">
              {[...order.statusHistory].reverse().map((h, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                  <div>
                    <p><strong>{STATUS_LABELS[h.status] ?? h.status}</strong>{h.note && <> · {h.note}</>}</p>
                    <p className="text-xs text-muted">{fmt(h.at)}{h.by?.name && ` · ${h.by.name}`}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <StatusCard order={order} run={run} />

          <Card title="Customer">
            <p className="text-sm font-medium">{order.contact.name}</p>
            <p className="text-sm"><a href={`mailto:${order.contact.email}`} className="text-emerald-900 hover:underline">{order.contact.email}</a></p>
            <p className="text-sm"><a href={`tel:${order.contact.phone}`} className="text-emerald-900 hover:underline">{order.contact.phone}</a></p>
            <p className="mt-2 text-xs text-muted">{order.user ? `Account: ${order.user.email}` : 'Guest checkout'}</p>
            {order.notes && <p className="mt-3 border-l-2 border-gold-500 bg-ivory-50 px-3 py-2 text-sm">“{order.notes}”</p>}
          </Card>

          <Card title="Ship to">
            <address className="text-sm not-italic leading-relaxed">
              {a.fullName}<br />{a.line1}{a.line2 && <><br />{a.line2}</>}<br />
              {[a.city, a.province, a.postalCode].filter(Boolean).join(', ')}<br />
              {countryName(a.country)}<br />{a.phone}
            </address>
          </Card>
        </div>
      </div>
    </>
  )
}

function PaymentCard({ order, run }) {
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const p = order.payment
  const pending = p.proofs.at(-1)?.status === 'pending' && p.status === 'awaiting_review'

  const act = async (fn) => {
    setBusy(true)
    await fn()
    setBusy(false)
  }

  return (
    <Card title={`Payment · ${METHOD_LABELS[p.method]}`}>
      {p.status === 'paid' && <p className="text-sm text-emerald-900">Paid{p.paidAt && ` on ${fmt(p.paidAt)}`}.</p>}
      {p.method === 'cod' && p.status !== 'paid' && <p className="text-sm text-muted">Collect {formatMoney(order.totalPKR, 'PKR')} in cash on delivery. Marking the order delivered records the payment.</p>}
      {p.method === 'card' && p.status !== 'paid' && <p className="text-sm text-muted">Waiting for the customer to pay on Stripe{order.expiresAt && ` (hold until ${fmt(order.expiresAt)})`}.</p>}
      {p.method === 'card' && p.stripePaymentIntentId && <p className="mt-1 text-xs text-muted">Stripe payment: {p.stripePaymentIntentId}</p>}
      {['bank', 'jazzcash', 'easypaisa'].includes(p.method) && p.proofs.length === 0 && p.status !== 'paid' && (
        <p className="text-sm text-muted">No proof uploaded yet{order.expiresAt && `; the order is cancelled automatically at ${fmt(order.expiresAt)}`}.</p>
      )}

      {p.proofs.length > 0 && (
        <ul className="mt-2 space-y-4">
          {[...p.proofs].reverse().map((proof) => (
            <li key={proof._id ?? proof.id} className="flex flex-col gap-4 border border-ivory-200 p-3 sm:flex-row">
              <a href={proof.image.url} target="_blank" rel="noreferrer" className="block w-full shrink-0 bg-ivory-50 sm:w-48" title="Open full size">
                <img src={imageUrl(proof.image.url, { width: 600 })} alt="Payment screenshot" className="max-h-64 w-full object-contain" />
              </a>
              <div className="min-w-0 flex-1 text-sm">
                <p><StatusBadge kind="payment" status={proof.status === 'pending' ? 'awaiting_review' : proof.status === 'approved' ? 'paid' : 'rejected'} /></p>
                <p className="mt-2 text-muted">Uploaded {fmt(proof.uploadedAt)}</p>
                {proof.reference && <p>Transaction ID: <strong>{proof.reference}</strong></p>}
                <p>Expected amount: <strong>{formatMoney(order.totalPKR, 'PKR')}</strong> · reference {order.orderNumber}</p>
                {proof.reason && <p className="mt-1 text-red-700">Rejected: {proof.reason}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <div className="mt-4 border-t border-ivory-200 pt-4">
          {rejecting ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                act(async () => {
                  if (await run('/payment/reject', { method: 'POST', json: { reason } }, 'Proof rejected; the customer has been given 48 hours to resend')) {
                    setRejecting(false)
                    setReason('')
                  }
                })
              }}
              className="space-y-3"
            >
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Reason (shown to the customer)</span>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required minLength={3} className="w-full border border-ivory-200 px-3 py-2" placeholder="e.g. Amount does not match the order total" autoFocus />
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn border border-red-700 px-4! py-2! text-xs! text-red-700 hover:bg-red-700 hover:text-white" disabled={busy || reason.trim().length < 3}>Reject proof</button>
                <button type="button" className="btn-outline px-4! py-2! text-xs!" onClick={() => setRejecting(false)}>Back</button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary px-4! py-2! text-xs!" disabled={busy} onClick={() => act(() => run('/payment/approve', { method: 'POST' }, 'Payment approved; order marked paid'))}>
                Approve payment
              </button>
              <button type="button" className="btn-outline px-4! py-2! text-xs!" disabled={busy} onClick={() => setRejecting(true)}>Reject…</button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function StatusCard({ order, run }) {
  const options = NEXT[order.status].filter((s) => !(s === 'shipped' && order.status === 'pending' && order.payment.method !== 'cod'))
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [tracking, setTracking] = useState({ carrier: order.tracking?.carrier ?? '', number: order.tracking?.number ?? '' })
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!status) return
    if (status === 'cancelled' && !window.confirm(`Cancel ${order.orderNumber}? Its stones go back into stock.${order.payment.status === 'paid' ? ' Remember to refund the customer.' : ''}`)) return
    setBusy(true)
    const body = { status, note: note.trim() || undefined }
    if (status === 'shipped' && (tracking.carrier || tracking.number)) body.tracking = { carrier: tracking.carrier.trim() || undefined, number: tracking.number.trim() || undefined }
    if (await run('/status', { method: 'PATCH', json: body }, `Order marked ${STATUS_LABELS[status].toLowerCase()}`)) {
      setStatus('')
      setNote('')
    }
    setBusy(false)
  }

  return (
    <Card title="Update status">
      {options.length === 0 ? (
        <p className="text-sm text-muted">This order is {order.status}; no further changes.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <fieldset>
            <legend className="sr-only">New status</legend>
            <div className="flex flex-wrap gap-2">
              {options.map((s) => (
                <label key={s} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${status === s ? (s === 'cancelled' ? 'border-red-700 bg-red-700 text-white' : 'border-emerald-900 bg-emerald-900 text-ivory-50') : 'border-ivory-200 text-ink hover:border-emerald-700'}`}>
                  <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
                  {s === 'paid' ? 'Mark paid' : STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          </fieldset>
          {status === 'shipped' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Courier</span>
                <input type="text" value={tracking.carrier} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} className="w-full border border-ivory-200 px-3 py-2" placeholder="TCS, Leopards, DHL…" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Tracking number</span>
                <input type="text" value={tracking.number} onChange={(e) => setTracking({ ...tracking, number: e.target.value })} className="w-full border border-ivory-200 px-3 py-2" />
              </label>
            </div>
          )}
          {status && (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Note (optional, shown to the customer)</span>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="w-full border border-ivory-200 px-3 py-2" />
            </label>
          )}
          <button type="submit" className="btn-primary w-full" disabled={!status || busy}>{busy ? 'Saving…' : 'Update order'}</button>
          {order.status === 'pending' && order.payment.method !== 'cod' && (
            <p className="text-xs text-muted">Transfers and card orders ship after payment is confirmed.</p>
          )}
        </form>
      )}
    </Card>
  )
}
