import { StarIcon } from '../icons.jsx'
import SectionHeading from './SectionHeading.jsx'

export default function Testimonials({ testimonials }) {
  if (!testimonials?.length) return null
  return (
    <section aria-labelledby="testimonials" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading id="testimonials" eyebrow="Kind words" title="From our clients" align="center" />
      <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
        {testimonials.slice(0, 3).map((t) => (
          <li key={t.id} className="w-[85%] shrink-0 snap-center md:w-auto">
            <figure className="relative flex h-full flex-col border border-ivory-200 bg-white p-8">
              {t.isSample && (
                <span className="absolute right-4 top-4 bg-gold-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gold-600" title="Placeholder for development; replace with a real review">
                  Sample
                </span>
              )}
              <div className="flex gap-0.5 text-gold-500" role="img" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => <StarIcon key={i} filled={i < t.rating} className="h-4 w-4" />)}
              </div>
              <blockquote className="mt-5 flex-1 font-serif text-xl leading-relaxed text-emerald-900">
                <p>“{t.quote}”</p>
              </blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-medium text-ink">{t.name}</span>
                {t.location && <span className="text-muted"> · {t.location}</span>}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  )
}
