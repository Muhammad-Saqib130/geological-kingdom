import { Link } from 'react-router-dom'
import GemVisual from '../GemVisual.jsx'
import { ArrowRight } from '../icons.jsx'
import SectionHeading from './SectionHeading.jsx'

// Darkens a hex colour (amount 0..1) for tile gradients.
function shade(hex, amount) {
  const n = parseInt((hex ?? '#1f7a4d').slice(1), 16)
  const f = (c) => Math.round(c * (1 - amount))
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`
}

function Tile({ category, large = false }) {
  return (
    <Link
      to={`/shop?category=${category.slug}`}
      className={`group relative isolate flex overflow-hidden ${large ? 'col-span-2 min-h-[300px] sm:col-span-1 sm:row-span-2 sm:min-h-[520px]' : 'min-h-[180px] sm:min-h-[240px]'}`}
      style={{ background: `linear-gradient(150deg, ${shade(category.colorHex, 0.35)} 0%, ${shade(category.colorHex, 0.72)} 100%)` }}
    >
      {category.image?.url ? (
        <img src={category.image.url} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
      ) : (
        <GemVisual
          bare
          color={category.colorHex}
          className={`absolute -z-10 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-3 ${large ? '-right-10 top-6 h-80 w-80 sm:h-[26rem] sm:w-[26rem]' : '-right-6 top-2 h-32 w-32 sm:h-44 sm:w-44'}`}
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/45 via-black/5 to-transparent" aria-hidden="true" />
      <div className="mt-auto p-4 sm:p-8">
        <h3 className={`text-ivory-50! ${large ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'}`}>{category.name}</h3>
        {large && category.description && <p className="mt-2 max-w-xs text-sm text-ivory-50/85">{category.description}</p>}
        <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
          Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  )
}

export default function CategoryGrid({ categories }) {
  const tiles = (categories ?? []).filter((c) => c.showOnHome).slice(0, 5)
  if (tiles.length < 3) return null
  const [first, ...rest] = tiles

  return (
    <section aria-labelledby="collections" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading id="collections" eyebrow="Collections" title="Treasures of the north" action={{ to: '/shop', label: 'All gemstones' }} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Tile category={first} large />
        {rest.map((c) => <Tile key={c.id} category={c} />)}
      </div>
    </section>
  )
}
