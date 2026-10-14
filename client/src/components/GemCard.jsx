import { Link } from 'react-router-dom'
import GemImage from './GemImage.jsx'
import Price from './Price.jsx'

export default function GemCard({ gem }) {
  return (
    <article className="group">
      <Link to={`/gems/${gem.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-ivory-100">
          <GemImage gem={gem} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
          {gem.stock === 0 && (
            <span className="absolute left-3 top-3 bg-ink/80 px-2 py-1 text-[10px] uppercase tracking-widest text-ivory-50">Sold</span>
          )}
        </div>
        <div className="mt-4 space-y-1">
          <p className="eyebrow text-[10px]!">{gem.category?.name} · {gem.carat} ct</p>
          <h3 className="text-xl leading-snug group-hover:text-gold-600">{gem.name}</h3>
          <p className="text-sm text-muted">{gem.origin}</p>
          <Price pkr={gem.pricePKR} className="block pt-1 font-medium text-emerald-900" />
        </div>
      </Link>
    </article>
  )
}
