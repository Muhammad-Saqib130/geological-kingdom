import { Link } from 'react-router-dom'
import { useCart } from '../../store/cartStore.js'
import { BagIcon } from '../icons.jsx'
import Price from '../Price.jsx'
import ProductImage from './ProductImage.jsx'

export default function ProductCard({ product }) {
  const add = useCart((s) => s.add)
  const inCart = useCart((s) => s.items.some((i) => i.productId === product.id))
  const second = product.images?.[1]
  const soldOut = product.stock === 0

  return (
    <article className="group relative">
      <div className="relative aspect-square overflow-hidden bg-ivory-100">
        <Link to={`/gems/${product.slug}`} tabIndex={-1} aria-hidden="true">
          <ProductImage product={product} className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
          {second && (
            <ProductImage product={product} image={second} className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
        </Link>
        {soldOut && <span className="absolute left-3 top-3 bg-ink/85 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-ivory-50">Sold</span>}
        {!soldOut && product.certificate?.lab && (
          <span className="absolute left-3 top-3 bg-ivory-50/90 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-900">{product.certificate.lab} certified</span>
        )}
        {!soldOut && (
          <button
            type="button"
            onClick={() => add(product)}
            disabled={inCart && product.stock <= 1}
            className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-2 bg-emerald-900/95 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-ivory-50 opacity-0 transition-all duration-300 hover:bg-emerald-800 focus-visible:translate-y-0 focus-visible:opacity-100 disabled:bg-emerald-900/70 group-hover:translate-y-0 group-hover:opacity-100 max-lg:hidden"
            aria-label={`Add ${product.name} to cart`}
          >
            <BagIcon className="h-4 w-4" />
            {inCart && product.stock <= 1 ? 'In your cart' : 'Add to cart'}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <p className="eyebrow text-[10px]!">{[product.category?.name, `${product.carat} ct`].filter(Boolean).join(' · ')}</p>
        <h3 className="text-xl leading-snug">
          <Link to={`/gems/${product.slug}`} className="hover:text-gold-600 focus-visible:text-gold-600">
            {product.name}
          </Link>
        </h3>
        {product.origin && <p className="text-sm text-muted">{product.origin}</p>}
        <Price pkr={product.pricePKR} className="block pt-1 font-medium text-emerald-900" />
      </div>
    </article>
  )
}
