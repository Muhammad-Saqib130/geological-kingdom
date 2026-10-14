import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi.js'
import { toQuery } from '../../lib/api.js'
import GemVisual from '../GemVisual.jsx'
import { ArrowRight } from '../icons.jsx'
import Price from '../Price.jsx'
import ProductImage from '../product/ProductImage.jsx'
import SectionHeading from './SectionHeading.jsx'

// Outline gem drawn in the category's colour (the tab icon)
function GemOutline({ color, active }) {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 9h20l8 10-18 21L6 19z" stroke={active ? color : '#5f665f'} fill={active ? `${color}22` : 'none'} />
      <path d="M6 19h36M19 9l-3 10 8 21 8-21-3-10" stroke={active ? color : '#5f665f'} opacity=".7" />
    </svg>
  )
}

// Icon tabs, one per gemstone family, controlling a 2x2 grid of that family's stones.
export default function CategoryTabs({ categories }) {
  const [selected, setSelected] = useState(null)
  const list = categories ?? []
  const active = list.find((c) => c.slug === selected) ?? list[0]
  const { data, loading } = useApi(active ? `/products${toQuery({ category: active.slug, limit: 4 })}` : null)

  if (!list.length) return null
  const items = data?.items ?? []

  return (
    <section aria-labelledby="gemstones" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading id="gemstones" title="Gemstones" subtitle={`${list.length} families of natural colour`} className="mb-10" />

      <div role="tablist" aria-label="Gemstone families" className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-4 sm:px-0">
        {list.map((c) => {
          const on = c.id === active.id
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              id={`tab-${c.slug}`}
              aria-selected={on}
              aria-controls="gem-panel"
              onClick={() => setSelected(c.slug)}
              className={`flex w-20 shrink-0 snap-start flex-col items-center gap-2 border-b-2 pb-3 pt-1 transition-colors sm:w-24 ${on ? 'border-gold-500' : 'border-transparent hover:border-ivory-200'}`}
            >
              <GemOutline color={c.colorHex ?? '#c9a24b'} active={on} />
              <span className={`text-[10px] uppercase tracking-[0.18em] ${on ? 'text-emerald-900' : 'text-muted'}`}>{c.name}</span>
            </button>
          )
        })}
      </div>

      <div id="gem-panel" role="tabpanel" aria-labelledby={`tab-${active.slug}`} className="mt-10">
        {loading && !items.length ? (
          <div className="grid gap-6 sm:grid-cols-2" aria-hidden="true">
            {[0, 1].map((i) => <div key={i} className="aspect-[16/10] animate-pulse bg-ivory-200" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-muted">New {active.name.toLowerCase()} stones are on their way. <Link to="/shop" className="text-emerald-900 underline underline-offset-4">Browse all gemstones</Link></p>
        ) : (
          <ul className={`grid gap-x-6 gap-y-10 ${items.length > 1 ? 'sm:grid-cols-2' : 'mx-auto max-w-xl'}`}>
            {items.map((p) => (
              <li key={p.id} className="group">
                <Link to={`/gems/${p.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden" style={{ background: `radial-gradient(circle at 60% 40%, ${p.colorHex ?? '#1f7a4d'}55, #0d1512 75%)` }}>
                  {p.images?.[0] ? (
                    <ProductImage product={p} sizes="(min-width: 640px) 45vw, 100vw" className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <GemVisual bare color={p.colorHex} className="absolute inset-x-0 mx-auto h-full w-auto py-6 transition-transform duration-700 group-hover:scale-110" />
                  )}
                </Link>
                <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl uppercase tracking-[0.12em] sm:text-2xl">
                      <Link to={`/gems/${p.slug}`} className="hover:text-gold-600">{p.name}</Link>
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">{[`${p.carat} ct`, p.origin].filter(Boolean).join(' · ')} · <Price pkr={p.pricePKR} /></p>
                  </div>
                  <Link to={`/gems/${p.slug}`} className="btn-sm btn-primary shrink-0">Shop now</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-10 text-center">
          <Link to={`/shop?category=${active.slug}`} className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gold-600 hover:text-emerald-900">
            View all {active.name} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </p>
      </div>
    </section>
  )
}
