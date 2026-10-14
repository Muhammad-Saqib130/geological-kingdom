import { Link } from 'react-router-dom'
import GemVisual from '../GemVisual.jsx'

const facts = ['Origin disclosed', 'Treatment disclosed', 'Insured worldwide shipping']

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-emerald-900 text-ivory-50" aria-labelledby="hero-title">
      {/* soft light and fine facet lines */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_75%_40%,rgba(201,162,75,0.18),transparent_70%)]" aria-hidden="true" />
      <svg className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] text-gold-500/10" viewBox="0 0 200 200" aria-hidden="true">
        <path d="M60 30h80l40 50-80 100L20 80z M20 80h160 M60 30l-15 50 55 100 55-100-15-50" fill="none" stroke="currentColor" strokeWidth=".6" />
      </svg>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-24 lg:py-28">
        <div className="animate-[rise_.8s_ease_both]">
          <p className="eyebrow text-gold-400!">Namak Mandi · Peshawar</p>
          <h1 id="hero-title" className="mt-5 text-5xl leading-[1.02] text-ivory-50! sm:text-6xl lg:text-7xl">
            Stones shaped by <em className="text-gold-400">mountains</em>, chosen by hand.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ivory-200/85 sm:text-lg">
            Natural emeralds, rubies, aquamarines and rare finds from the valleys of the north, each one examined and honestly described.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/shop" className="btn bg-gold-500 text-emerald-950 hover:bg-gold-400">Explore the collection</Link>
            <Link to="/investigation" className="btn border border-ivory-50/40 text-ivory-50 hover:bg-ivory-50/10">Verify a gem</Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.16em] text-ivory-200/70">
            {facts.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rotate-45 bg-gold-500" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Composition: three stones in gold orbits */}
        <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden="true">
          <div className="absolute inset-[6%] rounded-full border border-gold-500/25" />
          <div className="absolute inset-[18%] rounded-full border border-gold-500/15" />
          <div className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle_at_50%_40%,#fbf9f4_0%,#f6f2e9_55%,#ebe4d4_100%)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]" />
          <GemVisual bare color="#1f7a4d" className="absolute left-[22%] top-[20%] h-[56%] w-[56%] drop-shadow-xl" />
          <div className="absolute right-[2%] top-[8%] h-[24%] w-[24%] rounded-full bg-ivory-50 p-2 shadow-lg">
            <GemVisual bare color="#b3123a" className="h-full w-full" />
          </div>
          <div className="absolute bottom-[6%] left-[2%] h-[22%] w-[22%] rounded-full bg-ivory-50 p-2 shadow-lg">
            <GemVisual bare color="#7fc4dc" className="h-full w-full" />
          </div>
        </div>
      </div>
    </section>
  )
}
