import { Link } from 'react-router-dom'
import { useCart } from '../../store/cartStore.js'
import Price from '../Price.jsx'
import ProductImage from './ProductImage.jsx'

// Centred card with a pill button overlapping the bottom edge of the photo.
export default function ProductCard({ product }) {
  const add = useCart((s) => s.add)
  const inCart = useCart((s) => s.items.some((i) => i.productId === product.id))
  const second = product.images?.[1]
  const soldOut = product.stock === 0
  const unique = product.stock <= 1

  return (
    <article className="group relative text-center">
      <div className="relative">
        <Link to={`/gems/${product.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-square overflow-hidden bg-ivory-100">
          <ProductImage product={product} className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
          {second && (
            <ProductImage product={product} image={second} className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
          {soldOut && <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-ivory-50">Sold</span>}
          {!soldOut && product.certificate?.lab && (
            <span className="absolute left-3 top-3 rounded-full bg-ivory-50/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-900">{product.certificate.lab}</span>
          )}
        </Link>

        <div className="absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center">
          {soldOut ? (
            <Link to={`/gems/${product.slug}`} className="btn-sm bg-ivory-50 text-muted shadow ring-1 ring-ivory-200 hover:text-emerald-900">View stone</Link>
          ) : inCart && unique ? (
            <button type="button" onClick={() => useCart.getState().openDrawer()} className="btn-sm bg-gold-500 text-emerald-950 shadow hover:bg-gold-400">In your cart</button>
          ) : (
            <button type="button" onClick={() => add(product)} className="btn-sm btn-primary shadow" aria-label={`Add ${product.name} to cart`}>
              Add to cart
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-1 px-1">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold-600">{[product.category?.name, `${product.carat} ct`].filter(Boolean).join(' · ')}</p>
        <h3 className="text-xl leading-snug">
          <Link to={`/gems/${product.slug}`} className="hover:text-gold-600 focus-visible:text-gold-600">{product.name}</Link>
        </h3>
        {product.origin && <p className="text-xs text-muted">{product.origin}</p>}
        <Price pkr={product.pricePKR} className="block pt-1 text-sm font-semibold tracking-wide text-emerald-900" />
      </div>
    </article>
  )
}
