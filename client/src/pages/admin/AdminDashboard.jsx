import { useState } from 'react'
import { Link } from 'react-router-dom'
import BarChart from '../../components/admin/BarChart.jsx'
import StatusBadge from '../../components/order/StatusBadge.jsx'
import { useApi } from '../../hooks/useApi.js'
import { METHOD_LABELS, STATUS_LABELS } from '../../lib/orderLabels.js'
import { formatMoney } from '../../store/currencyStore.js'

const pkr = (n) => formatMoney(n, 'PKR')
const TZ = 'Asia/Karachi' // matches the server's dashboard time zone
const dayLabel = (iso, opts) => new Date(`${iso}T12:00:00+05:00`).toLocaleDateString('en-GB', { timeZone: TZ, ...opts })
const monthLabel = (ym, opts) => new Date(`${ym}-15T12:00:00+05:00`).toLocaleDateString('en-GB', { timeZone: TZ, ...opts })
const when = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const ordersText = (n) => `${n} ${n === 1 ? 'order' : 'orders'}`
const STATUS_ORDER = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

export default function AdminDashboard() {
  const { data, error } = useApi('/admin/dashboard')
  const [range, setRange] = useState('daily')

  if (error) return <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load the dashboard: {error.message}</p>
  if (!data) return <p className="py-16 text-center text-sm text-muted" role="status">Loading dashboard…</p>

  const { sales, orders, investigations, lowStock } = data
  const actions = [
    { n: orders.needsReview, label: 'Payment proofs to review', to: '/admin/orders?status=review', urgent: true },
    { n: orders.needsRefund, label: 'Refunds needed', to: '/admin/orders?status=refund', urgent: true, hideWhenZero: true },
    { n: investigations.new, label: 'New investigation requests', to: '/admin/investigations?status=received', urgent: true },
    { n: orders.byStatus.paid, label: 'Paid orders to ship', to: '/admin/orders?status=paid' },
    { n: lowStock.count, label: lowStock.threshold === 0 ? 'Products sold out' : `Products with ${lowStock.threshold} or fewer left`, to: '#low-stock' },
  ].filter((a) => !(a.hideWhenZero && !a.n))

  const daily = data.daily.map((d) => ({
    key: d.date,
    label: dayLabel(d.date, { weekday: 'short', day: 'numeric', month: 'short' }),
    tick: dayLabel(d.date, { day: 'numeric', month: 'short' }),
    value: d.totalPKR,
    detail: ordersText(d.orders),
  }))
  const monthly = data.monthly.map((m) => ({
    key: m.month,
    label: monthLabel(m.month, { month: 'long', year: 'numeric' }),
    tick: monthLabel(m.month, { month: 'short' }),
    value: m.totalPKR,
    detail: ordersText(m.orders),
  }))

  return (
    <>
      <title>Dashboard · Admin · Geological Kingdom</title>
      <div className="mb-6">
        <h1 className="text-4xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Sales count money received: paid orders by payment date, and cash-on-delivery once delivered. Days follow Pakistan time.</p>
      </div>

      <ul className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {actions.map((a) => {
          const hot = a.urgent && a.n > 0
          const body = (
            <>
              <span className={`text-2xl font-semibold tabular-nums ${hot ? 'text-red-700' : 'text-emerald-900'}`}>{a.n}</span>
              <span className="text-xs leading-snug text-muted">{a.label}</span>
            </>
          )
          const cls = `flex h-full items-center gap-3 border bg-white px-4 py-3 hover:border-emerald-700 ${hot ? 'border-red-300' : 'border-ivory-200'}`
          return (
            <li key={a.label}>
              {a.to.startsWith('#') ? <a href={a.to} className={cls}>{body}</a> : <Link to={a.to} className={cls}>{body}</Link>}
            </li>
          )
        })}
      </ul>

      <section aria-label="Sales totals" className="mb-6 grid grid-cols-2 gap-px border border-ivory-200 bg-ivory-200 lg:grid-cols-5">
        {[
          ['Today', sales.today],
          ['Last 7 days', sales.last7Days],
          ['This month', sales.thisMonth],
          ['Last 12 months', sales.last12Months],
        ].map(([label, s]) => (
          <div key={label} className="bg-white px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-ink sm:text-2xl">{pkr(s.totalPKR)}</p>
            <p className="text-xs text-muted">{ordersText(s.orders)}</p>
          </div>
        ))}
        <div className="col-span-2 bg-white px-5 py-4 lg:col-span-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Average order</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink sm:text-2xl">{sales.averageOrderPKR ? pkr(sales.averageOrderPKR) : '—'}</p>
          <p className="text-xs text-muted">last 30 days</p>
        </div>
      </section>

      <section aria-labelledby="sales-chart" className="mb-6 border border-ivory-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="sales-chart" className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">
            Sales {range === 'daily' ? 'by day · last 30 days' : 'by month · last 12 months'}
          </h2>
          <div role="tablist" aria-label="Chart range" className="flex border border-ivory-200 text-xs">
            {[['daily', 'Daily'], ['monthly', 'Monthly']].map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={range === k} onClick={() => setRange(k)} className={`px-3 py-1.5 ${range === k ? 'bg-emerald-900 text-ivory-50' : 'text-muted hover:text-emerald-900'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <BarChart
          key={range}
          rows={range === 'daily' ? daily : monthly}
          formatValue={pkr}
          caption={range === 'daily' ? 'Money received per day, last 30 days, in PKR' : 'Money received per month, last 12 months, in PKR'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="by-status" className="border border-ivory-200 bg-white p-5 sm:p-6">
          <h2 id="by-status" className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">Orders by status</h2>
          <ul className="divide-y divide-ivory-200">
            {STATUS_ORDER.map((s) => (
              <li key={s}>
                <Link to={`/admin/orders?status=${s}`} className="flex items-center justify-between py-2.5 text-sm hover:text-emerald-900">
                  <StatusBadge status={s} />
                  <span className="tabular-nums">{orders.byStatus[s]}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">All time. “{STATUS_LABELS.pending}” includes orders waiting for a transfer or cash on delivery.</p>
        </section>

        <section aria-labelledby="top-products" className="border border-ivory-200 bg-white p-5 sm:p-6">
          <h2 id="top-products" className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">Top products · 12 months</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted">No paid orders yet.</p>
          ) : (
            <ol className="divide-y divide-ivory-200">
              {data.topProducts.map((p, i) => (
                <li key={p.product} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-4 font-serif text-lg text-gold-600">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${p.product}`} className="block truncate font-medium text-emerald-900 hover:underline">{p.name}</Link>
                    <p className="text-xs text-muted">{[p.category, `${p.qty} sold`].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="tabular-nums">{pkr(p.revenuePKR)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="investigations" className="border border-ivory-200 bg-white p-5 sm:p-6">
          <h2 id="investigations" className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">Gem investigations</h2>
          <p className="text-3xl font-semibold tabular-nums text-emerald-900">{investigations.open}</p>
          <p className="text-sm text-muted">open {investigations.open === 1 ? 'request' : 'requests'}</p>
          <dl className="mt-4 divide-y divide-ivory-200 text-sm">
            {[['received', 'New'], ['contacted', 'Contacted'], ['payment_arranged', 'Payment arranged'], ['in_progress', 'In progress']].map(([k, label]) => (
              <div key={k} className="flex justify-between py-2">
                <dt><Link to={`/admin/investigations?status=${k}`} className="hover:text-emerald-900 hover:underline">{label}</Link></dt>
                <dd className={`tabular-nums ${k === 'received' && investigations.byStatus[k] ? 'font-semibold text-red-700' : ''}`}>{investigations.byStatus[k]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">{investigations.byStatus.completed} completed so far.</p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="recent" className="min-w-0 border border-ivory-200 bg-white">
          <div className="flex items-center justify-between p-5 pb-3 sm:px-6">
            <h2 id="recent" className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">Recent orders</h2>
            <Link to="/admin/orders" className="text-xs uppercase tracking-[0.15em] text-muted hover:text-emerald-900">All orders →</Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <tbody className="divide-y divide-ivory-200 border-t border-ivory-200">
                  {data.recentOrders.map((o) => (
                    <tr key={o.orderNumber} className="hover:bg-ivory-50">
                      <td className="px-5 py-2.5 sm:px-6">
                        <Link to={`/admin/orders/${o.orderNumber}`} className="whitespace-nowrap font-medium text-emerald-900 hover:underline">{o.orderNumber}</Link>
                        <p className="text-xs text-muted">{o.contact.name}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted">{METHOD_LABELS[o.payment.method]}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{pkr(o.totalPKR)}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right text-xs text-muted sm:px-6">{when(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section id="low-stock" aria-labelledby="low-stock-title" className="scroll-mt-20 border border-ivory-200 bg-white p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="low-stock-title" className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">Low stock</h2>
            <Link to="/admin/settings" className="text-xs text-muted hover:text-emerald-900">Threshold: {lowStock.threshold}</Link>
          </div>
          {lowStock.items.length === 0 ? (
            <p className="text-sm text-muted">Every active product has more than {lowStock.threshold} in stock.</p>
          ) : (
            <>
              <ul className="divide-y divide-ivory-200">
                {lowStock.items.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/products/${p.id}`} className="block truncate text-emerald-900 hover:underline">{p.name}</Link>
                      {p.sku && <p className="text-xs text-muted">{p.sku}</p>}
                    </div>
                    {p.stock === 0 ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-red-800">Sold out</span>
                    ) : (
                      <span className="text-xs tabular-nums text-muted">{p.stock} left</span>
                    )}
                  </li>
                ))}
              </ul>
              {lowStock.count > lowStock.items.length && <p className="mt-3 text-xs text-muted">and {lowStock.count - lowStock.items.length} more</p>}
            </>
          )}
        </section>
      </div>
    </>
  )
}
