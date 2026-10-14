import { Link } from 'react-router-dom'
import GemGrid, { GemGridSkeleton } from '../components/GemGrid.jsx'
import GemVisual from '../components/GemVisual.jsx'
import { useApi } from '../hooks/useApi.js'

const promises = [
  { title: 'Natural & disclosed', body: 'Every stone is listed with its origin and any treatment, plainly stated.' },
  { title: 'From the source', body: 'Hand-selected in Namak Mandi, close to the mines of Swat, Hunza and Kohistan.' },
  { title: 'Shipped worldwide', body: 'Insured delivery across Pakistan and internationally, priced in PKR or USD.' },
]

export default function Home() {
  const { data, loading, error } = useApi('/products?featured=true&limit=4')

  return (
    <>
      {/* Hero */}
      <section className="bg-emerald-900 text-ivory-50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <p className="eyebrow text-gold-400!">Namak Mandi · Peshawar</p>
            <h1 className="mt-5 text-5xl leading-[1.05] text-ivory-50! sm:text-6xl lg:text-7xl">
              Stones shaped by <em className="text-gold-400">mountains</em>, chosen by hand.
            </h1>
            <p className="mt-6 max-w-md text-ivory-200/85">
              Natural loose gemstones from the valleys of the north, emeralds, rubies, aquamarines and more,
              selected by people who have traded them for generations.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/shop" className="btn bg-gold-500 text-emerald-950 hover:bg-gold-400">Explore the collection</Link>
              <Link to="/investigation" className="btn border border-ivory-50/40 text-ivory-50 hover:bg-ivory-50/10">Verify a gem</Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-6 rounded-full border border-gold-500/30" aria-hidden="true" />
            <GemVisual color="#1f7a4d" className="h-full w-full rounded-full" />
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The collection</p>
            <h2 className="mt-2 text-4xl sm:text-5xl">Featured stones</h2>
          </div>
          <Link to="/shop" className="text-sm uppercase tracking-[0.15em] text-emerald-900 underline-offset-4 hover:underline">View all</Link>
        </div>
        {loading && <GemGridSkeleton count={4} />}
        {error && <p className="text-muted">The collection is unavailable right now. Please try again shortly.</p>}
        {data && <GemGrid gems={data.items} />}
      </section>

      {/* Promises */}
      <section className="border-y border-ivory-200 bg-ivory-100">
        <ul className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
          {promises.map((p) => (
            <li key={p.title} className="text-center">
              <span className="mx-auto mb-4 block h-px w-10 bg-gold-500" aria-hidden="true" />
              <h3 className="text-2xl">{p.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Gem Investigation teaser */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-8 border border-gold-500/40 p-8 sm:p-12 md:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow">Gem Investigation · $10</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">Bought a stone elsewhere? Let us examine it.</h2>
            <p className="mt-3 max-w-xl text-muted">
              Send us the details of your gem and our team will check its authenticity and tell you what you really have.
            </p>
          </div>
          <Link to="/investigation" className="btn-primary">Request an investigation</Link>
        </div>
      </section>
    </>
  )
}
