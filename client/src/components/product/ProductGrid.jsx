import ProductCard from './ProductCard.jsx'

const layout = 'grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4'

export function ProductGridSkeleton({ count = 8, className = layout }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square bg-ivory-200" />
          <div className="mt-4 h-3 w-1/3 bg-ivory-200" />
          <div className="mt-2 h-5 w-2/3 bg-ivory-200" />
          <div className="mt-2 h-4 w-1/4 bg-ivory-200" />
        </div>
      ))}
    </div>
  )
}

export default function ProductGrid({ products, className = layout }) {
  return (
    <div className={className}>
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
