import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import InvestigationBadge from '../../components/investigation/InvestigationBadge.jsx'
import { useApi } from '../../hooks/useApi.js'
import { toQuery } from '../../lib/api.js'
import { countryName } from '../../lib/geo.js'

const TABS = [
  { value: '', label: 'All' },
  { value: 'received', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'payment_arranged', label: 'Payment arranged' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const fmt = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AdminInvestigations() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const page = Number(params.get('page') ?? 1)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const { data, loading, error } = useApi(`/admin/investigations${toQuery({ status, q: params.get('q'), page })}`)

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
        <h1 className="text-4xl">Gem Investigations</h1>
        <p className="mt-1 text-sm text-muted">Newest first. New requests are waiting for you to contact the customer on WhatsApp.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-ivory-200" role="tablist" aria-label="Request status">
        {TABS.map((t) => {
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
                <span className={`ml-1.5 rounded-full px-1.5 text-xs ${t.value === 'received' && n ? 'bg-red-700 text-white' : 'text-muted'}`}>{n}</span>
              )}
            </button>
          )
        })}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tracking ID, name, email, WhatsApp or gem…"
        aria-label="Search requests"
        className="mb-4 w-full border border-ivory-200 bg-white px-3 py-2 text-sm"
      />

      {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load requests: {error.message}</p>}

      <div className={`overflow-x-auto border border-ivory-200 bg-white ${loading && data ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-ivory-200 bg-ivory-50 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Request</th>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Fee</th>
              <th scope="col" className="px-4 py-3 text-right">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {!data && loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Loading…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted">No requests here.</td></tr>}
            {data?.items.map((i) => (
              <tr key={i.trackingId} className="hover:bg-ivory-50">
                <td className="px-4 py-3">
                  <Link to={`/admin/investigations/${i.trackingId}`} className="font-mono font-medium text-emerald-900 hover:underline">{i.trackingId}</Link>
                  <p className="text-xs text-muted">{i.gem.count} × {i.gem.type} · {i.photos.length} {i.photos.length === 1 ? 'photo' : 'photos'}</p>
                </td>
                <td className="px-4 py-3">
                  {i.contact.name}
                  <p className="text-xs text-muted">{i.contact.email} · {countryName(i.contact.country)}</p>
                </td>
                <td className="px-4 py-3"><InvestigationBadge status={i.status} /></td>
                <td className="px-4 py-3 text-right tabular-nums">${i.feeUSD}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-muted">{fmt(i.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          <p className="text-muted">{data.total} requests</p>
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
