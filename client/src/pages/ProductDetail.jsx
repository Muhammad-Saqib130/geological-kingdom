import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CertificateIcon, CheckIcon, LoupeIcon, ShieldIcon, TruckIcon, WhatsAppIcon } from '../components/icons.jsx'
import Price from '../components/Price.jsx'
import Gallery from '../components/product/Gallery.jsx'
import Lightbox from '../components/product/Lightbox.jsx'
import ProductGrid from '../components/product/ProductGrid.jsx'
import { useApi } from '../hooks/useApi.js'
import { TREATMENT_NOTES } from '../lib/catalog.js'
import { imageUrl } from '../lib/images.js'
import { useWhatsapp } from '../lib/whatsapp.js'
import { useCart } from '../store/cartStore.js'
import { formatMoney, useCurrency, useDisplayCurrency } from '../store/currencyStore.js'
import NotFound from './NotFound.jsx'

export default function ProductDetail() {
  const { slug } = useParams()
  const { data, loading, error } = useApi(`/products/${encodeURIComponent(slug)}`)

  if (error?.status === 404) return <NotFound />
  if (error) return <p className="mx-auto max-w-7xl px-4 py-24 text-center text-muted">We couldn't load this stone. Please try again.</p>
  if (loading || !data) return <DetailSkeleton />

  return <ProductView key={data.product.id} product={data.product} related={data.related} />
}

