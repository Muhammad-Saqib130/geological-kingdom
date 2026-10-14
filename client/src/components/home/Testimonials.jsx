import { useState } from 'react'
import { imageUrl } from '../../lib/images.js'
import GemVisual from '../GemVisual.jsx'
import { QuoteIcon, StarIcon } from '../icons.jsx'

// One quote at a time beside a photo, with dots to browse (no auto-rotation).
export default function Testimonials({ testimonials, image }) {
  const [index, setIndex] = useState(0)
  if (!testimonials?.length) return null
  const t = testimonials[index % testimonials.length]

  return (
    <section aria-labelledby="testimonials" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
        <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_30%_30%,#fbf9f4,#f3e3e1_55%,#ebe4d4)]">
          {image ? (
            <img src={imageUrl(image.url, { width: 900 })} alt={image.alt || ''} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" aria-hidden="true">
              <div className="absolute bottom-[18%] left-[12%] right-[12%] h-[32%] rounded-sm bg-gradient-to-b from-[#f7d9de] to-[#eec5cc] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.35)]" />
              <GemVisual bare color="#7fc4dc" className="absolute bottom-[38%] left-[22%] h-[34%] w-auto" />
              <GemVisual bare color="#e0629a" className="absolute bottom-[38%] right-[20%] h-[28%] w-auto" />
            </div>
          )}
        </div>

        <div className="relative text-center">
          <QuoteIcon className="pointer-events-none absolute -bottom-4 left-0 h-20 w-20 text-gold-500/15 sm:-top-10 sm:bottom-auto sm:left-auto sm:right-0" />
          <h2 id="testimonials" className="font-serif text-2xl uppercase tracking-[0.14em] text-emerald-900 sm:text-4xl">Loved by our clients</h2>
          <figure className="mt-8" aria-live="polite">
            <div className="flex justify-center gap-0.5 text-gold-500" role="img" aria-label={`${t.rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, i) => <StarIcon key={i} filled={i < t.rating} className="h-4 w-4" />)}
            </div>
            <blockquote key={t.id} className="mx-auto mt-5 max-w-md animate-[fadein_.4s_ease] font-serif text-xl italic leading-relaxed text-ink sm:text-2xl">
              <p>“{t.quote}”</p>
            </blockquote>
            <figcaption className="mt-6">
              <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-emerald-900">{t.name}</span>
              {t.location && <span className="text-xs text-muted">{t.location}</span>}
              {t.isSample && (
                <span className="ml-2 bg-gold-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gold-600" title="Placeholder for development; replace with a real review">Sample</span>
              )}
            </figcaption>
          </figure>
          {testimonials.length > 1 && (
            <div className="mt-8 flex justify-center gap-2" role="group" aria-label="Choose testimonial">
              {testimonials.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show testimonial ${i + 1} of ${testimonials.length}`}
                  aria-current={i === index % testimonials.length}
                  className={`h-2.5 rounded-full transition-all ${i === index % testimonials.length ? 'w-7 bg-emerald-900' : 'w-2.5 bg-ivory-200 hover:bg-gold-400'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
