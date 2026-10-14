import { Link } from 'react-router-dom'
import GemVisual from '../GemVisual.jsx'

// Round, colour-tinted gem icons. Scrolls sideways on small screens.
export default function CategoryIcons({ categories }) {
  if (!categories?.length) return null
  return (
    <section aria-labelledby="by-gem" className="border-b border-ivory-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 id="by-gem" className="eyebrow text-center">Shop by gemstone</h2>
        <ul className="scrollbar-none -mx-4 mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-8 sm:overflow-visible sm:px-0">
          {categories.map((c) => (
            <li key={c.id} className="shrink-0 snap-start">
              <Link to={`/shop?category=${c.slug}`} className="group flex w-20 flex-col items-center gap-3 sm:w-24">
                <span
                  className="flex h-20 w-20 items-center justify-center rounded-full border border-ivory-200 bg-white p-3 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-gold-500 group-hover:shadow-lg sm:h-24 sm:w-24"
                  style={{ background: `radial-gradient(circle at 50% 35%, #fff 0%, ${c.colorHex ?? '#c9a24b'}22 100%)` }}
                >
                  {c.image?.url ? (
                    <img src={c.image.url} alt="" className="h-full w-full rounded-full object-cover" loading="lazy" />
                  ) : (
                    <GemVisual bare color={c.colorHex ?? '#c9a24b'} className="h-full w-full" />
                  )}
                </span>
                <span className="text-center text-xs uppercase tracking-[0.14em] text-emerald-900 group-hover:text-gold-600">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