function ProductView({ product, related }) {
  const currency = useDisplayCurrency()
  const rate = useCurrency((s) => s.pkrPerUsd)
  const soldOut = product.stock === 0
  const cert = product.certificate ?? {}
  const hasCert = Boolean(cert.lab || cert.number)

  const specs = [
    ['Gemstone', product.category?.name],
    ['Carat weight', `${product.carat} ct`],
    ['Cut / shape', product.shape !== 'Other' ? product.shape : null],
    ['Dimensions', product.dimensionsMm && `${product.dimensionsMm} mm`],
    ['Colour', product.color],
    ['Clarity', product.clarity],
    ['Origin', product.origin],
    ['Treatment', product.treatment !== 'Unknown' ? product.treatment : 'Not determined'],
    ['Certificate', hasCert ? [cert.lab, cert.number].filter(Boolean).join(' · ') : null],
    ['Reference', product.sku],
  ].filter(([, v]) => v)

  const url = typeof window !== 'undefined' ? window.location.href : ''
  const whatsappApi = useWhatsapp()
  const inquiry = whatsappApi.link(
    `Hello Geological Kingdom, I'm interested in the ${product.name} (${product.carat} ct${product.sku ? `, ref ${product.sku}` : ''}).\n${url}`,
  )

  // schema.org Product for search engines (prices in PKR, the store currency)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.images.map((i) => i.url),
    category: product.category?.name,
    offers: { '@type': 'Offer', priceCurrency: 'PKR', price: product.pricePKR, availability: `https://schema.org/${soldOut ? 'SoldOut' : 'InStock'}`, url },
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <title>{`${product.name}, ${product.carat} ct · Geological Kingdom`}</title>
      <meta name="description" content={(product.description ?? `${product.name}, ${product.carat} carat ${product.category?.name ?? 'gemstone'} from ${product.origin ?? 'the north'}.`).slice(0, 160)} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-[0.15em] text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link to="/" className="hover:text-emerald-900">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/shop" className="hover:text-emerald-900">Shop</Link></li>
          {product.category && (
            <>
              <li aria-hidden="true">/</li>
              <li><Link to={`/shop?category=${product.category.slug}`} className="hover:text-emerald-900">{product.category.name}</Link></li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-emerald-900">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Gallery product={product} />

        <div>
          <p className="eyebrow">{[product.category?.name, product.origin].filter(Boolean).join(' · ')}</p>
          <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-2 text-sm text-muted">{[`${product.carat} carats`, product.shape !== 'Other' && `${product.shape} cut`, product.color].filter(Boolean).join(' · ')}</p>

          <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Price pkr={product.pricePKR} className="font-serif text-4xl text-emerald-900" />
            {currency === 'USD' ? (
              <span className="text-sm text-muted">{formatMoney(product.pricePKR, 'PKR')}</span>
            ) : (
              rate && <span className="text-sm text-muted">≈ {formatMoney(product.pricePKR / rate, 'USD')}</span>
            )}
          </div>
          {soldOut ? (
            <p className="mt-3 inline-block bg-ink/85 px-3 py-1 text-xs uppercase tracking-[0.2em] text-ivory-50">Sold</p>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-700" aria-hidden="true" />
              {product.stock === 1 ? 'One of a kind · available' : `${product.stock} available`}
            </p>
          )}

          <AddToCart product={product} />

          {inquiry && (
            <a href={inquiry} target="_blank" rel="noopener noreferrer" className="btn mt-3 w-full border border-[#1f8f4e] text-[#17703d] hover:bg-[#1f8f4e] hover:text-white">
              <WhatsAppIcon className="h-5 w-5" /> Ask about this stone on WhatsApp
            </a>
          )}

          <ul className="mt-8 grid gap-3 border-y border-ivory-200 py-6 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-3"><ShieldIcon className="h-5 w-5 text-gold-600" /> Natural stone, honestly described</li>
            <li className="flex items-center gap-3"><TruckIcon className="h-5 w-5 text-gold-600" /> Insured, tracked shipping</li>
            <li className="flex items-center gap-3"><CertificateIcon className="h-5 w-5 text-gold-600" /> {hasCert ? `${cert.lab ?? 'Lab'} certificate included` : 'Certificate on request'}</li>
            <li className="flex items-center gap-3"><LoupeIcon className="h-5 w-5 text-gold-600" /> <Link to="/investigation" className="underline-offset-4 hover:underline">Gem Investigation service</Link></li>
          </ul>

          {product.description && (
            <section className="mt-8" aria-labelledby="about-stone">
              <h2 id="about-stone" className="text-2xl">About this stone</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{product.description}</p>
            </section>
          )}

          <section className="mt-10" aria-labelledby="specs">
            <h2 id="specs" className="text-2xl">Specifications</h2>
            <table className="mt-4 w-full text-sm">
              <tbody className="divide-y divide-ivory-200 border-y border-ivory-200">
                {specs.map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row" className="w-2/5 py-3 pr-4 text-left font-normal text-muted">{k}</th>
                    <td className="py-3 text-ink">
                      {v}
                      {k === 'Treatment' && TREATMENT_NOTES[product.treatment] && (
                        <span className="mt-0.5 block text-xs text-muted">{TREATMENT_NOTES[product.treatment]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <CertificateSection product={product} inquiry={inquiry} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related">
          <p className="eyebrow">You may also like</p>
          <h2 id="related" className="mb-8 mt-2 text-4xl">More {product.category?.name ?? 'stones'}</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  )
}

function AddToCart({ product }) {
  const add = useCart((s) => s.add)
  const inCart = useCart((s) => s.items.find((i) => i.productId === product.id))
  const [qty, setQty] = useState(1)
  const soldOut = product.stock === 0
  const left = product.stock - (inCart?.qty ?? 0)
  const unique = product.stock <= 1

  if (soldOut) {
    return (
      <button type="button" disabled className="btn-primary mt-8 w-full">Sold</button>
    )
  }

  if (unique && inCart) {
    return (
      <button type="button" onClick={() => useCart.getState().openDrawer()} className="btn-primary mt-8 w-full">
        <CheckIcon className="h-5 w-5" strokeWidth={2} /> In your cart · view cart
      </button>
    )
  }

  return (
    <div className="mt-8 flex gap-3">
      {!unique && (
        <label className="flex items-center border border-ivory-200 bg-white">
          <span className="sr-only">Quantity</span>
          <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-full bg-transparent px-3">
            {Array.from({ length: Math.max(1, Math.min(left, 10)) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
      )}
      <button type="button" onClick={() => add(product, qty)} disabled={left <= 0} className="btn-primary flex-1">
        {left <= 0 ? 'All available pieces are in your cart' : 'Add to cart'}
      </button>
    </div>
  )
}

function CertificateSection({ product, inquiry }) {
  const cert = product.certificate ?? {}
  const [open, setOpen] = useState(false)
  const has = cert.lab || cert.number || cert.image

  return (
    <section className="mt-10 border border-gold-500/40 bg-ivory-100 p-6" aria-labelledby="certificate">
      <div className="flex items-start gap-4">
        <CertificateIcon className="mt-1 h-7 w-7 shrink-0 text-gold-600" />
        <div className="min-w-0 flex-1">
          <h2 id="certificate" className="text-2xl">Certificate</h2>
          {has ? (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {cert.lab && (<div><dt className="text-muted">Laboratory</dt><dd className="font-medium text-ink">{cert.lab}</dd></div>)}
                {cert.number && (<div><dt className="text-muted">Report number</dt><dd className="font-medium text-ink">{cert.number}</dd></div>)}
              </dl>
              <p className="mt-3 text-xs text-muted">You can verify the report number directly with the issuing laboratory.</p>
              {cert.image && (
                <button type="button" onClick={() => setOpen(true)} className="mt-4 block w-full max-w-xs overflow-hidden border border-ivory-200 bg-white hover:border-gold-500" aria-label="View certificate scan">
                  <img src={imageUrl(cert.image.url, { width: 600 })} alt={`${cert.lab ?? ''} certificate for ${product.name}`} className="max-h-48 w-full object-contain" loading="lazy" />
                </button>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">
              This stone has not been sent to a laboratory yet. We can arrange an independent certificate on request
              {inquiry ? <>, <a href={inquiry} target="_blank" rel="noopener noreferrer" className="text-emerald-900 underline underline-offset-4">ask us on WhatsApp</a></> : ''}.
            </p>
          )}
        </div>
      </div>
      {open && cert.image && (
        <Lightbox images={[cert.image]} index={0} onIndex={() => {}} onClose={() => setOpen(false)} title={`${product.name} certificate`} />
      )}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl animate-pulse gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2" aria-busy="true" aria-label="Loading">
      <div className="aspect-square bg-ivory-200" />
      <div className="space-y-4">
        <div className="h-3 w-1/4 bg-ivory-200" />
        <div className="h-12 w-2/3 bg-ivory-200" />
        <div className="h-10 w-1/3 bg-ivory-200" />
        <div className="h-12 w-full bg-ivory-200" />
      </div>
    </div>
  )
}
