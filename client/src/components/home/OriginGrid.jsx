import { Link } from 'react-router-dom'
import { toQuery } from '../../lib/api.js'
import { imageUrl } from '../../lib/images.js'
import GemVisual from '../GemVisual.jsx'
import SectionHeading from './SectionHeading.jsx'

// Tall cards, one per origin, label at the top (from /api/home `origins`).
export default function OriginGrid({ origins }) {
  if (!origins || origins.length < 4) return null
  const shown = origins.slice(0, origins.length >= 8 ? 8 : 4)

  return (
    <section aria-labelledby="origins" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading id="origins" title="Shop by origin" subtitle="Stones with a story" />
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {shown.map((o) => {
          const [place, country] = o.name.split(',').map((s) => s.trim())
          return (
            <li key={o.name}>
              <Link
                to={`/shop${toQuery({ origin: o.name })}`}
                className="group relative isolate flex aspect-[3/4] flex-col items-center overflow-hidden text-center"
                style={{ background: `linear-gradient(180deg, #0d1512 0%, ${o.colorHex ?? '#1f7a4d'} 140%)` }}
              >
                {o.image ? (
                  <img src={imageUrl(o.image.url, { width: 600 })} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <GemVisual bare color={o.colorHex ?? '#1f7a4d'} className="absolute inset-x-0 bottom-[14%] -z-10 mx-auto h-1/2 w-auto transition-transform duration-700 group-hover:-translate-y-2 group-hover:scale-105" />
                )}
                <div className="absolute inset-x-0 top-0 -z-10 h-1/3 bg-gradient-to-b from-black/60 to-transparent" aria-hidden="true" />
                <span className="mt-6 px-3 font-serif text-2xl uppercase tracking-[0.14em] text-ivory-50 sm:text-[1.7rem]">{place}</span>
                {country && <span className="mt-1 text-[10px] uppercase tracking-[0.3em] text-gold-300">{country}</span>}
                <span className="mt-auto mb-5 rounded-full border border-ivory-50/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ivory-50/90 backdrop-blur-sm transition-colors group-hover:border-gold-300 group-hover:text-gold-300">
                  {o.count} {o.count === 1 ? 'stone' : 'stones'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
