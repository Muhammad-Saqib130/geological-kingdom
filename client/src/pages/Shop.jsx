import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { CloseIcon, FilterIcon } from '../components/icons.jsx'
import ProductGrid, { ProductGridSkeleton } from '../components/product/ProductGrid.jsx'
import { useApi } from '../hooks/useApi.js'
import { useDialog } from '../hooks/useDialog.js'
import { toQuery } from '../lib/api.js'
import { formatMoney, useCurrency, useDisplayCurrency } from '../store/currencyStore.js'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'carat-desc', label: 'Carat: largest first' },
]

// Multi-value filters live in the URL as repeated params: ?origin=Swat%2C+Pakistan&origin=Hunza…
const MULTI = ['category', 'origin', 'treatment']
const SINGLE = ['q', 'minPrice', 'maxPrice', 'minCarat', 'maxCarat', 'inStock']

function readFilters(params) {
  const f = Object.fromEntries(SINGLE.map((k) => [k, params.get(k) ?? '']))
  for (const k of MULTI) f[k] = params.getAll(k)
  return f
}

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const [drawer, setDrawer] = useState(false)
  const filters = readFilters(params)
  const sort = params.get('sort') ?? 'newest'
  const page = Number(params.get('page') ?? 1)

  const { data, loading, error } = useApi(`/products${toQuery({ ...filters, sort, page, limit: 12 })}`)
  const facets = useApi('/products/filters').data

  // Writes changes back to the URL; any filter change returns to page 1.
  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      next.delete(k)
      for (const item of Array.isArray(v) ? v : [v]) if (item !== undefined && item !== '') next.append(k, item)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }
  const clearAll = () => setParams(sort !== 'newest' ? { sort } : {})

  const chips = useChips(filters, facets, update)
  const title = filters.category.length === 1 ? facets?.categories.find((c) => c.slug === filters.category[0])?.name : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <title>{`${title ? `${title} gemstones` : 'Shop natural gemstones'} · Geological Kingdom`}</title>
      <header className="mb-10">
        <h1 className="section-title">{title ?? 'The Collection'}</h1>
        <p className="section-subtitle">{filters.q ? `Results for “${filters.q}”` : 'Natural loose gemstones'}</p>
        <span className="mx-auto mt-5 block h-px w-14 bg-gold-500" aria-hidden="true" />
      </header>

      <div className="sticky top-16 z-30 -mx-4 mb-6 flex items-center justify-between gap-3 border-y border-ivory-200 bg-ivory-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
        <button type="button" onClick={() => setDrawer(true)} className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.15em] text-emerald-900 lg:hidden">
          <FilterIcon className="h-4 w-4" /> Filters{chips.length ? ` (${chips.length})` : ''}
        </button>
        <p className="hidden text-sm text-muted lg:block" aria-live="polite">
          {data ? `${data.total} ${data.total === 1 ? 'stone' : 'stones'}` : ' '}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="hidden text-muted sm:inline">Sort by</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })} className="border border-ivory-200 bg-white px-2 py-1.5" aria-label="Sort by">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {chips.length > 0 && (
        <ul className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.key}>
              <button type="button" onClick={c.remove} className="inline-flex items-center gap-1.5 border border-emerald-900/20 bg-white px-3 py-1 text-xs text-emerald-900 hover:border-emerald-900" aria-label={`Remove filter ${c.label}`}>
                {c.label} <CloseIcon className="h-3 w-3" />
              </button>
            </li>
          ))}
          <li><button type="button" onClick={clearAll} className="px-2 text-xs uppercase tracking-[0.12em] text-muted underline-offset-4 hover:text-emerald-900 hover:underline">Clear all</button></li>
        </ul>
      )}

      <div className="grid gap-10 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <Filters key={params.toString()} filters={filters} facets={facets} update={update} />
        </aside>
        <FilterDrawer open={drawer} onClose={() => setDrawer(false)} total={data?.total}>
          <Filters key={params.toString()} filters={filters} facets={facets} update={update} />
        </FilterDrawer>

        <section aria-label="Results" aria-busy={loading}>
          {loading && !data && <ProductGridSkeleton count={6} className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3" />}
          {error && <p className="text-muted">We couldn't load the collection. Please try again.</p>}
          {data && data.items.length === 0 && (
            <div className="border border-dashed border-ivory-200 py-20 text-center">
              <h2 className="text-3xl">No stones match these filters</h2>
              <p className="mt-2 text-muted">Try removing a filter, or ask us on WhatsApp — new stones arrive often.</p>
              <button type="button" className="btn-outline mt-6" onClick={clearAll}>Clear filters</button>
            </div>
          )}
          {data && data.items.length > 0 && (
            <div className={loading ? 'opacity-60 transition-opacity' : ''}>
              <ProductGrid products={data.items} className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3" />
              <Pagination page={data.page} totalPages={data.totalPages} onPage={(p) => { update({ page: p === 1 ? '' : String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// Removable chips for each active filter
function useChips(filters, facets, update) {
  const currency = useDisplayCurrency()
  const fromPKR = useCurrency((s) => s.fromPKR)
  const chips = []
  const catName = (slug) => facets?.categories.find((c) => c.slug === slug)?.name ?? slug
  const without = (k, v) => () => update({ [k]: filters[k].filter((x) => x !== v) })

  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”`, remove: () => update({ q: '' }) })
  for (const v of filters.category) chips.push({ key: `c-${v}`, label: catName(v), remove: without('category', v) })
  for (const v of filters.origin) chips.push({ key: `o-${v}`, label: v, remove: without('origin', v) })
  for (const v of filters.treatment) chips.push({ key: `t-${v}`, label: v, remove: without('treatment', v) })
  if (filters.minPrice || filters.maxPrice) {
    const f = (v) => (v ? formatMoney(fromPKR(Number(v)), currency) : '…')
    chips.push({ key: 'price', label: `${f(filters.minPrice)} – ${f(filters.maxPrice)}`, remove: () => update({ minPrice: '', maxPrice: '' }) })
  }
  if (filters.minCarat || filters.maxCarat) {
    chips.push({ key: 'carat', label: `${filters.minCarat || '…'} – ${filters.maxCarat || '…'} ct`, remove: () => update({ minCarat: '', maxCarat: '' }) })
  }
  if (filters.inStock) chips.push({ key: 'stock', label: 'Available now', remove: () => update({ inStock: '' }) })
  return chips
}

function FilterDrawer({ open, onClose, total, children }) {
  const ref = useDialog(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-[fadein_.2s_ease] bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm animate-[slidein-left_.25s_ease] flex-col bg-ivory-50">
        <div className="flex h-16 items-center justify-between border-b border-ivory-200 px-5">
          <h2 className="text-2xl">Filters</h2>
          <button type="button" onClick={onClose} className="p-2 text-emerald-900" aria-label="Close filters" data-autofocus>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">{children}</div>
        <div className="border-t border-ivory-200 p-4">
          <button type="button" onClick={onClose} className="btn-primary w-full">
            {total === undefined ? 'Show stones' : `Show ${total} ${total === 1 ? 'stone' : 'stones'}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Filters({ filters, facets, update }) {
  const currency = useDisplayCurrency()
  const fromPKR = useCurrency((s) => s.fromPKR)
  const toPKR = useCurrency((s) => s.toPKR)

  const searchId = useId() // two Filters can be mounted (sidebar + mobile drawer)
  const toInput = (pkr) => (pkr ? String(Math.round(fromPKR(Number(pkr)))) : '')
  const [q, setQ] = useState(filters.q)
  const [price, setPrice] = useState({ min: toInput(filters.minPrice), max: toInput(filters.maxPrice) })
  const [carat, setCarat] = useState({ min: filters.minCarat, max: filters.maxCarat })

  // Re-derive price inputs when the currency changes
  const [seenCurrency, setSeenCurrency] = useState(currency)
  if (seenCurrency !== currency) {
    setSeenCurrency(currency)
    setPrice({ min: toInput(filters.minPrice), max: toInput(filters.maxPrice) })
  }

  const toggle = (key, value) => {
    const list = filters[key]
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] })
  }

  const apply = (e) => {
    e.preventDefault()
    const pkr = (v) => (v === '' ? '' : String(toPKR(Number(v))))
    update({ q: q.trim(), minPrice: pkr(price.min), maxPrice: pkr(price.max), minCarat: carat.min, maxCarat: carat.max })
  }

  return (
    <form onSubmit={apply} className="space-y-8 text-sm">
      <div>
        <label htmlFor={searchId} className="eyebrow mb-3 block">Search</label>
        <input id={searchId} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, origin, colour…" className="w-full border border-ivory-200 bg-white px-3 py-2" />
      </div>

      <CheckGroup legend="Gemstone" options={facets?.categories.map((c) => ({ value: c.slug, label: c.name }))} selected={filters.category} onToggle={(v) => toggle('category', v)} />
      <CheckGroup legend="Origin" options={facets?.origins.map((o) => ({ value: o, label: o }))} selected={filters.origin} onToggle={(v) => toggle('origin', v)} />
      <CheckGroup legend="Treatment" options={facets?.treatments.map((t) => ({ value: t, label: t }))} selected={filters.treatment} onToggle={(v) => toggle('treatment', v)} />

      <RangeGroup
        legend={`Price (${currency})`}
        values={price}
        onChange={setPrice}
        step="1"
        hint={facets && `${formatMoney(fromPKR(facets.minPrice), currency)} – ${formatMoney(fromPKR(facets.maxPrice), currency)}`}
      />
      <RangeGroup legend="Carat weight" values={carat} onChange={setCarat} step="0.01" hint={facets && `${facets.minCarat} – ${facets.maxCarat} ct`} />

      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={filters.inStock === 'true'} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} className="h-4 w-4 accent-emerald-900" />
        Available now only
      </label>

      <button type="submit" className="btn-primary w-full">Apply</button>
    </form>
  )
}

function CheckGroup({ legend, options, selected, onToggle }) {
  if (!options?.length) return null
  return (
    <fieldset>
      <legend className="eyebrow mb-3">{legend}</legend>
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o.value}>
            <label className="flex cursor-pointer items-center gap-2 hover:text-emerald-900">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} className="h-4 w-4 accent-emerald-900" />
              {o.label}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

function RangeGroup({ legend, values, onChange, step, hint }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3">{legend}</legend>
      <div className="flex items-center gap-2">
        <input type="number" min="0" step={step} inputMode="decimal" aria-label={`${legend} minimum`} placeholder="Min" value={values.min} onChange={(e) => onChange({ ...values, min: e.target.value })} className="w-full border border-ivory-200 bg-white px-3 py-2" />
        <span className="text-muted" aria-hidden="true">–</span>
        <input type="number" min="0" step={step} inputMode="decimal" aria-label={`${legend} maximum`} placeholder="Max" value={values.max} onChange={(e) => onChange({ ...values, max: e.target.value })} className="w-full border border-ivory-200 bg-white px-3 py-2" />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">Range: {hint}</p>}
    </fieldset>
  )
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-4 text-sm">
      <button type="button" className="btn-outline px-4! py-2!" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="text-muted">Page {page} of {totalPages}</span>
      <button type="button" className="btn-outline px-4! py-2!" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  )
}
