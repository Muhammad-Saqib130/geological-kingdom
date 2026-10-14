import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GemGrid from '../components/GemGrid.jsx'
import GemImage from '../components/GemImage.jsx'
import Price from '../components/Price.jsx'
import { useApi } from '../hooks/useApi.js'
import NotFound from './NotFound.jsx'

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER

export default function GemDetail() {
  const { slug } = useParams()
  const { data, loading, error } = useApi(`/gems/${encodeURIComponent(slug)}`)

  if (error?.status === 404) return <NotFound />
  if (error) return <p className="mx-auto max-w-7xl px-4 py-24 text-center text-muted">We couldn't load this stone. Please try again.</p>
  if (loading || !data) return <DetailSkeleton />

  return <GemView key={data.gem.id} gem={data.gem} related={data.related} />
}

function GemView({ gem, related }) {
  const [active, setActive] = useState(0)
  const specs = [
    ['Gemstone', gem.type],
    ['Weight', `${gem.carat} ct`],
    ['Shape / cut', gem.shape],
    ['Dimensions', gem.dimensionsMm && `${gem.dimensionsMm} mm`],
    ['Colour', gem.color],
    ['Clarity', gem.clarity],
    ['Origin', gem.origin],
    ['Treatment', gem.treatment],
    ['Certificate', gem.certificate],
  ].filter(([, v]) => v)

  const enquiry = WHATSAPP
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello, I'm interested in the ${gem.name} (${gem.carat} ct): ${window.location.href}`)}`
    : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-[0.15em] text-muted">
        <Link to="/shop" className="hover:text-emerald-900">Collection</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-emerald-900">{gem.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <div>
          <div className="aspect-square overflow-hidden bg-ivory-100">
            <GemImage gem={{ ...gem, images: gem.images.slice(active) }} className="h-full w-full" eager />
          </div>
          {gem.images.length > 1 && (
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {gem.images.map((img, i) => (
                <li key={img.url}>
                  <button type="button" onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-current={active === i} className={`block aspect-square w-full overflow-hidden border ${active === i ? 'border-gold-500' : 'border-transparent'}`}>
                    <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="eyebrow">{gem.type} · {gem.origin}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">{gem.name}</h1>
          <Price pkr={gem.pricePKR} className="mt-4 block font-serif text-3xl text-emerald-900" />
          {gem.stock === 0 && <p className="mt-2 text-sm uppercase tracking-widest text-muted">Sold</p>}

          {gem.description && <p className="mt-6 leading-relaxed text-muted">{gem.description}</p>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {/* Cart arrives with the checkout milestone */}
            <button type="button" className="btn-primary flex-1" disabled title="Online checkout is coming soon">
              Add to cart, coming soon
            </button>
            {enquiry && (
              <a href={enquiry} target="_blank" rel="noopener noreferrer" className="btn-outline flex-1">Enquire on WhatsApp</a>
            )}
          </div>

          <dl className="mt-10 divide-y divide-ivory-200 border-y border-ivory-200 text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-2 gap-4 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 text-3xl sm:text-4xl">More {gem.type.toLowerCase()}s</h2>
          <GemGrid gems={related} />
        </section>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl animate-pulse gap-10 px-4 py-20 sm:px-6 md:grid-cols-2" aria-busy="true" aria-label="Loading">
      <div className="aspect-square bg-ivory-200" />
      <div className="space-y-4">
        <div className="h-3 w-1/4 bg-ivory-200" />
        <div className="h-10 w-2/3 bg-ivory-200" />
        <div className="h-8 w-1/3 bg-ivory-200" />
      </div>
    </div>
  )
}
