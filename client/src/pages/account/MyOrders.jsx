import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../../components/order/StatusBadge.jsx'
import { useApi } from '../../hooks/useApi.js'
import { api, toQuery } from '../../lib/api.js'
import { deviceOrders, orderLink } from '../../lib/deviceOrders.js'
import { useAuth } from '../../store/authStore.js'
import { formatMoney } from '../../store/currencyStore.js'

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Orders on this device (guest links), fetched individually with their tokens
function useDeviceOrders(skip) {
  const [orders, setOrders] = useState(null)
  useEffect(() => {
    let cancelled = false
    const saved = deviceOrders().filter((o) => !skip.has(o.orderNumber)).slice(0, 10)
    Promise.all(
      saved.map((o) =>
        api(`/orders/${o.orderNumber}${toQuery({ token: o.token })}`)
          .then((r) => ({ ...r.order, token: o.token }))
          .catch(() => null),
      ),
    ).then((list) => !cancelled && setOrders(list.filter(Boolean)))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [[...skip].join(',')])
  return orders
}

export default function MyOrders() {
  const { user, status } = useAuth()
  const mine = useApi(user ? '/me/orders' : null)
  const accountNumbers = new Set((mine.data?.items ?? []).map((o) => o.orderNumber))
  const device = useDeviceOrders(accountNumbers)
  const ready = status === 'ready' && (!user || mine.data || mine.error)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <title>My orders · Geological Kingdom</title>
      <h1 className="section-title">My orders</h1>
      <span className="mx-auto mt-5 block h-px w-14 bg-gold-500" aria-hidden="true" />

      {!user && status === 'ready' && (
        <p className="mx-auto mt-8 max-w-xl border border-ivory-200 bg-white px-5 py-4 text-center text-sm text-muted">
          <Link to="/login?next=/account/orders" className="text-emerald-900 underline underline-offset-4">Sign in</Link> or{' '}
          <Link to="/register?next=/account/orders" className="text-emerald-900 underline underline-offset-4">create an account</Link> to keep all your orders in one place.
          Orders you placed as a guest on this device are listed below, and every confirmation email has a link to its order.
        </p>
      )}

      {!ready && <p className="mt-10 text-center text-sm text-muted" role="status">Loading…</p>}

      {user && mine.data && <OrderList title="Your account" orders={mine.data.items} empty="You have not placed any orders with this account yet." />}
      {device && device.length > 0 && <OrderList title={user ? 'Also on this device' : 'Orders on this device'} orders={device} />}
      {ready && !mine.data?.items.length && device && !device.length && (
        <div className="mt-12 text-center">
          <p className="text-muted">No orders yet.</p>
          <Link to="/shop" className="btn-primary mt-6">Explore the collection</Link>
        </div>
      )}
    </div>
  )
}

function OrderList({ title, orders, empty }) {
  return (
    <section className="mt-10" aria-label={title}>
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-900">{title}</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-ivory-200 border-y border-ivory-200">
          {orders.map((o) => (
            <li key={o.orderNumber}>
              <Link to={orderLink(o.orderNumber, o.token)} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 hover:bg-ivory-100 sm:px-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-emerald-900">{o.orderNumber}</p>
                  <p className="text-xs text-muted">{fmt(o.createdAt)} · {o.items.length} {o.items.length === 1 ? 'stone' : 'stones'}: {o.items.map((i) => i.name).join(', ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  {o.status === 'pending' && o.payment.status !== 'unpaid' && <StatusBadge kind="payment" status={o.payment.status} />}
                </div>
                <span className="w-28 text-right text-sm font-semibold">{formatMoney(o.totalPKR, 'PKR')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
