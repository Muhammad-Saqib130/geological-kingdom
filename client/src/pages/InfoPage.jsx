import { Link, useParams } from 'react-router-dom'
import { TREATMENTS, TREATMENT_NOTES } from '../lib/catalog.js'
import { whatsappLink } from '../lib/whatsapp.js'
import NotFound from './NotFound.jsx'

const contact = whatsappLink('Hello Geological Kingdom, I have a question.')

const PAGES = {
  shipping: {
    eyebrow: 'Help',
    title: 'Shipping & delivery',
    body: (
      <>
        <p>Every stone is packed discreetly and shipped insured with tracking, within Pakistan and internationally.</p>
        <p>Our full shipping rates and delivery times are being finalised for online checkout. Until then, we confirm the cost and timing for your order personally.</p>
      </>
    ),
  },
  returns: {
    eyebrow: 'Help',
    title: 'Returns',
    body: (
      <>
        <p>We want you to be certain about your stone. Our returns policy is being finalised and will be published here before online checkout opens.</p>
        <p>If you have a question about an order, please contact us and we will help.</p>
      </>
    ),
  },
  treatments: {
    eyebrow: 'Learn',
    title: 'Gem treatments, explained',
    body: (
      <>
        <p>Many gemstones are treated to improve their colour or clarity. Treatments are not a problem in themselves, but you deserve to know about them, so every stone we sell states its treatment.</p>
        <dl className="mt-8 divide-y divide-ivory-200 border-y border-ivory-200">
          {TREATMENTS.map((t) => (
            <div key={t} className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
              <dt className="font-serif text-xl text-emerald-900">{t}</dt>
              <dd className="text-muted">{TREATMENT_NOTES[t]}.</dd>
            </div>
          ))}
        </dl>
      </>
    ),
  },
}

export default function InfoPage() {
  const page = PAGES[useParams().slug]
  if (!page) return <NotFound />

  return (
    <article className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <title>{`${page.title} · Geological Kingdom`}</title>
      <p className="eyebrow">{page.eyebrow}</p>
      <h1 className="mt-3 text-5xl">{page.title}</h1>
      <div className="mt-8 space-y-4 leading-relaxed text-ink [&_p]:text-muted">{page.body}</div>
      <div className="mt-12 flex flex-wrap gap-3">
        {contact && <a href={contact} target="_blank" rel="noopener noreferrer" className="btn-primary">Ask us on WhatsApp</a>}
        <Link to="/shop" className="btn-outline">Browse the collection</Link>
      </div>
    </article>
  )
}
