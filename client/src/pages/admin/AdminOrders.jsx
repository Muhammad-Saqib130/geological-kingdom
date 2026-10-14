import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StatusBadge from '../../components/order/StatusBadge.jsx'
import { useApi } from '../../hooks/useApi.js'
import { toQuery } from '../../lib/api.js'
import { METHOD_LABELS } from '../../lib/orderLabels.js'
import { formatMoney } from '../../store/currencyStore.js'

const TABS = [
  { value: '', label: 'All' },
  { value: 'review', label: 'Needs review' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refund', label: 'Refund needed' },
]

const fmt = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AdminOrders() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const page = Number(params.get('page') ?? 1)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const { data, loading, error } = useApi(`/admin/orders${toQuery({ status, q: params.get('q'), page })}`)

  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== search.trim()) update({ q: search.trim() })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const counts = data?.counts ?? {}
  const countFor = (v) => (v === '' ? undefined : counts[v])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-4xl">Orders</h1>
        <p className="mt-1 text-sm text-muted">Newest first. Proofs waiting for you are under “Needs review”.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-ivory-200" role="tablist" aria-label="Order status">
        {TABS.filter((t) => t.value !== 'refund' || counts.refund).map((t) => {
          const n = countFor(t.value)
          return (
            <button
              key={t.value || 'all'}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              onClick={() => update({ status: t.value })}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${status === t.value ? 'border-emerald-900 font-semibold text-emerald-900' : 'border-transparent text-muted hover:text-emerald-900'}`}
            >
              {t.label}
              {n !== undefined && (
                <span className={`ml-1.5 rounded-full px-1.5 text-xs ${(t.value === 'review' || t.value === 'refund') && n ? 'bg-red-700 text-white' : 'text-muted'}`}>{n}</span>
              )}
            </button>
          )
        })}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search order number, name, email or phone…"
        aria-label="Search orders"
        className="mb-4 w-full border border-ivory-200 bg-white px-3 py-2 text-sm"
      />

      {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load orders: {error.message}</p>}

      <div className={`overflow-x-auto border border-ivory-200 bg-white ${loading && data ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-ivory-200 bg-ivory-50 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Order</th>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3">Payment</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Total</th>
              <th scope="col" className="px-4 py-3 text-right">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {!data && loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Loading…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No orders here.</td></tr>}
            {data?.items.map((o) => (
              <tr key={o.orderNumber} className="hover:bg-ivory-50">
                <td className="px-4 py-3">
                  <Link to={`/admin/orders/${o.orderNumber}`} className="font-medium text-emerald-900 hover:underline">{o.orderNumber}</Link>
                  <p className="text-xs text-muted">{o.items.length} {o.items.length === 1 ? 'stone' : 'stones'} · {o.shippingAddress.country}</p>
                </td>
                <td className="px-4 py-3">
                  {o.contact.name}
                  <p className="text-xs text-muted">{o.contact.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs">{METHOD_LABELS[o.payment.method]}</span>
                  <div className="mt-1"><StatusBadge kind="payment" status={o.payment.status} /></div>
                  {o.payment.needsRefund && <p className="mt-1 text-xs font-semibold text-red-700">Refund needed</p>}
                </td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(o.totalPKR, 'PKR')}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-muted">{fmt(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          <p className="text-muted">{data.total} orders</p>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-outline px-4! py-2!" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</button>
            <span className="text-muted">Page {page} of {data.totalPages}</span>
            <button type="button" className="btn-outline px-4! py-2!" disabled={page >= data.totalPages} onClick={() => update({ page: String(page + 1) })}>Next</button>
          </div>
        </nav>
      )}
    </>
  )
}
