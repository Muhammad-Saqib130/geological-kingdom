import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import GemGrid, { GemGridSkeleton } from '../components/GemGrid.jsx'
import { useApi } from '../hooks/useApi.js'
import { toQuery } from '../lib/api.js'
import { useCurrency, useDisplayCurrency } from '../store/currencyStore.js'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'carat-desc', label: 'Carat: largest first' },
]

const FILTER_KEYS = ['q', 'type', 'origin', 'minPrice', 'maxPrice', 'minCarat', 'maxCarat']

const csvList = (v) => (v ? v.split(',') : [])

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const query = Object.fromEntries(params)
  const { data, loading, error } = useApi(`/gems${toQuery({ limit: 12, ...query })}`)
  const facets = useApi('/gems/filters').data

  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) next.delete(k)
      else next.set(k, Array.isArray(v) ? v.join(',') : v)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const activeCount = FILTER_KEYS.filter((k) => params.has(k)).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-10 text-center">
        <p className="eyebrow">Loose gemstones</p>
        <h1 className="mt-2 text-5xl">The Collection</h1>
      </header>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-y border-ivory-200 py-3">
        <button
          type="button"
          className="text-sm uppercase tracking-[0.15em] text-emerald-900 lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls="shop-filters"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          Filters{activeCount ? ` (${activeCount})` : ''}
        </button>
        <p className="hidden text-sm text-muted lg:block" aria-live="polite">
          {data ? `${data.total} ${data.total === 1 ? 'stone' : 'stones'}` : ' '}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort</span>
          <select
            value={query.sort ?? 'newest'}
            onChange={(e) => update({ sort: e.target.value === 'newest' ? undefined : e.target.value })}
            className="border border-ivory-200 bg-transparent px-2 py-1.5"
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside id="shop-filters" className={`${filtersOpen ? 'block' : 'hidden'} lg:block`} aria-label="Filters">
          <Filters key={FILTER_KEYS.map((k) => params.get(k) ?? '').join('|')} params={params} facets={facets} update={update} onClear={() => setParams({})} />
        </aside>

        <section aria-label="Results">
          {loading && !data && <GemGridSkeleton />}
          {error && <p className="text-muted">We couldn't load the collection. Please try again.</p>}
          {data && data.items.length === 0 && (
            <div className="py-20 text-center">
              <h2 className="text-3xl">No stones match these filters</h2>
              <button type="button" className="btn-outline mt-6" onClick={() => setParams({})}>Clear filters</button>
            </div>
          )}
          {data && data.items.length > 0 && (
            <div className={loading ? 'opacity-60 transition-opacity' : ''}>
              <GemGrid gems={data.items} />
              <Pagination page={data.page} totalPages={data.totalPages} onPage={(page) => update({ page: page === 1 ? undefined : page })} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Filters({ params, facets, update, onClear }) {
  const currency = useDisplayCurrency()
  const fromPKR = useCurrency((s) => s.fromPKR)
  const toPKR = useCurrency((s) => s.toPKR)

  const [q, setQ] = useState(params.get('q') ?? '')
  const priceInput = (key) => (params.get(key) ? String(Math.round(fromPKR(Number(params.get(key))))) : '')
  const [price, setPrice] = useState({ minPrice: priceInput('minPrice'), maxPrice: priceInput('maxPrice') })
  const [carat, setCarat] = useState({ minCarat: params.get('minCarat') ?? '', maxCarat: params.get('maxCarat') ?? '' })

  // Re-derive the price inputs when the currency changes
  const [seenCurrency, setSeenCurrency] = useState(currency)
  if (seenCurrency !== currency) {
    setSeenCurrency(currency)
    setPrice({ minPrice: priceInput('minPrice'), maxPrice: priceInput('maxPrice') })
  }

  const toggle = (key, value) => {
    const list = csvList(params.get(key))
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] })
  }

  const applyRanges = (e) => {
    e.preventDefault()
    const pkr = (v) => (v === '' ? undefined : toPKR(Number(v)))
    update({ q: q.trim() || undefined, minPrice: pkr(price.minPrice), maxPrice: pkr(price.maxPrice), ...carat })
  }

  return (
    <form onSubmit={applyRanges} className="space-y-8 text-sm">
      <div>
        <label htmlFor="search" className="eyebrow mb-3 block">Search</label>
        <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Emerald, Swat…" className="w-full border border-ivory-200 bg-white px-3 py-2" />
      </div>

      <CheckGroup legend="Gemstone" options={facets?.types} selected={csvList(params.get('type'))} onToggle={(v) => toggle('type', v)} />
      <CheckGroup legend="Origin" options={facets?.origins} selected={csvList(params.get('origin'))} onToggle={(v) => toggle('origin', v)} />

      <RangeGroup legend={`Price (${currency})`} values={[price.minPrice, price.maxPrice]} onChange={([minPrice, maxPrice]) => setPrice({ minPrice, maxPrice })} step="1" />
      <RangeGroup legend="Carat" values={[carat.minCarat, carat.maxCarat]} onChange={([minCarat, maxCarat]) => setCarat({ minCarat, maxCarat })} step="0.01" />

      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1 px-4!">Apply</button>
        <button type="button" className="btn-outline px-4!" onClick={onClear}>Clear</button>
      </div>
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
          <li key={o}>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggle(o)} className="h-4 w-4 accent-emerald-900" />
              {o}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

function RangeGroup({ legend, values, onChange, step }) {
  const [min, max] = values
  return (
    <fieldset>
      <legend className="eyebrow mb-3">{legend}</legend>
      <div className="flex items-center gap-2">
        <input type="number" min="0" step={step} inputMode="decimal" aria-label={`${legend} minimum`} placeholder="Min" value={min} onChange={(e) => onChange([e.target.value, max])} className="w-full border border-ivory-200 bg-white px-3 py-2" />
        <span className="text-muted" aria-hidden="true">–</span>
        <input type="number" min="0" step={step} inputMode="decimal" aria-label={`${legend} maximum`} placeholder="Max" value={max} onChange={(e) => onChange([min, e.target.value])} className="w-full border border-ivory-200 bg-white px-3 py-2" />
      </div>
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
