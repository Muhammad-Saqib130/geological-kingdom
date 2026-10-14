import { Link } from 'react-router-dom'
import { imageUrl } from '../../lib/images.js'
import GemVisual from '../GemVisual.jsx'

function CertificateArt() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <svg viewBox="0 0 320 240" className="relative h-auto w-full -rotate-3 drop-shadow-[0_25px_40px_rgba(0,0,0,0.55)]">
        <rect x="28" y="18" width="264" height="204" fill="#fbf9f4" stroke="#c9a24b" strokeWidth="1.5" />
        <rect x="40" y="30" width="240" height="180" fill="none" stroke="#c9a24b" strokeWidth=".6" />
        <text x="160" y="62" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="18" fill="#0b3d2e" letterSpacing="2">CERTIFICATE</text>
        <text x="160" y="80" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fill="#a9843a" letterSpacing="3">OF AUTHENTICITY</text>
        {[104, 118, 132, 146].map((y, i) => (
          <g key={y}>
            <line x1="64" y1={y} x2="130" y2={y} stroke="#5f665f" strokeOpacity=".35" />
            <line x1="140" y1={y} x2={i % 2 ? 220 : 196} y2={y} stroke="#0b3d2e" strokeOpacity=".55" />
          </g>
        ))}
        <circle cx="232" cy="172" r="22" fill="#c9a24b" />
        <path d="m224 172 6 6 10-12" fill="none" stroke="#fbf9f4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <GemVisual bare color="#1f7a4d" className="absolute -bottom-8 -left-6 h-32 w-32 drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]" />
    </div>
  )
}

// Dark promotional banner about authenticity and the Gem Investigation service.
export default function VerifiedBanner({ image }) {
  return (
    <section aria-labelledby="verified" className="bg-sparkle text-ivory-50">
      <div className="mx-auto grid max-w-7xl items-center lg:grid-cols-2">
        <div className="px-4 py-16 text-center sm:px-6 lg:py-24">
          <h2 id="verified" className="font-serif text-6xl italic text-ivory-50! sm:text-7xl">Verified</h2>
          <p className="mt-3 text-xs uppercase tracking-[0.4em] text-gold-300">By experts · for you</p>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ivory-200/80">
            Every stone is examined before it is listed: origin recorded, treatments disclosed, certificates from independent laboratories on selected stones. Bought a gem elsewhere? We will examine it for $10.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/investigation" className="btn-light">Verify a gem</Link>
            <Link to="/info/treatments" className="btn border border-ivory-50/30 text-ivory-50 hover:bg-ivory-50/10">How we grade</Link>
          </div>
        </div>
        <div className={`relative ${image ? 'h-72 sm:h-96 lg:h-full lg:min-h-[460px]' : 'px-10 pb-20 lg:py-16'}`}>
          {image ? (
            <img src={imageUrl(image.url, { width: 1200 })} alt={image.alt || ''} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <CertificateArt />
          )}
        </div>
      </div>
    </section>
  )
}
