import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import GemVisual from '../../components/GemVisual.jsx'
import { useApi } from '../../hooks/useApi.js'
import { api, toQuery } from '../../lib/api.js'
import { imageUrl } from '../../lib/images.js'
import { formatMoney } from '../../store/currencyStore.js'
import { toast } from '../../store/toastStore.js'

const SORTS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'stock-asc', label: 'Stock: low first' },
]

export default function AdminProducts() {
  const [params, setParams] = useSearchParams()
  const query = Object.fromEntries(params)
  const [reload, setReload] = useState(0)
  const { data, loading, error } = useApi(`/admin/products${toQuery({ ...query, limit: 20 })}`, reload)
  const categories = useApi('/admin/categories').data?.items ?? []
  const [search, setSearch] = useState(query.q ?? '')
  const [busyId, setBusyId] = useState(null)

  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== search.trim()) update({ q: search.trim() })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const act = async (product, action) => {
    setBusyId(product.id)
    try {
      if (action === 'delete') {
        if (!window.confirm(`Permanently delete “${product.name}” and its images? This cannot be undone.`)) return
        await api(`/admin/products/${product.id}`, { method: 'DELETE' })
        toast.success(`Deleted ${product.name}`)
      } else {
        const isActive = action === 'restore'
        await api(`/admin/products/${product.id}`, { method: 'PATCH', json: { isActive } })
        toast.success(`${product.name} ${isActive ? 'is back in the shop' : 'archived'}`)
      }
      setReload((n) => n + 1)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const status = query.status ?? 'all'
  const tabs = [
    { value: 'all', label: 'All', count: data && data.counts.active + data.counts.archived },
    { value: 'active', label: 'Active', count: data?.counts.active },
    { value: 'archived', label: 'Archived', count: data?.counts.archived },
  ]

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Products</h1>
          <p className="mt-1 text-sm text-muted">Gemstones listed in the shop. Archived stones are hidden but kept for order history.</p>
        </div>
        <Link to="/admin/products/new" className="btn-primary">Add product</Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-ivory-200" role="tablist" aria-label="Status">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={status === t.value}
            onClick={() => update({ status: t.value === 'all' ? '' : t.value })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${status === t.value ? 'border-emerald-900 font-semibold text-emerald-900' : 'border-transparent text-muted hover:text-emerald-900'}`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-xs text-muted">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, SKU, origin…"
          aria-label="Search products"
          className="border border-ivory-200 bg-white px-3 py-2 text-sm"
        />
        <select aria-label="Category" value={query.category ?? ''} onChange={(e) => update({ category: e.target.value })} className="border border-ivory-200 bg-white px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Sort" value={query.sort ?? 'updated'} onChange={(e) => update({ sort: e.target.value === 'updated' ? '' : e.target.value })} className="border border-ivory-200 bg-white px-3 py-2 text-sm">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load products: {error.message}</p>}

      <div className={`overflow-x-auto border border-ivory-200 bg-white ${loading && data ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-ivory-200 bg-ivory-50 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="w-16 px-4 py-3"><span className="sr-only">Image</span></th>
              <th scope="col" className="px-4 py-3">Product</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3 text-right">Carat</th>
              <th scope="col" className="px-4 py-3 text-right">Price</th>
              <th scope="col" className="px-4 py-3 text-right">Stock</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {!data && loading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Loading…</td></tr>
            )}
            {data?.items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted">No products match. <Link to="/admin/products/new" className="text-emerald-900 underline">Add one</Link></td></tr>
            )}
            {data?.items.map((p) => (
              <tr key={p.id} className="hover:bg-ivory-50">
                <td className="px-4 py-3">
                  <div className="h-12 w-12 overflow-hidden bg-ivory-100">
                    {p.images[0] ? (
                      <img src={imageUrl(p.images[0].url, { width: 96 })} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <GemVisual color={p.colorHex} className="h-full w-full" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/admin/products/${p.id}`} className="font-medium text-emerald-900 hover:underline">{p.name}</Link>
                  {p.isFeatured && <span className="ml-2 text-gold-600" title="Featured" aria-label="Featured">★</span>}
                  <p className="text-xs text-muted">{[p.sku, `/${p.slug}`].filter(Boolean).join(' · ')}</p>
                </td>
                <td className="px-4 py-3">{p.category?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{p.carat}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.pricePKR, 'PKR')}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${p.stock === 0 ? 'text-red-700' : ''}`}>{p.stock === 0 ? 'Sold out' : p.stock}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 text-xs ${p.isActive ? 'bg-emerald-900/10 text-emerald-900' : 'bg-ink/10 text-muted'}`}>
                    {p.isActive ? 'Active' : 'Archived'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link to={`/admin/products/${p.id}`} className="text-emerald-900 hover:underline">Edit</Link>
                  <button type="button" disabled={busyId === p.id} onClick={() => act(p, p.isActive ? 'archive' : 'restore')} className="ml-4 text-muted hover:text-emerald-900 disabled:opacity-50">
                    {p.isActive ? 'Archive' : 'Restore'}
                  </button>
                  {!p.isActive && (
                    <button type="button" disabled={busyId === p.id} onClick={() => act(p, 'delete')} className="ml-4 text-red-700 hover:underline disabled:opacity-50">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          <p className="text-muted">{data.total} products</p>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-outline px-4! py-2!" disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) })}>Previous</button>
            <span className="text-muted">Page {data.page} of {data.totalPages}</span>
            <button type="button" className="btn-outline px-4! py-2!" disabled={data.page >= data.totalPages} onClick={() => update({ page: String(data.page + 1) })}>Next</button>
          </div>
        </nav>
      )}
    </>
  )
}
