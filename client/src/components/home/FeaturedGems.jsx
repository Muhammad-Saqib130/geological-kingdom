import { useState } from 'react'
import ProductGrid, { ProductGridSkeleton } from '../product/ProductGrid.jsx'
import SectionHeading from './SectionHeading.jsx'

// Featured stones with a "New arrivals" tab, from the /api/home payload.
export default function FeaturedGems({ featured, newArrivals, loading }) {
  const tabs = [
    { key: 'featured', label: 'Featured', items: featured },
    { key: 'new', label: 'New arrivals', items: newArrivals },
  ].filter((t) => loading || t.items?.length)
  const [tab, setTab] = useState('featured')
  const current = tabs.find((t) => t.key === tab) ?? tabs[0]

  if (!loading && !tabs.length) return null

  return (
    <section aria-labelledby="featured" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading id="featured" eyebrow="The collection" title="Featured gemstones" action={{ to: '/shop', label: 'View all' }} />
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Gemstones" className="-mt-4 mb-8 flex gap-6 border-b border-ivory-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={current.key === t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 pb-3 text-[13px] uppercase tracking-[0.16em] ${current.key === t.key ? 'border-gold-500 text-emerald-900' : 'border-transparent text-muted hover:text-emerald-900'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {loading ? <ProductGridSkeleton count={4} /> : <ProductGrid products={current.items.slice(0, 8)} />}
    </section>
  )
}
