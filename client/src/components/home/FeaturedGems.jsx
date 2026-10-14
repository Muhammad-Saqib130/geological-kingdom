import ProductGrid, { ProductGridSkeleton } from '../product/ProductGrid.jsx'
import SectionHeading from './SectionHeading.jsx'

// Featured stones (falls back to new arrivals when nothing is featured).
export default function FeaturedGems({ featured, newArrivals, loading }) {
  const items = featured?.length ? featured : newArrivals
  if (!loading && !items?.length) return null

  return (
    <section aria-labelledby="featured" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading id="featured" title={featured?.length || loading ? 'Featured gemstones' : 'New arrivals'} subtitle="A selection of our finest stones" action={{ to: '/shop', label: 'View all' }} />
      {loading ? <ProductGridSkeleton count={4} /> : <ProductGrid products={items.slice(0, 8)} />}
    </section>
  )
}
