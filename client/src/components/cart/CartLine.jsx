import { Link } from 'react-router-dom'
import { useCart } from '../../store/cartStore.js'
import { MinusIcon, PlusIcon } from '../icons.jsx'
import Price from '../Price.jsx'
import ProductImage from '../product/ProductImage.jsx'

const REASONS = { sold_out: 'Sold out', no_longer_listed: 'No longer available' }

export default function CartLine({ item, compact = false, onNavigate }) {
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const product = { name: item.name, carat: item.carat, colorHex: item.colorHex, images: item.image ? [item.image] : [] }

  return (
    <li className={`flex gap-4 ${compact ? 'py-4' : 'py-6'}`}>
      <Link to={`/gems/${item.slug}`} onClick={onNavigate} className={`shrink-0 overflow-hidden bg-ivory-100 ${compact ? 'h-20 w-20' : 'h-24 w-24 sm:h-28 sm:w-28'}`}>
        <ProductImage product={product} width={240} sizes="112px" className={`h-full w-full ${item.unavailable ? 'opacity-40 grayscale' : ''}`} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-[10px]!">{[item.category, item.carat && `${item.carat} ct`].filter(Boolean).join(' · ')}</p>
            <Link to={`/gems/${item.slug}`} onClick={onNavigate} className="block truncate font-serif text-lg text-emerald-900 hover:text-gold-600">{item.name}</Link>
          </div>
          <Price pkr={item.pricePKR * item.qty} className={`shrink-0 text-sm font-medium ${item.unavailable ? 'text-muted line-through' : 'text-emerald-900'}`} />
        </div>

        {item.unavailable ? (
          <p className="mt-1 text-sm text-red-700">{REASONS[item.unavailable] ?? 'Unavailable'}</p>
        ) : (
          item.qty > 1 && <p className="mt-0.5 text-xs text-muted"><Price pkr={item.pricePKR} /> each</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          {!item.unavailable && item.maxQty > 1 ? (
            <div className="flex items-center border border-ivory-200" role="group" aria-label={`Quantity of ${item.name}`}>
              <button type="button" className="p-1.5 disabled:opacity-30" onClick={() => setQty(item.productId, item.qty - 1)} disabled={item.qty <= 1} aria-label="Decrease quantity">
                <MinusIcon className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{item.qty}</span>
              <button type="button" className="p-1.5 disabled:opacity-30" onClick={() => setQty(item.productId, item.qty + 1)} disabled={item.qty >= item.maxQty} aria-label="Increase quantity">
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted">{item.unavailable ? '' : 'One of a kind'}</span>
          )}
          <button type="button" onClick={() => remove(item.productId)} className="text-xs uppercase tracking-[0.12em] text-muted underline-offset-4 hover:text-red-700 hover:underline">
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}
