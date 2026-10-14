import { Link } from 'react-router-dom'
import { imageUrl } from '../../lib/images.js'
import GemVisual from '../GemVisual.jsx'

// Full-width dark hero. With an uploaded photo (Admin > Homepage) it becomes the background;
// otherwise illustrated stones glow on a speckled slate backdrop.
export default function Hero({ image }) {
  return (
    <section className="relative isolate overflow-hidden bg-sparkle text-ivory-50" aria-labelledby="hero-title">
      {image && (
        <>
          <img src={imageUrl(image.url, { width: 2000 })} alt={image.alt || ''} className="absolute inset-0 -z-10 h-full w-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/45 to-black/10" aria-hidden="true" />
        </>
      )}

      <div className="mx-auto grid min-h-[480px] max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:min-h-[560px] lg:grid-cols-[0.8fr_1.3fr_1fr] lg:py-0">
        {/* left: small stones (fallback art only) */}
        <div className="relative hidden h-full lg:block" aria-hidden="true">
          {!image && (
            <>
              <GemVisual bare color="#b3123a" className="absolute left-0 top-[18%] h-28 w-28 opacity-90 drop-shadow-[0_10px_30px_rgba(179,18,58,0.45)]" />
              <GemVisual bare color="#7fc4dc" className="absolute bottom-[16%] left-[38%] h-24 w-24 opacity-90 drop-shadow-[0_10px_30px_rgba(127,196,220,0.4)]" />
              <GemVisual bare color="#d99a3a" className="absolute left-[8%] top-[56%] h-16 w-16 opacity-80" />
            </>
          )}
        </div>

        <div className={`animate-[rise_.8s_ease_both] ${image ? 'lg:col-span-2' : 'text-center lg:text-left'}`}>
          <p className="text-[11px] uppercase tracking-[0.4em] text-gold-300">Straight from the mountains</p>
          <h1 id="hero-title" className="mt-4 font-serif text-5xl uppercase leading-[1.02] tracking-[0.06em] text-ivory-50! sm:text-6xl lg:text-7xl">
            Natural <span className="block italic normal-case tracking-normal text-gold-400">gemstones</span>
          </h1>
          <p className={`mt-5 max-w-lg text-xs uppercase leading-relaxed tracking-[0.22em] text-ivory-200/85 sm:text-sm ${image ? '' : 'mx-auto lg:mx-0'}`}>
            Mined in the north<span className="text-gold-400"> · </span><span className="whitespace-nowrap">chosen in Namak Mandi</span>
          </p>
          <div className={`mt-9 flex flex-wrap gap-3 ${image ? '' : 'justify-center lg:justify-start'}`}>
            <Link to="/shop" className="btn-light">Shop now</Link>
            <Link to="/investigation" className="btn border border-ivory-50/40 text-ivory-50 hover:bg-ivory-50/10">Verify a gem</Link>
          </div>
        </div>

        {/* right: hero stone (fallback art only) */}
        {!image && (
          <div className="relative mx-auto aspect-square w-64 sm:w-80 lg:w-full" aria-hidden="true">
            <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(46,160,110,0.35),transparent_65%)] blur-2xl" />
            <div className="absolute inset-[4%] rounded-full border border-gold-500/20" />
            <GemVisual bare color="#1f7a4d" className="relative h-full w-full drop-shadow-[0_25px_45px_rgba(0,0,0,0.6)]" />
          </div>
        )}
      </div>
    </section>
  )
}
